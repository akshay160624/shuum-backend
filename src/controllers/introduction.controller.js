import { ACCEPTED, DENIED, GENERAL, PENDING, TARGET, timestamp, WITHDRAW } from "../services/helpers/constants.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { BAD_REQUEST, ERROR, NOT_FOUND, SUCCESS } from "../services/helpers/status-code.js";
import { aggregateFromDb, fetchOneFromDb, insertOneToDb, updateOneToDb } from "../services/mongodb.js";
import { introductionListRequestValidate, requestIntroductionRequestValidate, updateIntroductionRequestValidate } from "../services/validations/introduction.validations.js";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { INTRODUCTION_TABLE } from "../services/helpers/db-tables.js";
import { SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
import { fetchCompany, fetchIntroduction } from "../services/db.services.js";
const { isEmpty, pick, isEqual } = lodash;
const INTRODUCTION_STATUS = [PENDING, WITHDRAW, ACCEPTED, DENIED];
const INTRODUCTION_FILTERS = ["INDIVIDUAL", "COMPANY"];

// Request introduction
export const requestIntroduction = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await requestIntroductionRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const {
      introduction_type: introType = "",
      company_id: companyId = null,
      purpose = "",
      introduction_medium: introductionMedium = "",
      elaborate_purpose: elaboratePurpose = "",
      value_offer: valueOffer = "",
    } = req.body;
    const { user } = req; // user from token

    const introductionType = introType.toUpperCase().trim(); // uppercase the introduction type

    if (introductionType.toUpperCase() === TARGET) {
      // check company exist in db
      const companyExist = await fetchCompany({ company_id: companyId });
      if (isEmpty(companyExist)) return responseHelper.error(res, `Company does not exists!`, NOT_FOUND);
    }

    const introDetails = {
      introduction_id: uuidv4(),
      user_id: user.user_id,
      ...(introductionType === TARGET ? { company_id: companyId.trim() } : {}),
      introduction_type: introductionType.trim(),
      purpose: purpose.trim(),
      introduction_medium: introductionMedium.trim(),
      elaborate_purpose: elaboratePurpose.trim(),
      ...(introductionType === GENERAL ? { value_offer: valueOffer.trim() } : {}),
      last_interacted: null,
      status: PENDING,
      ...timestamp,
    };

    // insert into the database
    const introRequestSaved = await insertOneToDb(INTRODUCTION_TABLE, introDetails);
    if (!isEmpty(introRequestSaved)) {
      const responseData = {
        introduction_id: introDetails?.introduction_id,
      };
      return responseHelper.success(res, "Introduction requested successfully", SUCCESS, responseData);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

// Update introduction
export const updateIntroduction = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await updateIntroductionRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { introduction_id: introductionId = "", status = "" } = req.body;

    const updateIntroductionData = {};

    // TODO: Add additional field to update after confirmation
    // check introduction exist in db
    const introductionFilter = { introduction_id: introductionId };
    const introductionExist = await fetchIntroduction(introductionFilter);
    if (isEmpty(introductionExist)) return responseHelper.error(res, `Introduction does not exists!`, NOT_FOUND);

    //  check if user have updated any field then update last interaction field
    if (!isEmpty(updateIntroductionData)) {
      const existingRecordSubset = pick(introductionExist, Object.keys(updateIntroductionData));
      const hasChanges = !isEqual(existingRecordSubset, updateIntroductionData);
      if (hasChanges) {
        updateIntroductionData.last_interacted = new Date();
      }
    }

    //  update status field
    if (!isEmpty(status)) {
      if (!INTRODUCTION_STATUS.includes(status.trim())) {
        return responseHelper.error(res, "Invalid status value", BAD_REQUEST);
      } else {
        updateIntroductionData.status = status;
      }
    }

    //  update updated timestamp
    if (!isEmpty(updateIntroductionData)) {
      updateIntroductionData.updatedAt = new Date();
    }
    const introductionUpdated = await updateOneToDb(INTRODUCTION_TABLE, introductionFilter, updateIntroductionData);
    if (introductionUpdated) {
      return responseHelper.success(res, "Introduction details update successfully", SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

// Introduction list
export const introductionList = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await introductionListRequestValidate(req.query);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    let { status: status = "", introduction_filter: introductionFilter = "" } = req.query;
    const { user } = req;

    status = status ? status.toUpperCase().trim() : "";
    introductionFilter = introductionFilter ? introductionFilter.toUpperCase().trim() : "";

    if (!isEmpty(introductionFilter) && !INTRODUCTION_FILTERS.includes(introductionFilter.trim())) {
      return responseHelper.error(res, "Invalid introduction filter", BAD_REQUEST);
    }

    let filter = {};
    if (user?.user_id) {
      filter = {
        user_id: user.user_id,
      };
    }

    // Introduction status filter
    if (!isEmpty(status) && status !== "ALL") {
      if (!INTRODUCTION_STATUS.includes(status)) {
        return responseHelper.error(res, "Invalid status value", BAD_REQUEST);
      }
      filter = { status: status };
    }

    // Introduction type filter for individual and company
    if (!isEmpty(introductionFilter)) {
      filter = {
        ...filter,
        introduction_type: introductionFilter === "INDIVIDUAL" ? GENERAL : TARGET,
      };
    }

    const introductionListQuery = [
      {
        $match: filter,
      },
      {
        $project: {
          _id: 0,
          introduction_id: 1,
          company_id: 1,
          introduction_type: 1,
          purpose: 1,
          introduction_medium: 1,
          elaborate_purpose: 1,
          value_offer: 1,
          last_interacted: 1,
          status: 1,
        },
      },
    ];

    const introductionListResult = await aggregateFromDb(INTRODUCTION_TABLE, introductionListQuery);
    if (!isEmpty(introductionListResult)) {
      return responseHelper.success(res, "Introduction list fetched successfully", SUCCESS, introductionListResult);
    } else {
      return responseHelper.error(res, "No introduction found", NOT_FOUND);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

// Introduction search
export const introductionSearch = async (req, res) => {
  try {
    const { search_text: searchText = "" } = req.query;
    const searchData = new RegExp(searchText.trim(), "i");

    const { user } = req;
    let filter = {};
    if (!isEmpty(searchText)) {
      filter = {
        $or: [{ purpose: { $regex: searchData } }, { introduction_medium: { $regex: searchData } }, { elaborate_purpose: { $regex: searchData } }, { value_offer: { $regex: searchData } }],
      };
    }

    // query projection
    const projection = {
      $project: {
        _id: 0,
        introduction_id: 1,
        company_id: 1,
        introduction_type: 1,
        purpose: 1,
        introduction_medium: 1,
        elaborate_purpose: 1,
        value_offer: 1,
        last_interacted: 1,
        status: 1,
      },
    };

    //  base filter
    const baseMatch = {
      user_id: user?.user_id,
    };

    // recent interacted query
    const recentInteractedQuery = [
      {
        $match: {
          ...baseMatch,
          last_interacted: { $ne: null },
        },
      },
      { $sort: { last_interacted: -1 } },
      { $limit: 5 },
      projection,
    ];

    // individual query
    const individualQuery = [
      {
        $match: {
          ...baseMatch,
          introduction_type: GENERAL,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      projection,
    ];

    // companies query
    const companiesQuery = [
      {
        $match: {
          ...baseMatch,
          introduction_type: TARGET,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      projection,
    ];

    const recentInteractedResult = await aggregateFromDb(INTRODUCTION_TABLE, recentInteractedQuery);
    const individualResult = await aggregateFromDb(INTRODUCTION_TABLE, individualQuery);
    const companiesResult = await aggregateFromDb(INTRODUCTION_TABLE, companiesQuery);

    if (!isEmpty(individualResult) || !isEmpty(companiesResult)) {
      const responseData = {
        recent: recentInteractedResult,
        individual: individualResult,
        companies: companiesResult,
      };
      return responseHelper.success(res, "Introduction records fetched successfully", SUCCESS, responseData);
    } else {
      return responseHelper.error(res, "No introduction records found", NOT_FOUND);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

// Introduction view
export const introductionView = async (req, res) => {
  try {
    const { introduction_id: introductionId } = req.params;
    if (isEmpty(introductionId)) {
      return responseHelper.error(res, "introduction_id is required", BAD_REQUEST);
    }

    const introductionDetails = await fetchOneFromDb(INTRODUCTION_TABLE, { introduction_id: introductionId });
    if (!isEmpty(introductionDetails)) {
      const responseData = {
        introduction_id: introductionDetails.introduction_id,
        introduction_type: introductionDetails.introduction_type,
        company_id: introductionDetails?.company_id,
        purpose: introductionDetails.purpose,
        introduction_medium: introductionDetails.introduction_medium,
        elaborate_purpose: introductionDetails.elaborate_purpose,
        value_offer: introductionDetails?.value_offer,
        last_interacted: introductionDetails.last_interacted,
        status: introductionDetails.status,
        createdAt: introductionDetails.createdAt,
      };
      return responseHelper.success(res, "Introduction details fetched successfully", SUCCESS, responseData);
    } else {
      return responseHelper.error(res, `No introduction found!`, NOT_FOUND);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

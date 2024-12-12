import { GENERAL, INTRODUCTION_STATUS, IntroductionStatus, TARGET, timestamp, targetTypes } from "../services/helpers/constants.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { BAD_REQUEST, ERROR, NOT_FOUND, SUCCESS } from "../services/helpers/status-code.js";
import { aggregateFromDb, fetchOneFromDb, insertOneToDb, updateOneToDb } from "../services/mongodb.js";
import { introductionListRequestValidate, requestIntroductionRequestValidate, updateIntroductionRequestValidate } from "../services/validations/introduction.validations.js";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { INTRODUCTION_TABLE } from "../services/helpers/db-tables.js";
import { SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
import { fetchCompany, fetchIntroduction, fetchUser } from "../services/db.services.js";
const { isEmpty, pick, isEqual } = lodash;
const INTRODUCTION_FILTERS = ["INDIVIDUAL", "COMPANY"];
const { REQUESTED, RECEIVED } = IntroductionStatus;
const { COMPANY, INDIVIDUAL } = targetTypes;

// Request introduction
export const requestIntroduction = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await requestIntroductionRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const {
      introduction_type: introType = "",
      target_type: targetType = "",
      company_id: companyId = null,
      individual_id = "",
      purpose = "",
      introduction_medium: introductionMedium = "",
      elaborate_purpose: elaboratePurpose = "",
      value_offer: valueOffer = "",
    } = req.body;
    const { user } = req; // user from token

    const introductionType = introType.toUpperCase().trim(); // uppercase the introduction type

    if (introductionType === TARGET && targetType === COMPANY) {
      // check company exist in db
      const companyExist = await fetchCompany({ company_id: companyId });
      if (isEmpty(companyExist)) return responseHelper.error(res, `Company does not exists!`, NOT_FOUND);
    }

    if (introductionType === TARGET && targetType === INDIVIDUAL) {
      const userExists = await fetchUser({ user_id: individual_id });
      if (isEmpty(userExists)) return responseHelper.error(res, `Individual user does not exists!`, NOT_FOUND);
    }

    const introDetails = {
      introduction_id: uuidv4(),
      user_id: user.user_id,
      introduction_type: introductionType.trim(),
      ...(introductionType === TARGET ? { target_type: targetType.trim() } : {}),
      company_id: introductionType === TARGET && targetType === COMPANY ? companyId.trim() : "",
      individual_id: introductionType === TARGET && targetType === INDIVIDUAL ? individual_id : "",
      purpose: purpose.trim(),
      introduction_medium: introductionMedium.trim(),
      elaborate_purpose: elaboratePurpose.trim(),
      ...(introductionType === GENERAL ? { value_offer: valueOffer.trim() } : {}),
      last_interacted: null,
      status: REQUESTED,
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

// Introduction list
export const introductionList = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await introductionListRequestValidate(req.query);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    let { status: status = REQUESTED, introduction_filter: introductionFilter = "" } = req.query;
    const { user } = req;

    if (typeof introductionFilter !== "string" || (!isEmpty(introductionFilter) && !INTRODUCTION_FILTERS.includes(introductionFilter.toUpperCase().trim()))) {
      return responseHelper.error(res, "Invalid introduction filter", BAD_REQUEST);
    }

    introductionFilter = introductionFilter?.toUpperCase().trim() || "";

    // let filter = user?.user_id && status !== RECEIVED ? { user_id: user.user_id } : {};
    let filter = {};

    // Introduction status filter
    if (!isEmpty(status) && status.toUpperCase().trim() !== "ALL") {
      status = status ? status.toUpperCase().trim() : "";
      if (!INTRODUCTION_STATUS.includes(status)) {
        return responseHelper.error(res, "Invalid status value", BAD_REQUEST);
      }
      filter.status = status === RECEIVED ? REQUESTED : status;
    }

    // Introduction type filter for individual and company
    if (!isEmpty(introductionFilter)) {
      filter.introduction_type = introductionFilter === "INDIVIDUAL" ? GENERAL : TARGET;
    }

    if (status && status === RECEIVED) {
      filter.individual_id = user.user_id;
    } else if (status) {
      filter.user_id = { $eq: user.user_id };
    }

    const introductionListQuery = [
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "user_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "company_id",
          foreignField: "company_id",
          as: "company",
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "company_id",
          foreignField: "company_id",
          as: "companyMembers",
        },
      },
      {
        $addFields: {
          members_count: {
            $cond: {
              if: {
                $ifNull: ["$companyMembers", false],
              },
              then: {
                $size: "$companyMembers",
              },
              else: 0,
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "individual_id",
          foreignField: "user_id",
          as: "individualUsers",
        },
      },
      {
        $unwind: {
          path: "$individualUsers",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          introduction_id: 1,
          target_type: 1,
          company_id: {
            $cond: {
              if: {
                $and: [
                  {
                    $eq: ["$introduction_type", "TARGET"],
                    $eq: ["$target_type", "COMPANY"],
                  },
                ],
              },
              then: "$company_id",
              else: "$$REMOVE",
            },
          },
          company_name: "$company.company_name",
          role: "$user.profile_details.role",
          introduction_type: 1,
          individual_id: {
            $cond: {
              if: {
                $eq: ["$target_type", "INDIVIDUAL"],
              },
              then: "$individual_id",
              else: "$$REMOVE",
            },
          },
          individual_name: "$individualUsers.name",
          members_count: {
            $cond: {
              if: {
                $and: [
                  {
                    $ne: ["$company_id", ""],
                  },
                ],
              },
              then: {
                $size: "$companyMembers",
              },
              else: "$$REMOVE", // Exclude the field when the condition is not met
            },
          },
          purpose: 1,
          introduction_medium: 1,
          elaborate_purpose: 1,
          value_offer: 1,
          last_interacted: 1,
          status: {
            // Show RECEIVED status for individual assigned to logged in user
            $cond: {
              if: {
                $and: [
                  { $eq: [status, RECEIVED] }, // Check if status is "RECEIVED"
                  { $eq: ["$individual_id", user.user_id] }, // Check if individual_id matches user_id
                ],
              },
              then: RECEIVED, // Set status to "RECEIVED" if both conditions are true
              else: "$status", // Otherwise, keep the existing status
            },
          },
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

// Introduction search
export const introductionSearch = async (req, res) => {
  try {
    const { search_text: searchText = "" } = req.query;
    const { user } = req;

    // TODO: Implement search functionality
    // const searchData = new RegExp(searchText.trim(), "i");
    // let filter = {};
    // if (!isEmpty(searchText)) {
    //   filter = {
    //     $or: [{ purpose: { $regex: searchData } }, { introduction_medium: { $regex: searchData } }, { elaborate_purpose: { $regex: searchData } }, { value_offer: { $regex: searchData } }],
    //   };
    // }

    // Construct search filter
    const searchData = searchText.trim() ? new RegExp(searchText.trim(), "i") : null;
    const filter = searchData
      ? {
          $or: [{ purpose: { $regex: searchData } }, { introduction_medium: { $regex: searchData } }, { elaborate_purpose: { $regex: searchData } }, { value_offer: { $regex: searchData } }],
        }
      : {};

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

    // Define queries
    const buildQuery = (additionalMatch, sortField, limit = 5) => [{ $match: { ...baseMatch, ...additionalMatch } }, { $sort: { [sortField]: -1 } }, { $limit: limit }, projection];

    const recentInteractedQuery = buildQuery({ last_interacted: { $ne: null } }, "last_interacted"); // recent interacted query
    const individualQuery = buildQuery({ introduction_type: GENERAL }, "createdAt"); // individual query
    const companiesQuery = buildQuery({ introduction_type: TARGET }, "createdAt"); // companies query

    // Execute queries
    const [recentInteractedResult, individualResult, companiesResult] = await Promise.all([
      aggregateFromDb(INTRODUCTION_TABLE, recentInteractedQuery),
      aggregateFromDb(INTRODUCTION_TABLE, individualQuery),
      aggregateFromDb(INTRODUCTION_TABLE, companiesQuery),
    ]);

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

// Update introduction
export const updateIntroduction = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await updateIntroductionRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    let { introduction_id: introductionId = "", status = "" } = req.body;

    // check introduction exist in db
    const introductionFilter = { introduction_id: introductionId };
    const introductionExist = await fetchIntroduction(introductionFilter);
    if (isEmpty(introductionExist)) return responseHelper.error(res, `Introduction does not exists!`, NOT_FOUND);

    // TODO: Add additional field to update after confirmation
    let updateIntroductionData = {};

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
      status = status ? status.toUpperCase().trim() : "";
      if (!INTRODUCTION_STATUS.includes(status)) {
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

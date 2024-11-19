import { COMPANY_MEMBER_TABLE, COMPANY_TABLE } from "../services/helpers/db-tables.js";
import { BAD_REQUEST, ERROR, NOT_FOUND, SUCCESS } from "../services/helpers/status-code.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { insertOneToDb, updateOneToDb } from "../services/mongodb.js";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { ACTIVE, timestamp } from "../services/helpers/constants.js";
import { companyMemberInsertRequestValidate, updateCompanyMemberRequestValidate } from "../services/validations/company-member.validations.js";
import { fetchCompany, fetchCompanyMember } from "../services/validations/db.services.js";
const { isEmpty } = lodash;

export const addCompanyMember = async (req, res) => {
  try {
    // 1: Check if a file is uploaded
    if (!req.file) {
      return responseHelper.error(res, "Image is required", BAD_REQUEST);
    }

    // Validate request
    const isNotValid = await companyMemberInsertRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { user } = req;
    const { company_id: companyId = "", role = "", about_me: aboutMe = "", looking_for: lookingFor = "", profile_keywords: profileKeywords = "", organization = "" } = req.body;

    const companyFilter = {
      company_id: companyId,
    };

    // check company exist in db
    const isCompanyExist = await fetchCompany(companyFilter);
    if (isEmpty(isCompanyExist)) return responseHelper.error(res, `Company does not exists!`, NOT_FOUND);

    const { location, originalname } = req.file;

    const companyMemberData = {
      company_member_id: uuidv4(),
      company_id: companyId,
      user_id: user.user_id,
      role: role,
      about_me: aboutMe,
      looking_for: lookingFor,
      profile_keywords: profileKeywords, //TODO: Waiting for field confirmation
      organization: organization, //TODO: Waiting for field confirmation
      image_url: location,
      image_name: originalname,
      socials: [],
      status: ACTIVE,
      ...timestamp,
    };

    // insert into the database
    const companyMemberSaved = await insertOneToDb(COMPANY_MEMBER_TABLE, companyMemberData);
    if (!isEmpty(companyMemberSaved)) {
      const responseData = {
        company_member_id: companyMemberData?.company_member_id,
      };
      return responseHelper.success(res, "Company member saved successfully", SUCCESS, responseData);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

export const updateCompanyMember = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await updateCompanyMemberRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { company_member_id: companyMemberId, socials } = req.body;

    const companyMemberFilter = {
      company_member_id: companyMemberId,
    };
    const isCompanyExist = await fetchCompanyMember(companyMemberFilter);
    if (isEmpty(isCompanyExist)) return responseHelper.error(res, `Company member does not exists!`, NOT_FOUND);

    const updateData = {
      socials: socials,
      updatedAt: new Date(),
    };

    const memberDataUpdated = await updateOneToDb(COMPANY_MEMBER_TABLE, companyMemberFilter, updateData);
    if (memberDataUpdated) {
      return responseHelper.success(res, "Updated successfully", SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

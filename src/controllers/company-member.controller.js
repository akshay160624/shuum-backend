import { COMPANY_MEMBER_TABLE, COMPANY_TABLE } from "../services/helpers/db-tables.js";
import { BAD_REQUEST, ERROR, NOT_FOUND, SUCCESS } from "../services/helpers/status-code.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { insertOneToDb, updateOneToDb } from "../services/mongodb.js";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { ACTIVE, ORGANIZATION_OPTIONS, PROFILE_KEYWORDS_OPTIONS, timestamp } from "../services/helpers/constants.js";
import { companyMemberInsertRequestValidate, updateCompanyMemberRequestValidate } from "../services/validations/company-member.validations.js";
import { fetchCompany, fetchCompanyMember } from "../services/validations/db.services.js";
import { encryptPasswordToHash, findOptionByValue } from "../services/utility.js";
import { SOMETHING_WENT_WRONG } from "./../services/helpers/response-message.js";
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

    // profileKeywords available then validate
    if (!isEmpty(profileKeywords)) {
      const profileKeywordsOption = findOptionByValue(PROFILE_KEYWORDS_OPTIONS, profileKeywords);
      if (!profileKeywordsOption) {
        return responseHelper.error(res, "Invalid keyword value", BAD_REQUEST);
      }
    }

    // TODO: Add organization validation and options
    // organization available then validate
    // if (!isEmpty(organization)) {
    //   const organizationOption = findOptionByValue(ORGANIZATION_OPTIONS, organization);
    //   if (!organizationOption) {
    //     return responseHelper.error(res, "Invalid organization value", BAD_REQUEST);
    //   }
    // }

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
      user_id: user?.user_id,
      role: role.trim(),
      about_me: aboutMe.trim(),
      looking_for: lookingFor.trim(),
      profile_keywords: profileKeywords.toUpperCase().trim(), //TODO: Waiting for field confirmation
      organization: organization.toUpperCase().trim(), //TODO: Waiting for field confirmation
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

    const { company_member_id: companyMemberId, socials, first_name: firstName, last_name: lastName, password, confirm_password: confirmPassword } = req.body;

    const companyMemberFilter = { company_member_id: companyMemberId };
    const isCompanyExist = await fetchCompanyMember(companyMemberFilter);
    if (isEmpty(isCompanyExist)) return responseHelper.error(res, `Company member does not exists!`, NOT_FOUND);

    const updateData = { updatedAt: new Date() };

    if (!isEmpty(socials)) {
      updateData.socials = socials;
    }
    if (!isEmpty(firstName)) {
      updateData.first_name = firstName;
    }
    if (!isEmpty(lastName)) {
      updateData.last_name = lastName;
    }

    // validate password
    if (password !== undefined) {
      let message = "";
      if (!password.trim()) {
        message = "Password cannot be empty";
      } else if (!confirmPassword) {
        message = "Confirm password is required with password";
      } else if (password.trim() !== confirmPassword.trim()) {
        message = "Password does not match";
      }
      if (message) {
        return responseHelper.error(res, message, BAD_REQUEST);
      }
    }

    if (password) {
      const encryptedPassword = await encryptPasswordToHash(password);
      updateData.password = encryptedPassword;
    }

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

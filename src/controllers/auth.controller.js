import { getOtpRequestValidate, passwordLoginRequestValidate, registerUserRequestValidate, updateProfileRequestValidate, verifyOtpRequestValidate } from "../services/validations/auth.validations.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { BAD_REQUEST, ERROR, NOT_FOUND, SUCCESS, UNAUTHORIZED } from "../services/helpers/status-code.js";
import { USER_TABLE } from "../services/helpers/db-tables.js";
import { INACTIVE, PROFILE_KEYWORDS_OPTIONS, ROLE_OPTIONS, timestamp } from "../services/helpers/constants.js";
import { fetchOneFromDb, insertOneToDb, updateOneToDb } from "../services/mongodb.js";
import { comparePasswords, createJwtToken, encryptPasswordToHash, findOptionByValue, generateOtpWithExpiry, sendEmail, validateOTP } from "../services/utility.js";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { EMAIL_SENT, SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
import { fetchCompany } from "../services/db.services.js";
const { isEmpty } = lodash;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// get-otp for register
export const register = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await registerUserRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { email } = req.body;

    const userFilter = {
      email: email.trim(),
      //   status: INACTIVE,
    };

    // check user exist in db
    const userExist = await fetchOneFromDb(USER_TABLE, userFilter);
    if (!isEmpty(userExist)) return responseHelper.error(res, `User already exist with ${email}.`, BAD_REQUEST);

    // generate random 6 digit otp
    const { otp, otpExpires } = generateOtpWithExpiry();

    // generate email template
    const locals = { otp: otp };
    const emailBody = await ejs.renderFile(path.join(__dirname, "../views/emails/auth", "email-verify.ejs"), { locals: locals });

    //sending email to user
    await sendEmail(email, emailBody, "Verify-Otp");

    // create user insert data
    const userData = {
      user_id: uuidv4(),
      email: email.trim(),
      name: "",
      otp: otp,
      otp_expiry: otpExpires,
      profile_details: {
        role: "",
        about_me: "",
        looking_for: "",
        profile_keywords: "",
        organization: "",
        linkedin_url: "",
      },
      socials: [],
      password: "",
      email_verified: false,
      status: INACTIVE,
      ...timestamp,
    };

    // insert into the database
    const userSaved = await insertOneToDb(USER_TABLE, userData);
    if (userSaved) {
      return responseHelper.success(res, EMAIL_SENT, SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

// verify otp
export const verifyOtp = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await verifyOtpRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { email, otp } = req.body;

    const userFilter = {
      email: email.trim(),
      // status: ACTIVE,
    };

    // validate user
    const userExist = await fetchOneFromDb(USER_TABLE, userFilter);
    if (isEmpty(userExist)) return responseHelper.error(res, `User does not exist with ${email}.`, NOT_FOUND);

    await validateOTP(otp, userExist);

    const userUpdateData = {
      otp: null,
      otp_expiry: null,
      email_verified: true,
      updatedAt: new Date(),
    };

    // update user data
    const otpVerified = await updateOneToDb(USER_TABLE, { user_id: userExist.user_id }, userUpdateData);
    if (otpVerified) {
      const responseData = {
        token: await createJwtToken(userExist),
      };
      return responseHelper.success(res, "OTP verified successfully", SUCCESS, responseData);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

// get-otp for login
export const getOtp = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await getOtpRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { email } = req.body;

    const userFilter = {
      email: email.trim(),
      // status: ACTIVE,
    };

    // check user exist in db
    const userExist = await fetchOneFromDb(USER_TABLE, userFilter);
    if (isEmpty(userExist)) return responseHelper.error(res, `User does not exist with ${email}.`, NOT_FOUND);

    // generate random 6 digit otp
    const { otp, otpExpires } = generateOtpWithExpiry();

    // generate email template
    const locals = { otp: otp };
    const emailBody = await ejs.renderFile(path.join(__dirname, "../views/emails/auth", "email-verify.ejs"), { locals: locals });

    //sending email to user
    await sendEmail(email, emailBody, "Verify-Otp");

    // update otp and otp expiry
    const userUpdateData = {
      otp: otp,
      otp_expiry: otpExpires,
      updatedAt: new Date(),
    };

    // update user data
    const userUpdated = await updateOneToDb(USER_TABLE, { user_id: userExist.user_id }, userUpdateData);
    if (userUpdated) {
      return responseHelper.success(res, EMAIL_SENT, SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

export const passwordLogin = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await passwordLoginRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { email, password } = req.body;

    // validate user
    const userFilter = {
      email: email.trim(),
      // status: ACTIVE,
    };

    const userExits = await fetchOneFromDb(USER_TABLE, userFilter);
    if (isEmpty(userExits)) {
      return responseHelper.error(res, `User does not exists.`, NOT_FOUND);
    }
    if (isEmpty(userExits.password)) {
      return responseHelper.error(res, `Password is not configured.`, UNAUTHORIZED);
    }

    const hashPassword = userExits.password;
    const passwordMatch = await comparePasswords(password, hashPassword);
    if (passwordMatch) {
      const responseData = {
        token: await createJwtToken(userExits),
      };
      return responseHelper.success(res, "Logged in successful", SUCCESS, responseData);
    } else {
      return responseHelper.error(res, "Invalid password. Please try again.", UNAUTHORIZED);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

export const updateUserInfo = async (req, res) => {
  try {
    const { user = null } = req; // get user details from auth token
    const { name = "", role = "", linkedin_url: linkedinUrl = "", password, confirm_password: confirmPassword } = req.body;

    const userExist = await fetchOneFromDb(USER_TABLE, { user_id: user.user_id });
    const userUpdateData = { updatedAt: new Date() };
    userUpdateData.profile_details = user.profile_details;

    if (!isEmpty(name)) {
      userUpdateData.name = name.trim();
    }

    // role available then validate
    if (!isEmpty(role)) {
      const roleOption = findOptionByValue(ROLE_OPTIONS, role);
      if (!roleOption) {
        return responseHelper.error(res, "Invalid role value", BAD_REQUEST);
      }
      userUpdateData.profile_details.role = role.toUpperCase().trim();
    }
    if (!isEmpty(linkedinUrl)) {
      userUpdateData.profile_details.linkedin_url = linkedinUrl.trim();
    }

    // validate password
    if (password !== undefined) {
      let message = "";
      if (!password.trim()) {
        message = "Password cannot be empty";
      } else if (password.length < 6) {
        message = "Password must be minimum 6 characters";
      } else if (!confirmPassword) {
        message = "Confirm password is required with password";
      } else if (password.trim() !== confirmPassword.trim()) {
        message = "Password does not match";
      }
      if (message) {
        return responseHelper.error(res, message, BAD_REQUEST);
      }
      const encryptedPassword = await encryptPasswordToHash(password); // encrypt password
      userUpdateData.password = encryptedPassword;
    }

    // update user data
    const userUpdated = await updateOneToDb(USER_TABLE, { user_id: user.user_id }, userUpdateData);
    if (userUpdated) {
      return responseHelper.success(res, "User details update successfully", SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    // 1: Check if a file is uploaded
    if (!req.file) {
      return responseHelper.error(res, "Image is required", BAD_REQUEST);
    }

    // Validate request
    const isNotValid = await updateProfileRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { user } = req;
    const { company_id: companyId = "", role = "", about_me: aboutMe = "", looking_for: lookingFor = "", profile_keywords: profileKeywords = "", organization = "", socials = [] } = req.body;

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
    const companyExist = await fetchCompany(companyFilter);
    if (isEmpty(companyExist)) return responseHelper.error(res, `Company does not exists!`, NOT_FOUND);

    // role available then validate
    if (!isEmpty(role)) {
      const roleOption = findOptionByValue(ROLE_OPTIONS, role);
      if (!roleOption) {
        return responseHelper.error(res, "Invalid role value", BAD_REQUEST);
      }
    }

    const { location, originalname } = req.file;

    const profileData = {
      company_id: companyId,
      profile_details: {
        role: role.toUpperCase().trim(),
        about_me: aboutMe.trim(),
        looking_for: lookingFor.trim(),
        profile_keywords: profileKeywords.toUpperCase().trim(),
        organization: organization.toUpperCase().trim(),
      },
      profile_url: location,
      profile_image_name: originalname,
      updatedAt: new Date(),
    };

    if (!isEmpty(socials)) {
      if (Array.isArray(socials) && socials.every((item) => typeof item === "string")) {
        profileData.socials = socials;
      } else {
        return responseHelper.error(res, "Socials must be an array of strings", BAD_REQUEST);
      }
    }

    // insert into the database
    const profileSaved = await updateOneToDb(USER_TABLE, { user_id: user.user_id }, profileData);
    if (!isEmpty(profileSaved)) {
      return responseHelper.success(res, "Profile details saved successfully", SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

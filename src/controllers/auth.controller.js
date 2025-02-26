import { getOtpRequestValidate, registerUserRequestValidate, verifyOtpRequestValidate, verifyUpdateUserInfoRequestValidate } from "../services/validations/auth.validations.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { BAD_REQUEST, ERROR, SUCCESS } from "../services/helpers/status-code.js";
import { USER_TABLE } from "../services/helpers/db-tables.js";
import { ACTIVE, INACTIVE } from "../services/helpers/constants.js";
import { fetchOneFromDb, insertOneToDb, updateOneToDb } from "../services/mongodb.js";
import { createJwtToken, generateOtpWithExpiry, sendEmail, validateOTP } from "../services/utility.js";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { EMAIL_SENT, SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
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
      role: "",
      linkedin: "",
      otp: otp,
      otp_expiry: otpExpires,
      email_verified: false,
      status: INACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      email: email,
    };

    // validate user
    const userExist = await fetchOneFromDb(USER_TABLE, userFilter);
    if (isEmpty(userExist)) return responseHelper.error(res, `User does not exist with ${email}.`, BAD_REQUEST);

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
    if (isEmpty(userExist)) return responseHelper.error(res, `User does not exist with ${email}.`, BAD_REQUEST);

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

export const updateUserInfo = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await verifyUpdateUserInfoRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { name, role, linkedin, user } = req.body;

    const userUpdateData = {
      name: name.trim(),
      role: role.trim(),
      linkedin: linkedin.trim(),
      updatedAt: new Date(),
    };

    // update user data
    const userUpdated = await updateOneToDb(USER_TABLE, { user_id: user.user_id }, userUpdateData);
    if (userUpdated) {
      return responseHelper.success(res, "Details update successfully", SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

import {
  getOtpRequestValidate,
  passwordLoginRequestValidate,
  registerUserRequestValidate,
  sendInviteRequestValidate,
  updateProfileRequestValidate,
  verifyOtpRequestValidate,
} from "../services/validations/auth.validations.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { BAD_REQUEST, CONFLICT, ERROR, NOT_FOUND, SUCCESS } from "../services/helpers/status-code.js";
import { COMPANY_TABLE, INTRODUCTION_TABLE, INVITES_TABLE, USER_TABLE } from "../services/helpers/db-tables.js";
import {
  CLAIMED,
  INACTIVE,
  IntroductionStatus,
  PROFILE_KEYWORDS_OPTIONS,
  timestamp,
  UNCLAIMED,
  InvitationStatus,
  LOOKING_FOR_OPTIONS,
  ROLE_OPTIONS,
  INDUSTRY_TAGS_OPTIONS,
  ASKS_OPTIONS,
  GIVES_OPTIONS,
} from "../services/helpers/constants.js";
import { aggregateFromDb, fetchAllFromDb, fetchOneFromDb, insertOneToDb, updateOneToDb } from "../services/mongodb.js";
import {
  comparePasswords,
  createJwtToken,
  encryptPasswordToHash,
  findOptionByValue,
  generateOtpWithExpiry,
  sendEmail,
  validateLinkedinUrl,
  validateOptionValues,
  validateOTP,
} from "../services/utility.js";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { EMAIL_SENT, SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
import { fetchCompany, getUser, updateAuthUser } from "../services/db.services.js";
import { registerAuthUser } from "../services/db.services.js";
import { getGoogleUserInfo } from "../services/google-auth.services.js";
const { COMPLETED } = IntroductionStatus;
const { PENDING } = InvitationStatus;
const { isEmpty } = lodash;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----Auth APIs start-----
// get-otp for register
export const register = async (req, res) => {
  try {
    const { platform: loginPlatform = "", code = "" } = req.body;
    if (loginPlatform && loginPlatform.toLowerCase() === "google") {
      try {
        // Get user information using code tokens
        const googleUser = await getGoogleUserInfo(code.trim());
        if (!isEmpty(googleUser)) {
          const { email } = googleUser;
          const userExist = await getUser({ email: email.toLowerCase().trim() });
          if (isEmpty(userExist)) {
            // register user if not registered
            const registeredUser = await registerAuthUser(email);
            const responseData = {
              token: await createJwtToken(registeredUser),
            };
            return responseHelper.success(res, "Signup successful", SUCCESS, responseData);
          } else {
            return responseHelper.error(res, `User already exist with ${email}`, BAD_REQUEST);
          }
        }
      } catch (err) {
        console.error("Error processing Google auth code:", err.message);
        return responseHelper.error(res, err.message, ERROR);
      }
    } else {
      // Validate request
      const isNotValid = await registerUserRequestValidate(req.body);
      if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

      const { email } = req.body;

      const userFilter = {
        email: email.toLowerCase().trim(),
        //   status: INACTIVE,
      };

      // check user exist in db
      const userExist = await fetchOneFromDb(USER_TABLE, userFilter);

      // validate signup is completed
      if (userExist?.signup_completed === true) return responseHelper.error(res, `User already exist with ${email}.`, BAD_REQUEST);

      // generate random 6 digit otp
      const { otp = null, otpExpires = null } = generateOtpWithExpiry();

      // generate email template
      const locals = { otp: otp };
      const emailBody = await ejs.renderFile(path.join(__dirname, "../views/emails/auth", "email-verify.ejs"), { locals: locals });

      //sending email to user
      await sendEmail(email, emailBody, "Verify-Otp");

      let userSaved = false;
      if (userExist?.signup_completed === false) {
        userSaved = await updateAuthUser(userExist, otp, otpExpires);
      } else {
        // create user insert data
        const userData = {
          user_id: uuidv4(),
          email: email.toLowerCase().trim(),
          first_name: "",
          last_name: "",
          otp: otp,
          otp_expiry: otpExpires,
          profile_details: {
            role: "",
            about_me: "",
            looking_for: "",
            profile_keywords: [],
            organization: "",
            linkedin_url: "",
          },
          socials: [],
          password: "",
          email_verified: false,
          signup_completed: false,
          onboarding_steps: "",
          status: INACTIVE,
          ...timestamp,
        };

        // insert into the database
        userSaved = await insertOneToDb(USER_TABLE, userData);
      }

      if (userSaved) {
        return responseHelper.success(res, EMAIL_SENT, SUCCESS);
      } else {
        return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
      }
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
      email: email.toLowerCase().trim(),
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

    if (userExist?.signup_completed === false) {
      userUpdateData.signup_completed = true;
    }

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
      email: email.toLowerCase().trim(),
      signup_completed: true,
      // status: ACTIVE,
    };

    // check user exist in db
    const userExist = await fetchOneFromDb(USER_TABLE, userFilter);
    if (isEmpty(userExist)) return responseHelper.error(res, `User does not exist with ${email}.`, NOT_FOUND);

    // generate random 6 digit otp
    const { otp = null, otpExpires = null } = generateOtpWithExpiry();

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
    const { platform: loginPlatform = "", code = "" } = req.body;

    if (loginPlatform && loginPlatform.toLowerCase() === "google") {
      try {
        // Get user information using the set tokens
        const googleUser = await getGoogleUserInfo(code.trim());
        if (!isEmpty(googleUser)) {
          const { email } = googleUser;
          const userExist = await getUser({ email: email.toLowerCase().trim() });
          if (!isEmpty(userExist)) {
            // generate token if user exist
            const responseData = {
              token: await createJwtToken(userExist),
              onboarding_steps: userExist?.onboarding_steps || "",
            };
            return responseHelper.success(res, "Login successful", SUCCESS, responseData);
          } else {
            return responseHelper.error(res, `User does not exists.`, NOT_FOUND);
          }
        }
      } catch (err) {
        console.error("Error processing Google auth code:", err.message);
        return responseHelper.error(res, err.message, ERROR);
      }
    } else {
      // Validate request
      const isNotValid = await passwordLoginRequestValidate(req.body);
      if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

      const { email, password } = req.body;

      // validate user
      const userFilter = {
        email: email.toLowerCase().trim(),
        // status: ACTIVE,
      };

      const userExists = await fetchOneFromDb(USER_TABLE, userFilter);
      if (isEmpty(userExists)) {
        return responseHelper.error(res, `User does not exists.`, NOT_FOUND);
      }
      if (isEmpty(userExists.password)) {
        return responseHelper.error(res, `Password is not configured.`, BAD_REQUEST);
      }

      const hashPassword = userExists.password;
      const passwordMatch = await comparePasswords(password, hashPassword);
      if (passwordMatch) {
        const responseData = {
          token: await createJwtToken(userExists),
          onboarding_steps: userExists?.onboarding_steps || "",
        };
        return responseHelper.success(res, "Login successful", SUCCESS, responseData);
      } else {
        return responseHelper.error(res, "Invalid password. Please try again.", BAD_REQUEST);
      }
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};
// -----Auth APIs end-----

// -----Users APIs start-----
export const updateUserInfo = async (req, res) => {
  try {
    const { user = null } = req; // get user details from auth token
    const { name = "", role = "", linkedin_url: linkedinUrl = "", password, confirm_password: confirmPassword } = req.body;

    const userUpdateData = { updatedAt: new Date() };
    userUpdateData.profile_details = user.profile_details;

    if (!isEmpty(name)) {
      userUpdateData.first_name = name.trim();
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
      const { message = "", url = "" } = validateLinkedinUrl(linkedinUrl.trim());
      if (!isEmpty(message)) {
        return responseHelper.error(res, message, BAD_REQUEST);
      }
      userUpdateData.profile_details.linkedin_url = url;
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
    // const isNotValid = await updateProfileRequestValidate(req.body);
    // if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { user } = req;
    const {
      company_id: companyId = "",
      first_name: firstName = "",
      last_name: lastName = "",
      location = "",
      role = "",
      about_me: aboutMe = "",
      looking_for: lookingFor = "",
      other_looking_for: otherLookingFor = "",
      profile_keywords: profileKeywords = [],
      organization = "",
      linkedin_url: linkedinUrl = "",
      socials = [],
      industry_tags: industryTags = [],
      bio = "",
      asks = [],
      gives = [],
      onboarding_steps: onboardingSteps = "",
    } = req.body;

    // TODO: Add organization options and validation
    // organization available then validate
    // if (!isEmpty(organization)) {
    //   const organizationOption = findOptionByValue(ORGANIZATION_OPTIONS, organization);
    //   if (!organizationOption) {
    //     return responseHelper.error(res, "Invalid organization value", BAD_REQUEST);
    //   }
    // }

    const profileData = {};
    profileData.profile_details = user.profile_details;

    let companyExist = "";
    // check company exist in db
    if (!isEmpty(companyId)) {
      companyExist = await fetchCompany({ company_id: companyId });
      if (isEmpty(companyExist)) return responseHelper.error(res, `Company does not exists!`, NOT_FOUND);
      profileData.company_id = companyId;
    }

    const { location: profileUrl = "", originalname, filename: fileName = "" } = req.file;

    // role available then validate
    if (!isEmpty(role)) {
      const roleOption = findOptionByValue(ROLE_OPTIONS, role);
      if (!roleOption) {
        return responseHelper.error(res, "Invalid role value", BAD_REQUEST);
      }
      profileData.profile_details.role = role.toUpperCase().trim();
    }
    if (!isEmpty(aboutMe)) profileData.profile_details.about_me = aboutMe.trim();
    if (!isEmpty(lookingFor)) {
      const lookingForOption = lookingFor.toUpperCase().trim();
      const validLookingForValue = findOptionByValue(LOOKING_FOR_OPTIONS, lookingForOption);

      if (!validLookingForValue) {
        return responseHelper.error(res, "Invalid looking for value", BAD_REQUEST);
      }

      if (lookingForOption === "OTHER" && isEmpty(otherLookingFor)) {
        return responseHelper.error(res, "Invalid other looking for value", BAD_REQUEST);
      }

      profileData.profile_details.looking_for = lookingForOption;
      profileData.profile_details.other_looking_for = lookingForOption === "OTHER" ? otherLookingFor : "";
    }
    if (!isEmpty(organization)) profileData.profile_details.organization = organization.toUpperCase().trim();
    if (!isEmpty(linkedinUrl)) {
      const { message = "", url = "" } = validateLinkedinUrl(linkedinUrl.trim());
      if (!isEmpty(message)) {
        return responseHelper.error(res, message, BAD_REQUEST);
      }
      profileData.profile_details.linkedin_url = url;
    }

    if (firstName) profileData.first_name = firstName.trim();
    if (lastName) profileData.last_name = lastName.trim();
    if (location) profileData.location = location.trim();

    if (!isEmpty(industryTags)) {
      const { message, dataArrayUppercase: industryData } = validateOptionValues(INDUSTRY_TAGS_OPTIONS, industryTags, "industry_tags");
      if (message) {
        return responseHelper.error(res, message, BAD_REQUEST);
      }
      profileData.industry_tags = industryData;
    }

    if (!isEmpty(bio)) {
      if (bio.length > 1000) {
        return responseHelper.error(res, "Bio must not exceed 1000 characters", BAD_REQUEST);
      }
      profileData.bio = bio;
    }

    if (!isEmpty(asks)) {
      const { message, dataArrayUppercase: asksData } = validateOptionValues(ASKS_OPTIONS, asks, "asks");
      if (message) {
        return responseHelper.error(res, message, BAD_REQUEST);
      }
      profileData.asks = asksData;
    }

    if (!isEmpty(gives)) {
      const { message, dataArrayUppercase: givesData } = validateOptionValues(GIVES_OPTIONS, gives, "gives");
      if (message) {
        return responseHelper.error(res, message, BAD_REQUEST);
      }
      profileData.gives = givesData;
    }

    if (onboardingSteps || onboardingSteps === false) profileData.onboarding_steps = onboardingSteps;

    if (!isEmpty(profileKeywords)) {
      if (Array.isArray(profileKeywords) && profileKeywords.every((item) => typeof item === "string")) {
        // Validate if all keywords exist in PROFILE_KEYWORDS_OPTIONS
        const isValidKeywords = profileKeywords.every((keyword) => findOptionByValue(PROFILE_KEYWORDS_OPTIONS, keyword));

        if (!isValidKeywords) {
          return responseHelper.error(res, "Invalid profile keyword value", BAD_REQUEST);
        }
        // Convert all keywords to uppercase
        const profileKeywordsUppercase = profileKeywords.map((keyword) => keyword.toUpperCase());

        profileData.profile_details.profile_keywords = profileKeywordsUppercase;
      } else {
        return responseHelper.error(res, "Profile keywords must be an array of strings", BAD_REQUEST);
      }
    }

    if (profileUrl) {
      profileData.profile_url = profileUrl;
      profileData.profile_image_name = fileName;
    }

    if (!isEmpty(socials)) {
      if (Array.isArray(socials) && socials.every((item) => typeof item === "string")) {
        profileData.socials = socials;
      } else {
        return responseHelper.error(res, "Socials must be an array of strings", BAD_REQUEST);
      }
    }

    profileData.updatedAt = new Date();
    // insert into the database
    const profileSaved = await updateOneToDb(USER_TABLE, { user_id: user.user_id }, profileData);
    if (!isEmpty(profileSaved)) {
      // if user choose company then update company status with "CLAIMED
      if (companyExist && companyExist.status === UNCLAIMED) {
        const updateStatusData = {
          status: CLAIMED,
          updatedAt: new Date(),
        };
        await updateOneToDb(COMPANY_TABLE, { company_id: companyId }, updateStatusData);
      }
      return responseHelper.success(res, "Profile details saved successfully", SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

export const getOnboardingSteps = async (req, res) => {
  try {
    // Extract the user from the request
    const { user } = req;

    // Validate the user object
    if (isEmpty(user)) return responseHelper.error(res, "Invalid request", BAD_REQUEST);

    // Validate user
    const userExist = await getUser({ user_id: user?.user_id });
    if (isEmpty(userExist)) return responseHelper.error(res, "User does not exist.", NOT_FOUND);

    const responseData = {
      onboarding_steps: userExist?.onboarding_steps || "",
    };
    return responseHelper.success(res, "Onboarding steps fetched successfully", SUCCESS, responseData);
  } catch (err) {
    console.error("Error fetching onboarding steps:", err);
    return responseHelper.error(res, err.message, ERROR);
  }
};

export const getProfile = async (req, res) => {
  try {
    // Extract the user from the request, default to null if not present
    const { user = null } = req;
    const userId = user?.user_id || "";

    // Fetch the user data
    const userExist = await getUser({ user_id: userId });

    // Check if user exists
    if (isEmpty(userExist)) {
      return responseHelper.error(res, "User does not exist.", NOT_FOUND);
    }

    // Fetch related company and introductions data
    const [companyExist, usersIntroductions] = await Promise.all([fetchCompany({ company_id: userExist?.company_id }), fetchAllFromDb(INTRODUCTION_TABLE, { user_id: userId, status: COMPLETED })]);

    const firstName = userExist?.first_name || userExist?.name || "";
    // Construct the response data
    const responseData = {
      first_name: firstName,
      last_name: userExist?.last_name || "",
      full_name: userExist?.last_name ? `${firstName} ${userExist?.last_name}` : firstName,
      profile_url: userExist?.profile_url || "",
      location: userExist?.location || "",
      role: userExist?.profile_details?.role || "",
      linkedin_url: userExist?.profile_details?.linkedin_url || "",
      company_name: companyExist?.company_name || "",
      introduction_completed: usersIntroductions?.length || 0,
      pursuit_completed: 0, //TODO: Add pursuit query data
      active_partners: 0, //TODO: Add active partners query data
      onboarding_steps: userExist?.onboarding_steps || "",
      industry_tags: userExist?.industry_tags || [],
      bio: userExist?.bio || "",
      asks: userExist?.asks || [],
      gives: userExist?.gives || [],
    };
    return responseHelper.success(res, "User profile fetched successfully", SUCCESS, responseData);
  } catch (err) {
    // Handle unexpected errors
    console.error("Error fetching user profile:", err);
    return responseHelper.error(res, err.message, ERROR);
  }
};

// users list for individuals dropdown
export const usersList = async (req, res) => {
  try {
    const { search_text: searchText = "" } = req.query;
    const { user = null } = req;

    let filter = {
      email_verified: true,
      signup_completed: true,
    };

    // Exclude the requesting user's record from the list to ensure the user does not see their own record.
    if (!isEmpty(user)) filter.user_id = { $nin: [user.user_id] };

    // Define the second $match stage for the dynamic search filter
    const searchMatch = searchText.trim()
      ? {
          $or: [
            { name: { $regex: new RegExp(searchText.trim(), "i") } },
            { first_name: { $regex: new RegExp(searchText.trim(), "i") } },
            { last_name: { $regex: new RegExp(searchText.trim(), "i") } },
          ],
        }
      : null;

    // list query
    const usersListQuery = [
      {
        $match: filter,
      },
      // Second $match stage for dynamic search filters
      ...(searchMatch ? [{ $match: searchMatch }] : []),
      // Projection stage
      {
        $project: {
          _id: 0,
          user_id: 1,
          name: 1,
          first_name: 1,
          last_name: 1,
        },
      },
    ];

    const users = await aggregateFromDb(USER_TABLE, usersListQuery);
    if (!isEmpty(users)) {
      return responseHelper.success(res, "Users list fetched successfully", SUCCESS, users);
    } else {
      return responseHelper.error(res, "No users found", NOT_FOUND);
    }
  } catch (err) {
    console.error("Error fetching users list:", err);
    return responseHelper.error(res, err.message, ERROR);
  }
};

export const sendInvite = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await sendInviteRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { email: rawEmail } = req.body;
    const { user } = req;
    const email = rawEmail.toLowerCase().trim();

    // Check if user already exists
    const userExist = await getUser({ email });
    if (!isEmpty(userExist)) {
      return responseHelper.error(res, "User already exists. Invite not sent.", CONFLICT);
    }

    // Generate invite link
    const inviteLink = `${process.env.CLIENT_LIVE_URL}/signup`;

    // Generate email template
    const locals = { invite_link: inviteLink };
    const emailBody = await ejs.renderFile(path.join(__dirname, "../views/emails", "invite.ejs"), { locals: locals });

    // Send invite email
    await sendEmail(email, emailBody, "You're Invited!");

    // Save invite data to the database
    const inviteData = {
      invite_id: uuidv4(),
      invited_by: user.user_id,
      email,
      status: PENDING,
      ...timestamp,
    };
    await insertOneToDb(INVITES_TABLE, inviteData); // save in database

    return responseHelper.success(res, "Invitation email sent successfully.", SUCCESS);
  } catch (err) {
    // Handle unexpected errors
    console.error("Error sending invite email:", err);
    return responseHelper.error(res, err.message, ERROR);
  }
};
// -----Users APIs end-----

import { INACTIVE, timestamp } from "./helpers/constants.js";
import { COMPANY_TABLE, USER_TABLE } from "./helpers/db-tables.js";
import { fetchOneFromDb, insertOneToDb, updateOneToDb } from "./mongodb.js";
import { v4 as uuidv4 } from "uuid";

export const fetchCompany = async (filter) => {
  return await fetchOneFromDb(COMPANY_TABLE, filter);
};

//  update user for otp and otp expiry
export const updateAuthUser = async (userExist, otp, otpExpires) => {
  // update otp and otp expiry
  const userUpdateData = {
    otp: otp,
    otp_expiry: otpExpires,
    updatedAt: new Date(),
  };

  // update user data
  return await updateOneToDb(USER_TABLE, { user_id: userExist.user_id }, userUpdateData);
};

export const fetchUser = async () => {
  return;
};

// insert new user in db
export const registerAuthUser = async (email, otp = null, otpExpires = null) => {
  // create user insert data
  const userData = {
    user_id: uuidv4(),
    email: email.toLowerCase().trim(),
    name: "",
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
    email_verified: true,
    signup_completed: true,
    onboarding_steps: "",
    status: INACTIVE,
    ...timestamp,
  };

  // insert into the database
  await insertOneToDb(USER_TABLE, userData);

  // fetch inserted user data
  return await fetchOneFromDb(USER_TABLE, { user_id: userData.user_id });
};

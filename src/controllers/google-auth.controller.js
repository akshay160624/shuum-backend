import { registerAuthUser } from "../services/db.services.js";
import { USER_TABLE } from "../services/helpers/db-tables.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { ERROR, SUCCESS, UNAUTHORIZED } from "../services/helpers/status-code.js";
import { fetchOneFromDb } from "../services/mongodb.js";
import { createJwtToken } from "../services/utility.js";

export const callbackNav = async (req, res) => {
  try {
    const { access_token: accessToken, ...userData } = req.user;

    let token = "";
    const userExist = await fetchOneFromDb(USER_TABLE, { email: userData.email.toLowerCase().trim() });
    if (!userExist) {
      // register user if not registered
      const registeredUser = await registerAuthUser(userData.email);
      token = await createJwtToken(registeredUser);
    } else {
      token = await createJwtToken(userExist);
    }

    // set jwt token in cookies
    await res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.ENVIRONMENT_NAME === "PROD",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
      // maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // redirect to client URL
    return res.redirect(`${process.env.CLIENT_REDIRECTION_URL}`);
    // return responseHelper.success(res, "Successfully logged in with Google", SUCCESS, responseData);
  } catch (err) {
    console.error("Callback Error:", err.message);
    return responseHelper.error(res, "Error processing login", ERROR);
  }
};

export const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return responseHelper.error(res, "Failed to logout", ERROR);
    }
    // Clear the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return responseHelper.error(res, "Failed to clear session", ERROR);
      }
      res.clearCookie("connect.sid"); // Clear session cookie
      res.clearCookie("jwt"); // Clear jwt cookie

      // Redirect to the home page or login page after logout
      res.redirect(`${process.env.CLIENT_URL}`);
    });
  });
};

export const loginFailed = (req, res) => {
  try {
    return responseHelper.error(res, "Authentication failed", UNAUTHORIZED);
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};

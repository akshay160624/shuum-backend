import { registerAuthUser } from "../services/db.services.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { ERROR, FORBIDDEN, SUCCESS, UNAUTHORIZED } from "../services/helpers/status-code.js";

export const callbackNav = async (req, res) => {
  try {
    const { access_token: accessToken, ...userData } = req.user;

    const responseData = {
      user: userData, // Will contain the Google user profile
      token: accessToken,
    };

    // register user if not registered
    await registerAuthUser(userData.email);

    return responseHelper.success(res, "Successfully logged in with Google", SUCCESS, responseData);
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
      // Redirect to the home page or login page after logout
      res.redirect("/auth/google"); //TODO: Add client URL process.env.CLIENT_URL
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

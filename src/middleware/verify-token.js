import jwt from "jsonwebtoken";
import * as responseHelper from "../services/helpers/response-helper.js";
import { INVALID_TOKEN, TOKEN_NOTFOUND, USER_NOTFOUND } from "../services/helpers/response-message.js";
import { NOT_FOUND, UNAUTHORIZED } from "../services/helpers/status-code.js";
import lodash from "lodash";
import { fetchUser } from "../services/db.services.js";
const { isEmpty } = lodash;

// JWT middleware
export const verifyUserAuthToken = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return responseHelper.error(res, TOKEN_NOTFOUND, NOT_FOUND);
  }

  try {
    // Extract and verify the token
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return responseHelper.error(res, INVALID_TOKEN, UNAUTHORIZED);
    }

    // Fetch the user from the database
    const userInDb = await fetchUser({ user_id: decoded.tokenObject.user_id });
    if (isEmpty(userInDb)) {
      return responseHelper.error(res, USER_NOTFOUND, NOT_FOUND);
    }

    // Attach user and token to the request
    req.user = userInDb;
    req.token = token;

    next(); // Proceed to the next middleware
  } catch (err) {
    return responseHelper.error(res, err.message, UNAUTHORIZED);
  }
};

export const verifyAuthPublicOrPrivate = async (req, res, next) => {
  try {
    // Extract and clean the token
    const token = (await req.header("Authorization")) ? req.header("Authorization").replace("Bearer ", "") : "";

    if (!token) {
      return next(); // No token, proceed as public request
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return responseHelper.error(res, INVALID_TOKEN, UNAUTHORIZED);
    }

    // Fetch the user from the database
    const userInDb = await fetchUser({ user_id: decoded.tokenObject.user_id });
    if (isEmpty(userInDb)) {
      return responseHelper.error(res, USER_NOTFOUND, NOT_FOUND);
    }

    // Attach user and token to the request object
    req.user = userInDb;
    req.token = token;

    next(); // Proceed to the next middleware or route
  } catch (err) {
    return responseHelper.error(res, err.message, UNAUTHORIZED);
  }
};

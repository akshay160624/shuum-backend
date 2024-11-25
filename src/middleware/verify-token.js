import jwt from "jsonwebtoken";
import * as responseHelper from "../services/helpers/response-helper.js";
import { TOKEN_NOTFOUND, UNAUTHORIZED_ACCESS, USER_NOTFOUND } from "../services/helpers/response-message.js";
import { NOT_FOUND, UNAUTHORIZED } from "../services/helpers/status-code.js";
import { fetchOneFromDb } from "../services/mongodb.js";
import { USER_TABLE } from "../services/helpers/db-tables.js";
import lodash from "lodash";
const { isEmpty } = lodash;

// JWT middleware
export const verifyUserAuthToken = async (req, res, next) => {
  if (!req.header("Authorization")) {
    return responseHelper.error(res, TOKEN_NOTFOUND, NOT_FOUND);
  } else {
    try {
      const token = req.header("Authorization").replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded) {
        return responseHelper.error(res, TOKEN_NOTFOUND, NOT_FOUND);
      } else {
        const userInDb = await fetchOneFromDb(USER_TABLE, {
          user_id: decoded.tokenObject.user_id,
        });
        if (isEmpty(userInDb)) {
          return responseHelper.error(res, USER_NOTFOUND, NOT_FOUND);
        } else {
          req.user = userInDb;
          req.token = token;
          next();
        }
      }
    } catch (err) {
      return responseHelper.error(res, err.message, UNAUTHORIZED);
    }
  }
};

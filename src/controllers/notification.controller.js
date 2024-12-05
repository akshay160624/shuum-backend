import * as responseHelper from "../services/helpers/response-helper.js";
import { BAD_REQUEST, ERROR, NOT_FOUND, SUCCESS } from "../services/helpers/status-code.js";
import { SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
import { aggregateFromDb, fetchOneFromDb, insertOneToDb, updateManyToDb, updateOneToDb } from "../services/mongodb.js";
import { v4 as uuidv4 } from "uuid";
import { INTRODUCTION_TABLE, NOTIFICATION_TABLE } from "../services/helpers/db-tables.js";
import lodash from "lodash";
import { NOTIFICATION_STATUS, NOTIFICATION_TYPES, NotificationTypes, NotificationStatus, timestamp } from "../services/helpers/constants.js";
import { sendNotificationRequestValidate, updateNotificationRequestValidate } from "../services/validations/notification.validations.js";
import { fetchUser } from "../services/db.services.js";
const { INTRODUCTION_REQUEST } = NotificationTypes;
const { READ, UNREAD } = NotificationStatus;
const { isEmpty } = lodash;

export const addNotification = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await sendNotificationRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    let { to_user_id: toUserId = "", notification_type: notificationType = "", title = "", description = "", redirection_url: redirectionUrl = "", object_id: objectId = "" } = req.body;
    const { user } = req;

    notificationType = notificationType?.toUpperCase().trim() || "";
    if (!NOTIFICATION_TYPES.includes(notificationType)) {
      return responseHelper.error(res, "Invalid notification type value", BAD_REQUEST);
    }

    if (notificationType === INTRODUCTION_REQUEST && isEmpty(objectId)) {
      return responseHelper.error(res, "object_id is required", BAD_REQUEST);
    } else if (!isEmpty(objectId)) {
      const introductionExists = await fetchOneFromDb(INTRODUCTION_TABLE, { introduction_id: objectId.trim() });
      if (isEmpty(introductionExists)) {
        return responseHelper.error(res, "Introduction does not exists", BAD_REQUEST);
      }
    }

    const userExist = await fetchUser({ user_id: toUserId });
    if (isEmpty(userExist)) return responseHelper.error(res, `User does not exists.`, NOT_FOUND);

    const notificationData = {
      notification_id: uuidv4(),
      from_user_id: user?.user_id || "",
      to_user_id: toUserId.trim(),
      object_id: objectId.trim(),
      notification_type: notificationType,
      title: title.trim(),
      description: description.trim(),
      redirection_url: redirectionUrl.trim(),
      status: UNREAD,
      ...timestamp,
    };

    const introductionListResult = await insertOneToDb(NOTIFICATION_TABLE, notificationData);
    if (!isEmpty(introductionListResult)) {
      return responseHelper.success(res, "Notification sent successfully", SUCCESS, { notification_id: notificationData.notification_id });
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    console.error("Error inserting notification:", err);
    return responseHelper.error(res, err?.message, ERROR);
  }
};

export const notificationList = async (req, res) => {
  try {
    let { view_all: viewAll = false, notification_type: notificationType } = req.query;
    const { user } = req;
    const userId = user?.user_id;

    let filter = userId ? { to_user_id: userId } : {};

    if (!isEmpty(notificationType)) {
      notificationType = notificationType.toUpperCase().trim();
      if (!NOTIFICATION_TYPES.includes(notificationType)) {
        return responseHelper.error(res, "Invalid notification type value", BAD_REQUEST);
      }
      filter.notification_type = notificationType;
    }

    const projection = {
      _id: 0,
      notification_id: 1,
      from_user_id: 1,
      to_user_id: 1,
      to_user_name: "$toUserDetails.name",
      object_id: 1,
      introduction_status: "$introduction.status",
      notification_type: 1,
      title: 1,
      description: 1,
      redirection_url: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    // fetch notifications query
    let query = [
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "users",
          localField: "to_user_id",
          foreignField: "user_id",
          as: "toUserDetails",
        },
      },
      {
        $unwind: {
          path: "$toUserDetails",
          preserveNullAndEmptyArrays: true, // Keep companies without members
        },
      },
      {
        $lookup: {
          from: "introduction",
          localField: "object_id",
          foreignField: "introduction_id",
          as: "introduction",
        },
      },
      {
        $unwind: {
          path: "$introduction",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      ...(viewAll ? [] : [{ $limit: 4 }]), // Conditionally add the $limit stage
      {
        $project: projection,
      },
    ];

    // fetching unread notifications count
    const unreadNotificationCountQuery = [
      {
        $match: {
          to_user_id: userId,
          status: "UNREAD",
        },
      },
      {
        $count: "count",
      },
    ];

    // fetch unread notification counts
    const unReadNotificationsCountResult = await aggregateFromDb(NOTIFICATION_TABLE, unreadNotificationCountQuery);

    // fetch notification list
    let notificationList = await aggregateFromDb(NOTIFICATION_TABLE, query);
    if (!isEmpty(notificationList)) {
      const responseData = {
        notifications: notificationList,
        unread_count: unReadNotificationsCountResult[0]?.count || 0,
        introduction_counts: notificationList.filter((notification) => notification.notification_type === INTRODUCTION_REQUEST).length || 0,
      };
      return responseHelper.success(res, "Notifications fetched successfully", SUCCESS, responseData);
    } else {
      return responseHelper.error(res, "No notifications found", NOT_FOUND);
    }
  } catch (err) {
    console.error("Error fetching notification list:", err);
    return responseHelper.error(res, err?.message, ERROR);
  }
};

export const updateNotifications = async (req, res) => {
  try {
    const { notification_id: notificationId = "", status = "", mark_all_as_read: markAllAsRead = false } = req.body;
    const { user = null } = req; //  user from token
    const userId = user?.user_id;

    if (markAllAsRead) {
      const notificationFilter = { to_user_id: userId, status: UNREAD };
      // update notifications to mark as read
      const notificationUpdateData = {
        status: READ,
        updatedAt: new Date(),
      };
      const notificationUpdated = await updateManyToDb(NOTIFICATION_TABLE, notificationFilter, notificationUpdateData);
      if (notificationUpdated) {
        return responseHelper.success(res, "Notifications updated successfully", SUCCESS);
      } else {
        return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
      }
    } else {
      // Validate request
      const isNotValid = await updateNotificationRequestValidate(req.body);
      if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

      const notificationFilter = {
        notification_id: notificationId,
      };

      // check notification exist in db
      const notificationExist = await fetchOneFromDb(NOTIFICATION_TABLE, notificationFilter);
      if (isEmpty(notificationExist)) return responseHelper.error(res, `Notification does not exists!`, BAD_REQUEST);

      const notificationUpdateData = {};
      if (!isEmpty(status)) {
        let notificationStatus = status?.toUpperCase().trim() || "";
        if (!NOTIFICATION_STATUS.includes(notificationStatus)) {
          return responseHelper.error(res, "Invalid notification status value", BAD_REQUEST);
        }
        notificationUpdateData.status = status.toUpperCase().trim();
      }

      notificationUpdateData.updatedAt = new Date();

      // update notification data
      const notificationUpdated = await updateOneToDb(NOTIFICATION_TABLE, notificationFilter, notificationUpdateData);
      if (notificationUpdated) {
        return responseHelper.success(res, "Notification update successfully", SUCCESS);
      } else {
        return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
      }
    }
  } catch (err) {
    console.error("Error updating notification:", err);
    return responseHelper.error(res, err?.message, ERROR);
  }
};

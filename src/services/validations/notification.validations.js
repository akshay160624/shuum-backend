import Joi from "joi";

export const sendNotificationRequestValidate = async (req, res) => {
  const schema = Joi.object({
    // from_user_id: Joi.string().required(),
    to_user_id: Joi.string().required(),
    notification_type: Joi.string().required(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

export const updateNotificationRequestValidate = async (req, res) => {
  const schema = Joi.object({
    notification_id: Joi.string().required(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};
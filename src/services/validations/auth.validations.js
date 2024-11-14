import Joi from "joi";

export const registerUserRequestValidate = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().required().email(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

export const verifyOtpRequestValidate = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().required().email(),
    otp: Joi.number().required(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

export const getOtpRequestValidate = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().required().email(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

export const verifyUpdateUserInfoRequestValidate = async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required().messages({
      "string.empty": "name is required",
      "any.required": "name is required",
    }),
    role: Joi.string().required().messages({
      "string.empty": "role is required",
      "any.required": "role is required",
    }),
    linkedin: Joi.string().uri().required().messages({
      "string.empty": "linkedin profile is required",
      "any.required": "linkedin profile is required",
      "string.uri": "linkedin profile must be a valid URL",
    }),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

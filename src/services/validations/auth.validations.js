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

export const passwordLoginRequestValidate = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().required(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

export const updateProfileRequestValidate = async (req, res) => {
  const schema = Joi.object({
    company_id: Joi.string().required(),
    role: Joi.string().required(),
    about_me: Joi.string().required(),
    looking_for: Joi.string().required(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};
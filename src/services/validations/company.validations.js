import Joi from "joi";

export const companyInsertRequestValidate = async (req, res) => {
  const schema = Joi.object({
    company_name: Joi.string().required(),
    email: Joi.string().required().email(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

export const companyUpdateRequestValidate = async (req, res) => {
  const schema = Joi.object({
    company_id: Joi.string().required(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

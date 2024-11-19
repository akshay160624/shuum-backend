import Joi from "joi";

export const companyMemberInsertRequestValidate = async (req, res) => {
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

export const updateCompanyMemberRequestValidate = async (req, res) => {
  const schema = Joi.object({
    company_member_id: Joi.string().required()
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

import Joi from "joi";

export const companyInsertRequestValidate = async (req, res) => {
  const schema = Joi.object({
    company_name: Joi.string().required(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

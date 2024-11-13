import Joi from "joi";

export const registerUserValidate = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().required().email(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

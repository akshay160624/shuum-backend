import Joi from "joi";

export const requestIntroductionRequestValidate = async (req, res) => {
  const schema = Joi.object({
    introduction_type: Joi.string().valid("GENERAL", "TARGET").required(), // Restricting introduction_type to "GENERAL" or "TARGET"

    // Conditional validation for `value_offer` based on `introduction_type`
    value_offer: Joi.string().when("introduction_type", {
      is: "GENERAL", // When `introduction_type` is "GENERAL"
      then: Joi.required(), // Make `value_offer` required
      otherwise: Joi.optional(), // Optional otherwise
    }),

    // Conditional validation for `company_id` based on `introduction_type`
    company_id: Joi.string().when("introduction_type", {
      is: "TARGET", // When `introduction_type` is "TARGET"
      then: Joi.when("target_type", {
        is: "COMPANY",
        then: Joi.required(), // Required if `target_type` is "COMPANY"
        otherwise: Joi.optional(), // Optional otherwise
      }),
      otherwise: Joi.optional(),
    }),

    individual_id: Joi.string().when("introduction_type", {
      is: "TARGET", // When `introduction_type` is "TARGET"
      then: Joi.when("target_type", {
        is: "INDIVIDUAL", // When `target_type` is "INDIVIDUAL"
        then: Joi.required(), // Required if `target_type` is "INDIVIDUAL"
        otherwise: Joi.optional(), // Optional otherwise
      }),
      otherwise: Joi.optional(),
    }),

    // Conditional validation for `target_type` based on `introduction_type`
    target_type: Joi.string()
      .valid("COMPANY", "INDIVIDUAL") // Restricting target_type to "COMPANY" or "INDIVIDUAL"
      .when("introduction_type", {
        is: "TARGET", // When `introduction_type` is "TARGET"
        then: Joi.required(), // Make `target_type` required
        otherwise: Joi.forbidden(), // Disallow `target_type` otherwise
      }),

    purpose: Joi.string().required(),
    introduction_medium: Joi.string().required().email(),
    elaborate_purpose: Joi.string().required(),
  }).unknown(true); // Allow unknown fields in the request

  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

export const updateIntroductionRequestValidate = async (req, res) => {
  const schema = Joi.object({
    introduction_id: Joi.string().required(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

export const introductionListRequestValidate = async (req, res) => {
  const schema = Joi.object({
    status: Joi.string().optional(),
  }).unknown(true);
  const { error } = schema.validate(req);
  if (error) {
    return error;
  }
  return null;
};

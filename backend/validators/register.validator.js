const Joi = require("joi");

const step1Schema = Joi.object({
  full_name: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(72).required(),
});

const step2Schema = Joi.object({
  unit_system: Joi.string().valid("metric", "imperial").required(),
  age: Joi.number().integer().min(10).max(120).required(),
  height: Joi.number().positive().required(),
  weight: Joi.number().positive().required(),
});

const step3Schema = Joi.object({
  activity_level: Joi.string().valid("sedentary","lightly_active","moderately_active","very_active","athlete").required(),
});

module.exports = { step1Schema, step2Schema, step3Schema };

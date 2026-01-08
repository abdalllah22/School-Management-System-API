const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  role: Joi.string().valid('superadmin', 'school_admin').required(),
  schoolId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).when('role', {
    is: 'school_admin',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .invalid(Joi.ref('currentPassword'))
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50),
  lastName: Joi.string().trim().min(2).max(50)
}).min(1);

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema
};

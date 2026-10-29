// Validates req.body for the /api/auth routes.
const { userSchema } = require("../models/user.model");
const validateFields = require("../utils/validateFields");

// Register needs every field in the schema, including the password.
function validateRegister(req, res, next) {
  const { data, errors } = validateFields(userSchema, req.body);

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  req.validatedBody = data;
  next();
}

module.exports = { validateRegister };

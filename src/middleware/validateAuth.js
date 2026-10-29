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

// Login only needs email + password — no length or format rules, just non-empty strings.
function validateLogin(req, res, next) {
  const { email, password } = req.body ?? {};
  const errors = [];

  if (!email || typeof email !== "string" || email.trim() === "") {
    errors.push("email is required");
  }
  if (!password || typeof password !== "string" || password === "") {
    errors.push("password is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  // Attach normalised values so the controller doesn't repeat trim logic.
  req.validatedBody = { email: email.trim(), password };
  next();
}

module.exports = { validateRegister, validateLogin };

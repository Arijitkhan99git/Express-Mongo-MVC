// Validates req.body for the /api/users routes.
// On success, the cleaned data is saved in req.validatedBody for the controller.
const { userSchema } = require("../models/user.model");
const validateFields = require("../utils/validateFields");

// Fields a client may send to /api/users. The password is only handled by /api/auth.
const PROFILE_FIELDS = Object.keys(userSchema).filter((field) => !userSchema[field].secret);

// Used by POST and PUT: every profile field is required.
function validateUser(req, res, next) {
  const { data, errors } = validateFields(userSchema, req.body, { fields: PROFILE_FIELDS });

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  req.validatedBody = data;
  next();
}

// Used by PATCH: send any of the profile fields, but at least one.
function validateUserPartial(req, res, next) {
  const { data, errors } = validateFields(userSchema, req.body, {
    partial: true,
    fields: PROFILE_FIELDS,
  });

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({
      message: `Provide at least one of: ${PROFILE_FIELDS.join(", ")}`,
    });
  }

  req.validatedBody = data;
  next();
}

module.exports = { validateUser, validateUserPartial };

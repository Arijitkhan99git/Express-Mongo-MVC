// Checks a request body against a schema and returns the cleaned data plus a list of errors.
//
// options.partial = false: every required field must be present (POST, PUT, register)
// options.partial = true:  fields are optional, but the ones sent must be valid (PATCH)
// options.fields:          which schema fields to look at (defaults to all of them)
function validateFields(schema, body, { partial = false, fields = Object.keys(schema) } = {}) {
  const data = {};
  const errors = [];

  for (const field of fields) {
    const rules = schema[field];
    let value = body?.[field];

    if (value === undefined) {
      if (rules.required && !partial) {
        errors.push(`${field} is required`);
      }
      continue;
    }

    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${field} must be a non-empty string`);
      continue;
    }

    // Passwords are not trimmed: spaces can be part of a password.
    if (rules.trim !== false) value = value.trim();
    if (rules.lowercase) value = value.toLowerCase();

    if (rules.minLength !== undefined && value.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
      continue;
    }

    // bcrypt only reads the first 72 BYTES, so longer passwords are rejected, not silently cut.
    if (rules.maxBytes !== undefined && Buffer.byteLength(value, "utf8") > rules.maxBytes) {
      errors.push(`${field} is too long (max ${rules.maxBytes} bytes)`);
      continue;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.patternMessage || `${field} is invalid`);
      continue;
    }

    data[field] = value;
  }

  return { data, errors };
}

module.exports = validateFields;

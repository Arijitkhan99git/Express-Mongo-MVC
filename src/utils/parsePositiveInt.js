// Turns a query value like "2" into the number 2.
// Returns the fallback if the value is missing, or null if it is invalid.
function parsePositiveInt(value, fallback) {
  if (value === undefined) return fallback;

  // Must be a string of digits, no leading zero, no sign, at most 9 digits.
  if (typeof value !== "string" || !/^[1-9]\d{0,8}$/.test(value)) {
    return null;
  }

  return parseInt(value, 10);
}

module.exports = parsePositiveInt;

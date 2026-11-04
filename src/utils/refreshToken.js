// Refresh token helpers.
// A refresh token is a random string, not a JWT. The server keeps only its SHA-256 hash,
// so a leaked database does not leak usable tokens.
const crypto = require("crypto");

const EXPIRES_IN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 7;

// 48 random bytes -> 96 hex characters. Cannot be guessed.
function generateRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

// Fast hash is fine here (unlike passwords): the token is already long and random.
function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// When a token created now should stop working.
function refreshTokenExpiry() {
  return new Date(Date.now() + EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
}

module.exports = { generateRefreshToken, hashRefreshToken, refreshTokenExpiry };

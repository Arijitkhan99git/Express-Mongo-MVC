// JWT helpers: sign a token and verify one.
// Nothing here knows about req / res — that stays in middleware and controllers.
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

/**
 * Sign a token that contains only the user's _id as "sub".
 * No email, no password — JWTs are readable by anyone who has one.
 *
 * @param {string|ObjectId} userId
 * @returns {string} signed JWT
 */
function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, SECRET, { expiresIn: EXPIRES_IN });
}

/**
 * Verify a token and return the decoded payload.
 * Throws if the signature is wrong or the token has expired.
 *
 * @param {string} token
 * @returns {{ sub: string, iat: number, exp: number }}
 */
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };


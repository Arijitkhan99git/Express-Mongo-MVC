// Model: the "refresh_tokens" collection.
// It knows MongoDB. It does not know about req / res.
//
// One document per refresh token:
//   tokenHash  SHA-256 of the token (the raw token is never stored)
//   userId     who it belongs to
//   family     id shared by every token in one login session (rotation chain)
//   revokedAt  set when the token has been used (rotated); null while still usable
//   expiresAt  MongoDB deletes the document automatically after this (TTL index)
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} = require("../utils/refreshToken");

const tokensCollection = () => getDB().collection("refresh_tokens");

// Called once at startup.
async function createIndexes() {
  const tokens = tokensCollection();
  await tokens.createIndex({ tokenHash: 1 }, { unique: true });
  await tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-cleanup
  await tokens.createIndex({ userId: 1 });
  await tokens.createIndex({ family: 1 });
}

// Saves a new token and returns the RAW value (the only time it exists in plain text).
// Pass an existing family when rotating; omit it to start a new login session.
async function createRefreshToken(userId, family = new ObjectId().toString()) {
  const token = generateRefreshToken();

  await tokensCollection().insertOne({
    tokenHash: hashRefreshToken(token),
    userId: new ObjectId(userId),
    family,
    revokedAt: null,
    createdAt: new Date(),
    expiresAt: refreshTokenExpiry(),
  });

  return token;
}

// Uses up a token (one-time use). Returns:
//   { status: "ok", userId, family }  token was valid and is now spent
//   { status: "reused" }              token was already spent -> likely stolen, whole session killed
//   { status: "invalid" }             unknown, expired or revoked token
async function rotateRefreshToken(token) {
  const tokenHash = hashRefreshToken(token);
  const now = new Date();

  // One atomic step: only one request can ever claim a given token.
  const used = await tokensCollection().findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } }
  );

  if (used) return { status: "ok", userId: used.userId, family: used.family };

  // Not usable. If it exists and was already spent, someone is replaying an old token.
  const existing = await tokensCollection().findOne({ tokenHash });
  if (existing && existing.revokedAt) {
    await deleteFamily(existing.family);
    return { status: "reused" };
  }

  return { status: "invalid" };
}

// Ends one login session (every token in the chain).
function deleteFamily(family) {
  return tokensCollection().deleteMany({ family });
}

// Logout: finds the session the token belongs to and ends it. Unknown tokens are ignored.
async function deleteFamilyByToken(token) {
  const existing = await tokensCollection().findOne({
    tokenHash: hashRefreshToken(token),
  });
  if (existing) await deleteFamily(existing.family);
}

// Logout everywhere / password change / account deletion.
function deleteAllForUser(userId) {
  return tokensCollection().deleteMany({ userId: new ObjectId(userId) });
}

module.exports = {
  createIndexes,
  createRefreshToken,
  rotateRefreshToken,
  deleteFamily,
  deleteFamilyByToken,
  deleteAllForUser,
};

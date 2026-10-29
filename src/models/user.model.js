// Model: describes what a user looks like (schema) and talks to the "users" collection.
// It knows MongoDB. It does not know about req / res.
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const escapeRegex = require("../utils/escapeRegex");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Our simple "schema": which fields a user has and the rules for each.
// Validation middleware reads this to check request bodies.
const userSchema = {
  first_name: { required: true },
  last_name: { required: true },
  email: {
    required: true,
    lowercase: true,
    pattern: EMAIL_REGEX,
    patternMessage: "Invalid email format",
  },
  password: {
    required: true,
    secret: true, // never accepted by /api/users and never sent back to clients
    trim: false, // spaces are allowed inside a password
    minLength: 8,
    maxBytes: 72, // bcrypt limit
  },
};

// Add this to a query to leave the password hash out of the result.
const HIDE_PASSWORD = { password: 0 };

const usersCollection = () => getDB().collection("users");

// Called once at startup.
async function createIndexes() {
  await usersCollection().createIndex({ email: 1 }, { unique: true });
}

// "ari kh" -> every word must match first_name OR last_name (case-insensitive, partial).
function buildNameFilter(name) {
  if (!name) return {};

  const terms = name.split(/\s+/).filter(Boolean);

  return {
    $and: terms.map((term) => {
      const regex = new RegExp(escapeRegex(term), "i");
      return { $or: [{ first_name: regex }, { last_name: regex }] };
    }),
  };
}

// Saves the user and returns it WITHOUT the password hash.
async function createUser(user) {
  const result = await usersCollection().insertOne(user);
  const { password, ...safeUser } = user;
  return { _id: result.insertedId, ...safeUser };
}

// The password hash is left out unless includePassword is true
// (login and PUT need it; nothing that goes to a client should).
function findUserById(id, includePassword = false) {
  return usersCollection().findOne(
    { _id: new ObjectId(id) },
    includePassword ? {} : { projection: HIDE_PASSWORD }
  );
}

function findUsers(filter, skip, limit) {
  return usersCollection()
    .find(filter, { projection: HIDE_PASSWORD })
    .sort({ createdAt: -1, _id: -1 }) // _id breaks ties so pages stay stable
    .skip(skip)
    .limit(limit)
    .toArray();
}

function countUsers(filter) {
  return usersCollection().countDocuments(filter);
}

// Driver v6+ returns the document directly, or null if nothing matched.
function updateUserById(id, updates) {
  return usersCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updates },
    { returnDocument: "after", projection: HIDE_PASSWORD }
  );
}

function replaceUserById(id, user) {
  return usersCollection().findOneAndReplace({ _id: new ObjectId(id) }, user, {
    returnDocument: "after",
    projection: HIDE_PASSWORD,
  });
}

// Returns true if a user was deleted, false if none matched.
async function deleteUserById(id) {
  const result = await usersCollection().deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

module.exports = {
  userSchema,
  createIndexes,
  buildNameFilter,
  createUser,
  findUserById,
  findUsers,
  countUsers,
  updateUserById,
  replaceUserById,
  deleteUserById,
};

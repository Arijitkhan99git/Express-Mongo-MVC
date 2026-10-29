// Password hashing with bcrypt.
// We never store the plain password. We store a hash that cannot be reversed.
const bcrypt = require("bcrypt");

// Cost factor: each +1 makes hashing twice as slow (and brute force twice as hard).
// 12 is a common choice today.
const SALT_ROUNDS = 12;

// "mypassword" -> "$2b$12$Xk3...": a different hash every time, because bcrypt adds a random salt.
function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

module.exports = { hashPassword };

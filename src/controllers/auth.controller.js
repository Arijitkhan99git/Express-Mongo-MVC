// Auth controller: registration (login comes in the next step).
const UserModel = require("../models/user.model");
const { hashPassword } = require("../utils/password");

// POST /api/auth/register
async function register(req, res) {
  try {
    const { password, ...profile } = req.validatedBody;

    // Hash the password. Only the hash is saved.
    const hashedPassword = await hashPassword(password);

    const newUser = {
      ...profile,
      password: hashedPassword,
      createdAt: new Date(),
    };

    // The model returns the new user without the password.
    const user = await UserModel.createUser(newUser);

    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    // Duplicate key error from the unique email index.
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    console.error("Error registering user:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
}

module.exports = { register };

// Auth controller: register + login.
const bcrypt = require("bcrypt");
const UserModel = require("../models/user.model");
const { hashPassword } = require("../utils/password");
const { signToken } = require("../utils/token");

// Shared shape for both register and login responses.
function authResponse(message, user, res, statusCode = 200) {
  const accessToken = signToken(user._id);

  return res.status(statusCode).json({
    message,
    user: {
      _id: user._id,
      first_name: user.first_name,
      email: user.email,
    },
    accessToken,
  });
}

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

    return authResponse("User registered successfully", user, res, 201);
  } catch (error) {
    // Duplicate key error from the unique email index.
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    console.error("Error registering user:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.validatedBody;

    // Fetch the user WITH the hash — needed for bcrypt.compare.
    const user = await UserModel.findUserByEmail(email, true);

    // Same 401 message whether the email is unknown or the password is wrong.
    // Attackers can't learn which emails exist.
    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid email or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Invalid email or password" });
    }

    return authResponse("Login successful", user, res);
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Failed to login" });
  }
}

// GET /api/auth/profile  (protected — requireAuth runs before this)
async function profile(req, res) {
  // req.user is set by requireAuth; password is already excluded.
  res.json({ user: req.user });
}

module.exports = { register, login, profile };

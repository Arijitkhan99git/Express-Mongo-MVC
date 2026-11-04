// Auth controller: register, login, profile, change password, refresh, logout.
const bcrypt = require("bcrypt");
const UserModel = require("../models/user.model");
const RefreshTokenModel = require("../models/refreshToken.model");
const { hashPassword } = require("../utils/password");
const { signToken } = require("../utils/token");

// Shared shape for register, login and change-password responses.
// Starts a NEW login session: a short-lived access token + a long-lived refresh token.
async function authResponse(message, user, res, statusCode = 200) {
  const accessToken = signToken(user._id);
  const refreshToken = await RefreshTokenModel.createRefreshToken(user._id);

  return res.status(statusCode).json({
    message,
    user: {
      _id: user._id,
      first_name: user.first_name,
      email: user.email,
    },
    accessToken,
    refreshToken,
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

    return await authResponse("User registered successfully", user, res, 201);
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

    return await authResponse("Login successful", user, res);
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

// PATCH /api/auth/change-password  (protected — requireAuth runs before this)
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.validatedBody;

    // req.user has no hash, so fetch it again WITH the hash for bcrypt.compare.
    const user = await UserModel.findUserById(req.user._id, true);

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "New password must be different from the current password" });
    }

    const hashedPassword = await hashPassword(newPassword);
    await UserModel.updateUserById(req.user._id, { password: hashedPassword });

    // Sign out every device, then give THIS device a fresh session so the user isn't kicked out.
    await RefreshTokenModel.deleteAllForUser(req.user._id);
    return await authResponse("Password updated successfully", req.user, res);
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
}

// POST /api/auth/refresh  (public — the access token has usually expired by now)
// Swaps a valid refresh token for a new access token + a new refresh token (rotation).
async function refresh(req, res) {
  try {
    const result = await RefreshTokenModel.rotateRefreshToken(
      req.validatedBody.refreshToken
    );

    if (result.status === "reused") {
      return res
        .status(401)
        .json({ message: "Refresh token reuse detected, please log in again" });
    }
    if (result.status !== "ok") {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    // The account may have been deleted since the token was issued.
    const user = await UserModel.findUserById(result.userId);
    
    if (!user) {
      await RefreshTokenModel.deleteFamily(result.family);
      return res.status(401).json({ message: "User no longer exists" });
    }

    // Same family: the new token continues the same login session.
    const refreshToken = await RefreshTokenModel.createRefreshToken(
      user._id,
      result.family
    );

    return res.json({
      message: "Token refreshed",
      accessToken: signToken(user._id),
      refreshToken,
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ message: "Failed to refresh token" });
  }
}

// POST /api/auth/logout  (public — works even if the access token already expired)
// Ends this login session. Always answers 200 so it can be safely retried.
async function logout(req, res) {
  try {
    await RefreshTokenModel.deleteFamilyByToken(req.validatedBody.refreshToken);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
}

// POST /api/auth/logout-all  (protected)
// Ends every login session of the signed-in user.
async function logoutAll(req, res) {
  try {
    await RefreshTokenModel.deleteAllForUser(req.user._id);
    res.json({ message: "Logged out from all devices" });
  } catch (error) {
    console.error("Error logging out everywhere:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
}

module.exports = {
  register,
  login,
  profile,
  changePassword,
  refresh,
  logout,
  logoutAll,
};

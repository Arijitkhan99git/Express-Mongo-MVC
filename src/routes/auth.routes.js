// Mounted at /api/auth in index.js, so "/register" below means /api/auth/register.
const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("../controllers/auth.controller");
const {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateRefreshToken,
} = require("../middleware/validateAuth");
const requireAuth = require("../middleware/auth.middleware");

const router = express.Router();

// Brute-force protection: max 10 login attempts per IP per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" },
});

// Stops someone with a stolen token from guessing the current password.
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password change attempts, please try again later" },
});

// Refresh is called automatically by clients, so the limit is higher than for login.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many refresh attempts, please try again later" },
});

// --- Public routes ---
router.post("/register", validateRegister, controller.register);
router.post("/login", loginLimiter, validateLogin, controller.login);

// POST /api/auth/refresh — body: { refreshToken } -> new accessToken + refreshToken
router.post("/refresh", refreshLimiter, validateRefreshToken, controller.refresh);

// POST /api/auth/logout — body: { refreshToken } -> ends that login session
router.post("/logout", validateRefreshToken, controller.logout);

// --- Protected routes ---
// GET /api/auth/profile  — returns the currently signed-in user
router.get("/profile", requireAuth, controller.profile);

// POST /api/auth/logout-all — ends every login session of the signed-in user
router.post("/logout-all", requireAuth, controller.logoutAll);

// PATCH /api/auth/change-password — body: { currentPassword, newPassword }
router.patch(
  "/change-password",
  requireAuth,
  passwordLimiter,
  validateChangePassword,
  controller.changePassword
);

module.exports = router;

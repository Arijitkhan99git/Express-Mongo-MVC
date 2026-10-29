// Mounted at /api/auth in index.js, so "/register" below means /api/auth/register.
const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("../controllers/auth.controller");
const { validateRegister, validateLogin } = require("../middleware/validateAuth");
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

// --- Public routes ---
router.post("/register", validateRegister, controller.register);
router.post("/login", loginLimiter, validateLogin, controller.login);

// --- Protected routes ---
// GET /api/auth/profile  — returns the currently signed-in user
router.get("/profile", requireAuth, controller.profile);

module.exports = router;

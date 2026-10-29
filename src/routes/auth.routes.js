// Mounted at /api/auth in index.js, so "/register" below means /api/auth/register.
const express = require("express");
const controller = require("../controllers/auth.controller");
const { validateRegister } = require("../middleware/validateAuth");

const router = express.Router();

router.post("/register", validateRegister, controller.register);

module.exports = router;

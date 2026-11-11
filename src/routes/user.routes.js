// Routes: URL + method -> middleware -> controller function.
// Mounted at /api/users in index.js, so "/" below means /api/users.
// requireAuth is applied at the app level in index.js, so every route here
// is automatically protected — no need to repeat it on individual routes.
const express = require("express");
const controller = require("../controllers/user.controller");
const validateObjectId = require("../middleware/validateObjectId");
const { validateUser, validateUserPartial } = require("../middleware/validateUser");

const router = express.Router();

router.get("/", controller.getUsers);

// POST /api/users is left here for reference.
// It is commented out because registration is now handled by POST /api/auth/register.
// router.post("/", validateUser, controller.createUser);

router.get("/:id", validateObjectId("user"), controller.getUserById);
router.put("/:id", validateObjectId("user"), validateUser, controller.replaceUser);
router.patch("/:id", validateObjectId("user"), validateUserPartial, controller.updateUser);
router.delete("/:id", validateObjectId("user"), controller.deleteUser);

module.exports = router;

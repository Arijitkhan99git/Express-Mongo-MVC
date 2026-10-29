// Routes: URL + method -> middleware -> controller function.
// Mounted at /api/users in index.js, so "/" below means /api/users.
const express = require("express");
const controller = require("../controllers/user.controller");
const validateObjectId = require("../middleware/validateObjectId");
const { validateUser, validateUserPartial } = require("../middleware/validateUser");

const router = express.Router();

router.get("/", controller.getUsers);
router.post("/", validateUser, controller.createUser);

router.get("/:id", validateObjectId, controller.getUserById);
router.put("/:id", validateObjectId, validateUser, controller.replaceUser);
router.patch("/:id", validateObjectId, validateUserPartial, controller.updateUser);
router.delete("/:id", validateObjectId, controller.deleteUser);

module.exports = router;

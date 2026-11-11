// Validates req.body for POST /api/posts.
// On success, the cleaned data is saved in req.validatedBody for the controller.
const { postSchema } = require("../models/posts.model");
const validateFields = require("../utils/validateFields");

function validatePost(req, res, next) {
    const { data, errors } = validateFields(postSchema, req.body);

    if (errors.length > 0) {
        return res.status(400).json({ message: "Validation failed", errors });
    }

    req.validatedBody = data;
    next();
}

module.exports = {
    validatePost
}

const express = require('express');
const validateObjectId = require("../middleware/validateObjectId");
const controller = require("../controllers/post.controller")
const {validatePost} = require('../middleware/validatePost');


const router = express.Router();


router.post("/",validatePost, controller.createPost)
router.get("/", controller.getPosts);


module.exports = router;
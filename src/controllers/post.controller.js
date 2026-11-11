const parsePositiveInt = require("../utils/parsePositiveInt");
const PostModel = require('../models/posts.model');

// Pagination defaults.
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;


//POST /api/posts
async function createPost(req, res){
    try{

     const newPost = {
        ...req.validatedBody,
        userId: req.user._id,
        createdAt: new Date(),
     };

     const result = await PostModel.createPost(newPost);

     res.status(201).json({
        message: "Post created successfully",
        post: { _id: result.insertedId, ...newPost },
    });

    }
    catch(error){
          // Duplicate key error from the unique title index.
    if (error.code === 11000) {
      return res.status(409).json({ message: "You already have a post with this title." });
    }

        console.error("Error creating post:", error);
        res.status(500).json({ message: "Failed to create post" });
    }
}

//GET /api/posts
async function getPosts(req, res){
    try{
    const {search} = req.query;

    const page = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);

    if(page === null || requestedLimit === null){
        return res.status(400).json({
            message: "page and limit must be positive whole numbers",
        })
    }

    const limit = Math.min(requestedLimit, MAX_LIMIT);

    let searchText;

    
    if(search!==undefined){
        if(typeof search!="string"){
            return res.status(400).json({message:"search must be a string"});
        }

        searchText = search.trim();

        if(!searchText){
            return res.status(400).json({message:"search cannot be empty"});
        }
    } 

    const filter = PostModel.buildSearchFilter(searchText);

    const [posts, total] = await Promise.all([
        PostModel.findPosts(filter, (page-1)*limit, limit, searchText !== undefined),
        PostModel.countPosts(filter)
    ])

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
        data: posts,
        pagination:{
            page, 
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page >1
        }
    })
    }
    catch(error){
        console.error("Error fetching posts:", error);
        res.status(500).json({message: "Failed to fetch posts"});
    }
}


module.exports = {
    getPosts,
    createPost
}
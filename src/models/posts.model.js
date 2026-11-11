const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// What a client may send when creating a post. Validation middleware reads this.
const postSchema = {
    title: { required: true, minLength: 3, maxLength: 150 },
    details: { required: true, minLength: 10, maxLength: 5000 },
};

const postsCollections = ()=> getDB().collection("posts");

// Called once at startup.
async function createIndexes(){
    const posts = postsCollections();

    // One user can't reuse a title; different users can.
    await posts.createIndex({ userId: 1, title: 1 }, { unique: true });

    // Matches the GET sort (newest first), so MongoDB reads posts in 
    // index order instead of sorting them.
    await posts.createIndex({ createdAt: -1, _id: -1 });

    // Text search over title and details. A collection can have only ONE text index.
    // A word found in the title counts 10x more than one found in the details.
    await posts.createIndex(
        { title: "text", details: "text" },
        { weights: { title: 10, details: 1 }, name: "post_text_search" }
    );
}


// "node api" -> posts whose title or details contain "node" OR "api" (word-based, stemmed, case-insensitive).
// Needs the text index from createIndexes().
function buildSearchFilter(text) {
  if (!text) return {};

  return { $text: { $search: text } };
}

async function createPost(post){
    const result = await postsCollections().insertOne(post);
    return result;
}

// When searching, best matches come first (then newest). Otherwise newest first.
function findPosts(filter, skip, limit, ranked = false){
    const cursor = ranked
        ? postsCollections().find(filter, { projection: { score: { $meta: "textScore" } } })
            .sort({ score: { $meta: "textScore" }, createdAt: -1, _id: -1 })
        : postsCollections().find(filter).sort({ createdAt: -1, _id: -1 });

    return cursor.skip(skip).limit(limit).toArray();
}

function findPostById(id){
    return postsCollections().findOne({_id: new ObjectId(id)})
}


function countPosts(filter){
    return postsCollections().countDocuments(filter);
}


module.exports = {
    postSchema,
    createIndexes,
    buildSearchFilter,
    createPost,
    findPosts,
    countPosts,
    findPostById
}
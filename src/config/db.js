// MongoDB connection. Other files call getDB() to use the database.

// MongoClient is the official driver class used to connect to MongoDB.
const { MongoClient } = require("mongodb");

// This configures the client with your Atlas connection string.
const client = new MongoClient(process.env.MONGODB_URI);

let db;

async function connectDB() {
  // This opens the connection to Atlas.
  await client.connect();

  // The ping command checks whether the server responds.
  await client.db("admin").command({ ping: 1 });

  console.log("MongoDB Atlas connected successfully!");

  // This tells the driver which database you want to use.
  db = client.db(process.env.MONGODB_DB);
}

function getDB() {
  if (!db) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return db;
}

module.exports = { connectDB, getDB };

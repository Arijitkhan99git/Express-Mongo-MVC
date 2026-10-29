// Entry point: sets up Express, connects to MongoDB, starts the server.
require("dotenv").config(); // loads .env (must run before anything reads process.env)

const express = require("express");
const { connectDB } = require("./src/config/db");
const UserModel = require("./src/models/user.model");
const authRoutes = require("./src/routes/auth.routes");
const userRoutes = require("./src/routes/user.routes");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Express API is running!");
});

// Every route inside auth.routes.js starts with /api/auth
app.use("/api/auth", authRoutes);

// Every route inside user.routes.js starts with /api/users
app.use("/api/users", userRoutes);

// Must be after all routes.
app.use(errorHandler);

async function startServer() {
  try {
    await connectDB();

    // Unique index so the same email can't be inserted twice.
    await UserModel.createIndexes();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

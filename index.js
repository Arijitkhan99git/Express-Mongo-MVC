// Entry point: sets up Express, connects to MongoDB, starts the server.
require("dotenv").config(); // loads .env (must run before anything reads process.env)

const express = require("express");
const helmet = require("helmet");
const { connectDB } = require("./src/config/db");
const UserModel = require("./src/models/user.model");
const authRoutes = require("./src/routes/auth.routes");
const userRoutes = require("./src/routes/user.routes");
const corsMiddleware = require("./src/middleware/cors");
const requireAuth = require("./src/middleware/auth.middleware");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 8000;

// Security headers (CSP, HSTS, nosniff, frame protection, ...). Must be first so every response gets them.
// It also removes the "X-Powered-By: Express" header.
app.use(helmet());

// CORS: before the routes so browser preflight (OPTIONS) requests are answered
// before requireAuth, which would reject them (preflight carries no token).
app.use(corsMiddleware);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Express API is running!");
});

// Every route inside auth.routes.js starts with /api/auth
// These stay public (register, login) — requireAuth is applied only where needed inside.
app.use("/api/auth", authRoutes);

// Every route inside user.routes.js starts with /api/users
// requireAuth applied here covers ALL /api/users routes at once.
app.use("/api/users", requireAuth, userRoutes);

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

// CORS: decides which websites' JavaScript may read responses from this API in a browser.
//
// The allowlist comes from CORS_ORIGINS in .env (comma separated), for example:
//   CORS_ORIGINS=https://www.testbook.com,https://testbook.com,http://localhost:3000
// An origin is protocol + domain (+ port if not default): no path, no trailing slash.
//
// Not set / empty = no website may call the API from a browser (safe default).
// This does not affect Postman, curl, mobile apps or other servers: CORS is a browser rule.
const cors = require("cors");

// "https://site.com/" and " https://site.com " both become "https://site.com".
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // No Origin header = not a browser cross-origin call (curl, Postman, server-to-server).
    if (!origin) return callback(null, true);

    // Listed origin gets the CORS headers back. Any other origin gets none,
    // so the browser refuses to hand the response to that page.
    callback(null, allowedOrigins.includes(origin));
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],

  // Content-Type for JSON bodies, Authorization for the Bearer access token.
  allowedHeaders: ["Content-Type", "Authorization"],

  // Headers a frontend may read. Without this, JS cannot see the rate limit info
  // (or Retry-After on a 429) that express-rate-limit sends.
  exposedHeaders: [
    "RateLimit-Limit",
    "RateLimit-Remaining",
    "RateLimit-Reset",
    "RateLimit-Policy",
    "Retry-After",
  ],

  // Tokens travel in the Authorization header / JSON body, not cookies, so credentials stay off.
  credentials: false,

  // Browser may cache the preflight answer for 10 minutes (fewer OPTIONS requests).
  maxAge: 600,
};

module.exports = cors(corsOptions);

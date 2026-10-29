// requireAuth: protects every route it is placed in front of.
//
// Flow:
//   1. Read the Authorization: Bearer <token> header.
//   2. Verify signature + expiry.
//   3. Look up the user by sub — catches a valid token for a deleted account.
//   4. Attach req.user and call next(), or return 401.
const { verifyToken } = require("../utils/token");
const UserModel = require("../models/user.model");

async function requireAuth(req, res, next) {
  try {
    // console.log(req.headers);
    
    const authHeader = req.headers.authorization || "";

    // Header must be "Bearer <token>"
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.slice(7); // strip "Bearer "

    // Throws JsonWebTokenError or TokenExpiredError on failure
    const payload = verifyToken(token);

    // Make sure the user still exists in the database
    const user = await UserModel.findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.user = user; // available to every downstream handler
    next();
  } catch (err) {
    // jwt.verify throws for bad/expired tokens
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = requireAuth;


// Global error handler. Express knows it is an error handler because it has 4 parameters.
// Register it in index.js AFTER all routes.
function errorHandler(err, req, res, next) {
  // If a response was already started, let Express finish it.
  if (res.headersSent) {
    return next(err);
  }

  // Malformed JSON body, thrown by express.json().
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  // Anything else we did not expect.
  console.error("Unexpected error:", err);
  res.status(500).json({ message: "Internal server error" });
}

module.exports = errorHandler;

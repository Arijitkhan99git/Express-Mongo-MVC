// validateObjectId("post") returns a middleware that rejects the request with 400
// ("Invalid post id") if :id is not a valid ObjectId string.
// If it is valid, next() passes the request on to the controller.

// A valid ObjectId string is exactly 24 hex characters.
// (ObjectId.isValid alone also accepts any 12-character string, so it's too loose.)
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// label: what the id belongs to, used in the error message ("user", "post", ...).
function validateObjectId(label = "") {
  const message = label ? `Invalid ${label} id` : "Invalid id";

  return (req, res, next) => {
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ message });
    }
    next();
  };
}

module.exports = validateObjectId;

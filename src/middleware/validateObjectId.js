// Rejects the request with 400 if :id is not a valid ObjectId string.
// If it is valid, next() passes the request on to the controller.

// A valid ObjectId string is exactly 24 hex characters.
// (ObjectId.isValid alone also accepts any 12-character string, so it's too loose.)
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function validateObjectId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }
  next();
}

module.exports = validateObjectId;

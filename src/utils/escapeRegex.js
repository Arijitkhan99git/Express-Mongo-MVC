// Escapes special regex characters so user input like "a.*" is treated as plain text.
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = escapeRegex;

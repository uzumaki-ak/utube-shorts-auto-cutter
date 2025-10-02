const fs = require("fs");
const path = require("path");

function newestFileInDir(dir) {
  if (!fs.existsSync(dir)) return null;
  const items = fs.readdirSync(dir).filter((f) => /\.(mp4|mkv|mov)$/i.test(f));
  if (!items.length) return null;
  const full = items
    .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return path.join(dir, full[0].f);
}

module.exports = { newestFileInDir };

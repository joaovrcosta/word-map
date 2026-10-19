const fs = require("node:fs");
const path = require("node:path");
const { renderTokensCss } = require("./dist/index.js");

fs.writeFileSync(path.join(__dirname, "tokens.css"), renderTokensCss());

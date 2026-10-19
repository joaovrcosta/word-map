const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { dark, light, renderTokensCss } = require("./dist/index.js");

test("tokens.css é gerado a partir do tema TypeScript", () => {
  const file = fs.readFileSync(path.join(__dirname, "tokens.css"), "utf8");
  assert.equal(file, renderTokensCss());
  assert.match(file, new RegExp(`--background: ${light.background};`));
  assert.match(file, new RegExp(`--background: ${dark.background};`));
  assert.match(file, /--brand-green: #24c875;/);
});

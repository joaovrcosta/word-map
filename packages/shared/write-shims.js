const fs = require("node:fs");
const path = require("node:path");

const srcDir = path.join(__dirname, "src");
for (const file of fs.readdirSync(srcDir)) {
  if (!file.endsWith(".ts") || file === "index.ts") continue;
  const name = file.replace(/\.ts$/, "");
  fs.writeFileSync(
    path.join(__dirname, `${name}.js`),
    `module.exports = require("./dist/${name}.js");\n`
  );
  fs.writeFileSync(
    path.join(__dirname, `${name}.d.ts`),
    `export * from "./dist/${name}";\n`
  );
}

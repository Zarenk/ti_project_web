const fs = require("fs");
const path = require("path");

const brandAssets = require("../src/catalog/brandAssets.json");

const logosDir = path.join(__dirname, "..", "public");
const missing = [];

for (const [brand, logoPath] of Object.entries(brandAssets.brands)) {
  const normalizedPath = logoPath.replace(/^\//, "");
  const resolved = path.join(logosDir, normalizedPath);

  if (!fs.existsSync(resolved)) {
    missing.push(`${brand}: ${resolved}`);
  }
}

if (missing.length > 0) {
  console.error("Missing brand logos:\n" + missing.join("\n"));
  process.exit(1);
}

console.log("All brand logos are present.");

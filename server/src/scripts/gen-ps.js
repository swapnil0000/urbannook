import fs from "fs";
import path from "path";

const ROUTES_DIR = "./src/routes";
const OUTPUT = "./postman-collection.json";

const collection = {
  info: {
    name: "UrbanNook API",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [],
};

function parseRoutes(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const routes = [];

  // matches: anything.post("/path")
  const regex =
    /\w+\.?(?:Router)?\.(get|post|put|patch|delete)\s*\(\s*["'`](.*?)["'`]/gi;

  let match;
  while ((match = regex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
    });
  }

  return routes;
}

function walk(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith(".js")) {
      const routes = parseRoutes(fullPath);

      if (!routes.length) return;

      collection.item.push({
        name: file.replace(".js", ""),
        item: routes.map((r) => ({
          name: `${r.method} ${r.path}`,
          request: {
            method: r.method,
            header: [],
            url: {
              raw: `{{server-local}}${r.path}`,
              host: ["{{server-local}}"],
              path: r.path.split("/").filter(Boolean),
            },
          },
        })),
      });
    }
  });
}

walk(ROUTES_DIR);

fs.writeFileSync(OUTPUT, JSON.stringify(collection, null, 2));
console.log("✅ Postman collection generated successfully");

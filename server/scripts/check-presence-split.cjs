const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.resolve(__dirname, "../..");
const appSource = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
const htmlFiles = [
  "index.html",
  "map.html",
  "timeline.html",
  "planet-wall.html",
  "earth-letters.html",
  "submit.html",
  "about.html",
  "resident.html",
];

function extractFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  let depth = 0;
  for (let i = start; i < appSource.length; i += 1) {
    if (appSource[i] === "{") depth += 1;
    if (appSource[i] === "}") {
      depth -= 1;
      if (depth === 0) return appSource.slice(start, i + 1);
    }
  }
  throw new Error(`could not extract ${name}`);
}

const sandbox = {
  memories: [
    { id: "star-1", name: "奶盖", presence: "star", region: "月光谷", food: "瓜子", arrivedAt: "2024-01-01", saved: false },
    { id: "earth-1", name: "豆豆", presence: "earth", region: "月光谷", food: "小米", arrivedAt: "2025-01-01", saved: false },
    { id: "star-2", name: "棉花", presence: "star", region: "蜜糖丘", food: "瓜子", arrivedAt: "2023-06-01", saved: false },
  ],
  apiResidentsLoaded: true,
  normalizePresence(value) {
    return value === "earth" ? "earth" : "star";
  },
  getSeedMemories() {
    return [];
  },
};

vm.runInNewContext(
  `${extractFunction("getVisibleMemories")}\n${extractFunction("getMapResidents")}\nthis.getVisibleMemories = getVisibleMemories;\nthis.getMapResidents = getMapResidents;`,
  sandbox,
);

const starIds = sandbox.getVisibleMemories("star").map((item) => item.id);
const earthIds = sandbox.getVisibleMemories("earth").map((item) => item.id);

assert.deepStrictEqual(starIds, ["star-1", "star-2"]);
assert.deepStrictEqual(earthIds, ["earth-1"]);
assert.deepStrictEqual(
  [...sandbox.getMapResidents({ presence: "earth" }).map((item) => item.id)],
  ["earth-1"],
);
assert.deepStrictEqual(
  [...sandbox.getMapResidents({ presence: "star", region: "月光谷" }).map((item) => item.id)],
  ["star-1"],
);
assert.strictEqual(sandbox.getMapResidents(null).length, 0);

const mapSource = fs.readFileSync(path.join(root, "src/planet-map.js"), "utf8");
assert.match(mapSource, /function mountEarthPlanet\(/);
assert.match(mapSource, /presence: "earth"/);

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  assert.match(html, /href="\.\/earth-letters\.html"/, `${file} is missing earth letters nav`);
}

const wallHtml = fs.readFileSync(path.join(root, "planet-wall.html"), "utf8");
assert.doesNotMatch(wallHtml, /data-wall-presence/, "memorial galaxy still has presence filters");
assert.match(wallHtml, /已经抵达鼠星/);

const lettersHtml = fs.readFileSync(path.join(root, "earth-letters.html"), "utf8");
assert.match(lettersHtml, /data-wall-presence="earth"/);
assert.match(lettersHtml, /还在地球陪着你的鼠鼠/);
assert.doesNotMatch(lettersHtml, /data-wall-filter/, "earth letters still has region filters");
assert.doesNotMatch(lettersHtml, /月光谷/, "earth letters still mentions star regions");

const mapHtml = fs.readFileSync(path.join(root, "map.html"), "utf8");
assert.doesNotMatch(mapHtml, /data-map-world/, "planet map still has earth/star switch");
assert.match(mapHtml, /id="three-earth-stage"/);
assert.match(mapHtml, /还在人间的鼠鼠/);

console.log("presence split checks passed");

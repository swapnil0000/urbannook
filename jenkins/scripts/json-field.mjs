// Prints one field of an admin-API JSON response ({ data: { ... } }) read from
// stdin; prints an empty line if it's missing or the input isn't JSON.
// Usage: curl ... | node jenkins/scripts/json-field.mjs folder
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  try {
    const data = JSON.parse(s).data || {};
    console.log(data[process.argv[2]] ?? "");
  } catch {
    console.log("");
  }
});

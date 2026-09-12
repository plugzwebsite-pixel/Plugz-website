#!/usr/bin/env node
// Focused unit checks for client-side money parsing. The browser imports the
// TypeScript source directly; this transpiles that same file rather than
// maintaining a second copy of its rules in the test.
const fs = require("fs");
const path = require("path");

const APP = process.env.PLUGGZ_APP || path.resolve(__dirname, "..");
const ts = require(path.join(APP, "node_modules", "typescript"));
const source = fs.readFileSync(path.join(APP, "src", "lib", "product-price.ts"), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function("exports", "module", code)(loaded.exports, loaded);
const parse = loaded.exports.parseProductPrice;

const cases = [
  ["decimal point", "49.99", true, 4999],
  ["decimal comma", "49,99", true, 4999],
  ["pound sign", "£49.99", true, 4999],
  ["British grouping", "1,234.56", true, 123456],
  ["European grouping with decimal comma", "1.234,56", true, 123456],
  ["ambiguous lone dot plus three digits", "12.500", false],
  ["bare currency sign", "£", false],
  ["free text", "free", false],
  ["three decimal places", "12.3456", false],
  ["blank means unlisted", "", true, null],
];

let passed = 0;
for (const [name, input, ok, pence] of cases) {
  const result = parse(input);
  const good = result.ok === ok && (!ok || result.pence === pence);
  console.log(`  ${good ? "pass" : "FAIL"}  ${name}`);
  if (good) passed++;
}
console.log(`\nParser rules: ${passed} of ${cases.length} passed`);
process.exit(passed === cases.length ? 0 : 1);

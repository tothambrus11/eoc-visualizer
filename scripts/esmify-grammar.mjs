// nearleyc emits a UMD/CommonJS module (it `require("moo")` and assigns to
// `module.exports`). Vite serves source files as native ESM, so we rewrite the
// generated grammar into a small ES module: a top-level `import moo`, and a
// `export default grammar` instead of the UMD footer/IIFE wrapper.
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/grammar/concurrency.js";
let src = readFileSync(file, "utf8");

// Drop the `const moo = require("moo")` line (re-added as an ESM import below).
src = src.replace(/^\s*(?:const|var|let)\s+moo\s*=\s*require\(["']moo["']\);\s*$/m, "");

// Remove the IIFE opener.
src = src.replace(/\(function \(\)\s*\{/, "");

// Remove the UMD export footer together with the IIFE closer `})();`.
src = src.replace(/if \(typeof module[\s\S]*?\}\)\(\);\s*$/, "");

src = `import moo from "moo";\n${src.trim()}\n\nexport default grammar;\n`;

writeFileSync(file, src);
console.log(`esmify: rewrote ${file} as an ES module`);

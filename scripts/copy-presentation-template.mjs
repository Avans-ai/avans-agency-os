// Publishes the official master so the browser can build presentations from it.
// Source of truth: assets/templates/marketing-discovery-v1.pptx (versioned).
// Output: public/templates/marketing-discovery-v1.pptx (generated, gitignored).
// Runs on postinstall and prebuild, so every Vercel build serves the exact
// master; a fingerprint mismatch stops the install/build.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const catalog = JSON.parse(
  await readFile(
    new URL("app/v2/os/knowledge/presentation/master-catalog.json", root),
    "utf8",
  ),
);
const source = new URL("assets/templates/marketing-discovery-v1.pptx", root);
const bytes = await readFile(source);
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (sha256 !== catalog.sha256) {
  console.error(
    `[presentation-template] SHA-256 ${sha256} does not match the catalogued master ${catalog.sha256}.`,
  );
  process.exit(1);
}
await mkdir(new URL("public/templates/", root), { recursive: true });
await writeFile(
  new URL("public/templates/marketing-discovery-v1.pptx", root),
  bytes,
);
console.log(
  `[presentation-template] master ${sha256.slice(0, 12)} → public/templates/`,
);

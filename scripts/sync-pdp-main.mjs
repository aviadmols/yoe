import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_HEADER = `/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin theme editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */
`;

function readShopifyJson(relPath) {
  const raw = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  const headerMatch = raw.match(/^\/\*[\s\S]*?\*\/\s*/);
  const header = headerMatch ? headerMatch[0] : DEFAULT_HEADER;
  const data = JSON.parse(raw.replace(/^\/\*[\s\S]*?\*\/\s*/, ""));
  return { header, data };
}

function writeShopifyJson(relPath, data, header) {
  fs.writeFileSync(
    path.join(ROOT, relPath),
    header + JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const mappings = [
  {
    target: "templates/product.ympossible-cream-yc.json",
    source: "templates/product.json",
  },
  {
    target: "templates/product.ympossible-cream-light-ycl.json",
    source: "templates/product.ympossible_cream_light.json",
  },
  {
    target: "templates/product.discovery-duo-due.json",
    source: "templates/product.discovery-duo.json",
  },
];

for (const { target, source } of mappings) {
  const src = readShopifyJson(source);
  const tgt = readShopifyJson(target);
  const otherSections = Object.keys(tgt.data.sections).filter((k) => k !== "main").length;
  tgt.data.sections.main = clone(src.data.sections.main);
  writeShopifyJson(target, tgt.data, tgt.header);
  console.log(`Updated ${target} <- main from ${source} (kept ${otherSections} other sections)`);
}

console.log("\nVerification:");
for (const { target, source } of mappings) {
  const src = readShopifyJson(source);
  const tgt = readShopifyJson(target);
  const mainMatch =
    JSON.stringify(src.data.sections.main) === JSON.stringify(tgt.data.sections.main);
  const galleryCount = Object.keys(tgt.data.sections.main.settings).filter(
    (k) => k.startsWith("desktop_gallery") && tgt.data.sections.main.settings[k]
  ).length;
  const collapsible = Object.values(tgt.data.sections.main.blocks)
    .filter((b) => b.type === "collapsible_tab")
    .map((b) => `${b.settings.heading}:${(b.settings.content || "").length} chars`);
  console.log(`  ${target}`);
  console.log(`    main 1:1: ${mainMatch}`);
  console.log(`    gallery images: ${galleryCount}`);
  console.log(`    collapsible tabs: ${collapsible.join(", ") || "none"}`);
}

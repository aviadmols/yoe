import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relPath) {
  const raw = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  return JSON.parse(raw.replace(/^\/\*[\s\S]*?\*\/\s*/, ""));
}

function sectionSummary(data) {
  return data.order.map((id) => {
    const s = data.sections[id];
    return {
      id,
      type: s?.type,
      disabled: !!s?.disabled,
      blockCount: s?.blocks ? Object.keys(s.blocks).length : 0,
      settingsKeys: s?.settings ? Object.keys(s.settings) : [],
    };
  });
}

function deepDiff(a, b, path = "") {
  const diffs = [];
  if (a === b) return diffs;
  if (typeof a !== typeof b || a === null || b === null) {
    diffs.push(path || "(root)");
    return diffs;
  }
  if (typeof a !== "object") {
    diffs.push(path);
    return diffs;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const p = path ? `${path}.${k}` : k;
    if (!(k in a) || !(k in b)) diffs.push(p);
    else diffs.push(...deepDiff(a[k], b[k], p));
  }
  return diffs;
}

const pairs = [
  {
    label: "YC",
    pdp: "templates/product.ympossible-cream-yc.json",
    lp: "templates/page.discovery-yc-lp2.json",
    ddIds: ["dd_stats_headline", "dd_compare", "dd_encapsulation_image"],
  },
  {
    label: "YCL",
    pdp: "templates/product.ympossible-cream-light-ycl.json",
    lp: "templates/page.discovery-ycl-lp2.json",
    ddIds: ["dd_stats_headline", "dd_compare", "dd_encapsulation_image"],
  },
  {
    label: "DUE",
    pdp: "templates/product.discovery-duo-due.json",
    lp: "templates/page.discovery-duo-new.json",
    ddIds: ["dd_stats_headline", "dd_compare", "dd_encapsulation_image"],
  },
];

for (const { label, pdp, lp, ddIds } of pairs) {
  const pdpData = readJson(pdp);
  const lpData = readJson(lp);
  console.log(`\n========== ${label} ==========`);
  console.log("PDP sections:", pdpData.order.join(" -> "));
  console.log("LP sections:", lpData.order.join(" -> "));

  for (const id of ddIds) {
    const pSec = pdpData.sections[id];
    const lpKey = Object.keys(lpData.sections).find(
      (k) => lpData.sections[k]?.type === pSec?.type && k.includes(id.split("_")[0])
    );
    const lpCandidates = Object.entries(lpData.sections).filter(
      ([, s]) => s.type === pSec?.type
    );
    const lpSec =
      lpData.sections[id] ||
      lpCandidates.find(([k]) => k === id)?.[1] ||
      lpCandidates[0]?.[1];

    if (!pSec || !lpSec) {
      console.log(`\n${id}: missing pdp=${!!pSec} lp=${!!lpSec}`);
      continue;
    }

    const settingDiffs = deepDiff(pSec.settings || {}, lpSec.settings || "").filter(
      (d) => d.startsWith("settings.") || !d.includes(".")
    );
    const blockDiffs = deepDiff(pSec.blocks || {}, lpSec.blocks || "");
    console.log(`\n${id} (${pSec.type}):`);
    console.log("  settings diffs:", [...new Set(settingDiffs.map((d) => d.split(".")[0] || d))].slice(0, 20));
    const important = [
      "layout_mode",
      "show_diagram",
      "show_how_it_works",
      "cta_label",
      "headline",
      "subheadline",
      "cta_product",
      "padding_top",
      "padding_bottom",
    ];
    for (const k of important) {
      const pv = pSec.settings?.[k];
      const lv = lpSec.settings?.[k];
      if (JSON.stringify(pv) !== JSON.stringify(lv)) {
        console.log(`  ${k}: PDP=${JSON.stringify(pv)} | LP=${JSON.stringify(lv)}`);
      }
    }
    if (blockDiffs.length) {
      console.log("  block structure differs:", blockDiffs.length, "paths");
      console.log("  PDP blocks:", Object.keys(pSec.blocks || {}));
      console.log("  LP blocks:", Object.keys(lpSec.blocks || {}));
    }
  }

  // clinic sections
  for (const id of ["clinic_result_clinical", "clinic_result_consumer"]) {
    const p = pdpData.sections[id]?.settings;
    const l = lpData.sections[id]?.settings;
    if (!p || !l) continue;
    const diffs = importantKeysDiff(p, l);
    if (diffs.length) console.log(`\n${id} setting diffs:`, diffs.join(", "));
  }
}

function importantKeysDiff(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const diffs = [];
  for (const k of keys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs.push(k);
  }
  return diffs;
}

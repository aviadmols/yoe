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

function productResultToClinicBlocks(productSettings) {
  const blocks = {};
  const block_order = [];
  for (let i = 1; i <= 4; i++) {
    const pct = productSettings[`stat_${i}_percentage`];
    if (!pct) continue;
    const top = productSettings[`stat_${i}_top`] || "";
    const bottom = productSettings[`stat_${i}_bottom`] || "";
    const description = [top, bottom].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const id = `result_${i}`;
    blocks[id] = {
      type: "result",
      settings: { percentage: pct, description },
    };
    block_order.push(id);
  }
  return { blocks, block_order };
}

function buildConsumerSection(stats, image) {
  const blocks = {};
  const block_order = [];
  stats.forEach(([percentage, description], index) => {
    const id = `result_${index + 1}`;
    blocks[id] = {
      type: "result",
      settings: { percentage, description },
    };
    block_order.push(id);
  });
  return {
    type: "clinic-result-section",
    blocks,
    block_order,
    settings: {
      image: image || "shopify://shop_images/adaq2_2.png",
      image_mobile: image || "shopify://shop_images/adaq2_3.png",
      headline: "Consumer Approved",
      button_label: "See all results",
      button_link: "",
    },
  };
}

function applyPdpCompareOverrides(section) {
  section.settings.cta_label = "";
  section.settings.cta_go_to_checkout = false;
  section.settings.trust_1 = "";
  section.settings.trust_2 = "";
  section.settings.trust_3 = "";
  section.settings.show_diagram = false;
  section.settings.show_how_it_works = false;
  return section;
}

function applyPdpStatsOverrides(section, { headline, layout_mode, cta_product }) {
  if (headline) section.settings.headline = headline;
  if (layout_mode) section.settings.layout_mode = layout_mode;
  if (cta_product) section.settings.cta_product = cta_product;
  section.settings.cta_label = "";
  section.settings.cta_go_to_checkout = false;
  section.settings.trust_1 = "";
  section.settings.trust_2 = "";
  section.settings.trust_3 = "";
  delete section.settings.cta_product_secondary;
  return section;
}

const configs = [
  {
    pdp: "templates/product.ympossible-cream-yc.json",
    lp: "templates/page.discovery-duo-yc.json",
    statsHeadline: "VISIBLY FIRMs, PLUMPs & REDUCEs FINE LINES & WRINKLES",
    statsLayout: "single",
    statsBlockKey: "product_cream",
    ctaProduct: "ympossible-cream",
    consumerStats: [
      ["100%", "felt skin appeared more youthful"],
      ["95%", "felt skin was firmer"],
    ],
  },
  {
    pdp: "templates/product.ympossible-cream-light-ycl.json",
    lp: "templates/page.discovery-duo-ycl.json",
    statsHeadline: "VISIBLY FIRMs, PLUMPs & REDUCEs FINE LINES & WRINKLES",
    statsLayout: "single",
    statsBlockKey: "product_light",
    ctaProduct: "ympossible-cream-light",
    consumerStats: [
      ["100%", "felt skin looked healthy"],
      ["96%", "felt skin was soft"],
      ["100%", "felt skin stayed calm throughout the day"],
      ["95%", "felt complexion looked radiant"],
    ],
  },
  {
    pdp: "templates/product.discovery-duo-due.json",
    lp: "templates/page.discovery-duo-new.json",
    statsHeadline: "Two Award-Winning Formulas. One Complete Routine.",
    statsLayout: null,
    statsBlockKey: "product_cream",
    ctaProduct: "discovery-duo",
    consumerStats: [
      ["100%", "felt skin appeared more youthful"],
      ["100%", "noticed a more even skin tone"],
      ["95.2%", "saw a visible transformation in skin"],
      ["95%", "felt skin was firmer"],
    ],
  },
];

for (const config of configs) {
  const pdp = readShopifyJson(config.pdp);
  const lp = readShopifyJson(config.lp);
  const lpStats = lp.data.sections.dd_stats_banner;
  const lpCompare = lp.data.sections.dd_compare;

  // Stats banner — copy blocks from LP, apply PDP/Figma headline (no CTA)
  const stats = clone(lpStats);
  applyPdpStatsOverrides(stats, {
    headline: config.statsHeadline,
    layout_mode: config.statsLayout || undefined,
    cta_product: config.ctaProduct,
  });
  pdp.data.sections.dd_stats_headline = stats;

  // Clinical results — derive from primary product_result block
  const primaryKey =
    config.statsBlockKey ||
    stats.block_order.find((id) => stats.blocks[id]?.type === "product_result") ||
    stats.block_order[0];
  const primaryBlock = stats.blocks[primaryKey];
  const clinical = productResultToClinicBlocks(primaryBlock.settings);
  pdp.data.sections.clinic_result_clinical = {
    type: "clinic-result-section",
    ...clinical,
    settings: {
      image:
        primaryBlock.settings.before_after_image ||
        "shopify://shop_images/adaq2_2.png",
      image_mobile:
        primaryBlock.settings.before_after_image ||
        "shopify://shop_images/adaq2_3.png",
      headline: "Clinical trial results",
      button_label: "See all results",
      button_link: "",
    },
  };

  // Consumer Approved — Figma-aligned stats
  pdp.data.sections.clinic_result_consumer = buildConsumerSection(
    config.consumerStats,
    primaryBlock?.settings?.before_after_image
  );

  // Compare — full LP content, PDP overrides (no CTA/diagram/how-it-works)
  const compare = clone(lpCompare);
  applyPdpCompareOverrides(compare);
  pdp.data.sections.dd_compare = compare;

  writeShopifyJson(config.pdp, pdp.data, pdp.header);
  console.log(`Updated ${config.pdp}`);
  console.log(
    `  stats blocks: ${stats.block_order.length}, compare blocks: ${compare.block_order.length}, consumer stats: ${config.consumerStats.length}`
  );
}

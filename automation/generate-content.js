/**
 * Healtho — Weekly Social Media Content Brief Generator
 *
 * Runs every Monday via GitHub Actions.
 * Produces two files:
 *   1. latest-brief.md        — human-readable post brief with captions
 *   2. canva-bulk-create.csv  — upload directly to Canva Bulk Create
 *
 * Usage:  node generate-content.js
 * Env:    ANTHROPIC_API_KEY
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Topic rotation (10 weeks)
// ---------------------------------------------------------------------------

const TOPICS = [
  {
    title: "HIGH PROTEIN FOODS UNDER 200 CALORIES",
    hook: "You don't need to overeat to hit your protein goals.",
    categories: [
      { name: "Lean Meats", benefit: "builds muscle, keeps you full" },
      { name: "Plant Proteins", benefit: "fiber-rich and cholesterol-free" },
      { name: "Dairy & Eggs", benefit: "complete amino acid profiles" },
      { name: "Seafood Options", benefit: "omega-3s plus high protein" },
    ],
  },
  {
    title: "FOODS THAT BOOST YOUR METABOLISM",
    hook: "Your metabolism is more controllable than you think.",
    categories: [
      { name: "Thermogenic Foods", benefit: "increases calorie burn" },
      { name: "Fiber-Rich Foods", benefit: "slows digestion, sustains energy" },
      { name: "Caffeine Sources", benefit: "natural metabolic stimulants" },
      { name: "Metabolism-Boosting Spices", benefit: "activates fat-burning enzymes" },
    ],
  },
  {
    title: "BEST FOODS FOR FAT LOSS",
    hook: "Fat loss isn't about eating less — it's about eating smarter.",
    categories: [
      { name: "High-Volume Low-Cal Foods", benefit: "fills you up on fewer calories" },
      { name: "Protein Sources", benefit: "preserves muscle during a deficit" },
      { name: "Fat-Burning Foods", benefit: "directly supports fat oxidation" },
      { name: "Water-Dense Foods", benefit: "suppresses appetite naturally" },
    ],
  },
  {
    title: "FOODS THAT KEEP YOU FULL LONGEST",
    hook: "Stop the 3pm hunger crash for good.",
    categories: [
      { name: "High-Fiber Foods", benefit: "slows stomach emptying" },
      { name: "Slow-Digesting Proteins", benefit: "hours of sustained satiety" },
      { name: "Healthy Fats", benefit: "triggers fullness hormones" },
      { name: "Water-Dense Vegetables", benefit: "high volume, low calories" },
    ],
  },
  {
    title: "LOWEST CALORIE FOODS ON THE PLANET",
    hook: "Eat more, weigh less — these foods make it possible.",
    categories: [
      { name: "Under 20 kcal per 100g", benefit: "virtually zero calorie cost" },
      { name: "Under 30 kcal per 100g", benefit: "high water, high volume" },
      { name: "Under 50 kcal per 100g", benefit: "nutrient-dense and filling" },
      { name: "High-Volume Snack Options", benefit: "satisfies cravings guilt-free" },
    ],
  },
  {
    title: "MUSCLE BUILDING FOODS",
    hook: "Muscle isn't just built in the gym — it's built in the kitchen.",
    categories: [
      { name: "Complete Proteins", benefit: "all 9 essential amino acids" },
      { name: "Fast-Digesting Proteins", benefit: "ideal post-workout window" },
      { name: "Complex Carb Sources", benefit: "fuels workouts and recovery" },
      { name: "Recovery Foods", benefit: "reduces soreness and inflammation" },
    ],
  },
  {
    title: "FOODS TO EAT FOR BETTER SLEEP",
    hook: "Bad sleep is often a nutrition problem in disguise.",
    categories: [
      { name: "Melatonin-Rich Foods", benefit: "triggers natural sleep signals" },
      { name: "Magnesium-Rich Foods", benefit: "relaxes muscles and nerves" },
      { name: "Tryptophan Sources", benefit: "precursor to sleep hormones" },
      { name: "Foods to Avoid at Night", benefit: "these disrupt deep sleep cycles" },
    ],
  },
  {
    title: "HIGH CALORIE HEALTHY FOODS",
    hook: "Gaining weight the healthy way is harder than it looks.",
    categories: [
      { name: "Calorie-Dense Nuts & Seeds", benefit: "healthy fats and micronutrients" },
      { name: "Healthy Fats", benefit: "9 kcal per gram, nutrient-rich" },
      { name: "Complex Carbohydrates", benefit: "sustained energy for training" },
      { name: "Protein-Dense Dairy", benefit: "calories plus muscle support" },
    ],
  },
  {
    title: "FOODS THAT REDUCE BELLY BLOATING",
    hook: "Bloating is usually food-related — and totally fixable.",
    categories: [
      { name: "Anti-Inflammatory Foods", benefit: "reduces gut irritation" },
      { name: "Probiotic Foods", benefit: "restores gut bacteria balance" },
      { name: "Natural Diuretics", benefit: "flushes excess water weight" },
      { name: "Digestive Aids", benefit: "speeds up slow digestion" },
    ],
  },
  {
    title: "BREAKFAST FOODS RANKED BY PROTEIN",
    hook: "Your breakfast is either working for you or against you.",
    categories: [
      { name: "30g+ Protein Breakfasts", benefit: "sets the tone for the whole day" },
      { name: "20–30g Protein Options", benefit: "solid start, easy to make" },
      { name: "10–20g Protein Options", benefit: "better than most skip it" },
      { name: "High-Sugar Breakfasts to Avoid", benefit: "these spike blood sugar fast" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeeklyTopic() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  const topicIndex = (weekNumber - 1) % TOPICS.length;
  return { topic: TOPICS[topicIndex], weekNumber, topicIndex: topicIndex + 1 };
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function ensureOutputDir() {
  const dir = path.join(__dirname, "output");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Prompt 1: Human-readable brief (markdown)
// ---------------------------------------------------------------------------

function buildBriefPrompt(topic) {
  return `You are a social media content strategist for Healtho — a data-driven health and nutrition app for families.

BRAND VOICE: Data first. Every food MUST have real calorie + macro numbers. No vague wellness speak. Practical grocery-store foods only. Every CTA ties back to tracking on Healtho.

POST FORMAT: Carousel — Slide 1 is a title card. Slides 2–5 are 2×2 food photo grids (4 foods per slide, one category per slide).

PLATFORMS: Instagram @healtho_10k · TikTok @healtho_10k · X @HealthO_10k

---

Generate a COMPLETE post brief for:

TITLE: ${topic.title}
HOOK: ${topic.hook}

CATEGORIES (one per content slide):
${topic.categories.map((c, i) => `${i + 1}. ${c.name} — ${c.benefit}`).join("\n")}

For EACH category slide provide:
- Category name + benefit subtitle
- Exactly 4 foods each with: name · kcal per 100g · key macro

Then generate:
1. INSTAGRAM CAPTION (hook + 2–3 sentence context + Healtho CTA + 9 hashtags)
2. TIKTOK CAPTION (shorter, hook-first, 3–5 hashtags)
3. X CAPTION (hook stat → "Here's the breakdown 🧵" → "Save this." → 3–4 hashtags)
4. CANVA PHOTO NOTES (what food photos to search per slide — colour, mood, style)

Format as clean markdown.`;
}

// ---------------------------------------------------------------------------
// Prompt 2: Structured data for Canva Bulk Create (JSON)
// ---------------------------------------------------------------------------

function buildCSVPrompt(topic) {
  return `You are generating structured slide data for a Canva Bulk Create CSV upload.

Topic: ${topic.title}
Categories:
${topic.categories.map((c, i) => `${i + 1}. ${c.name} — ${c.benefit}`).join("\n")}

Return ONLY a valid JSON object — no markdown, no explanation, no code fences. Just raw JSON.

The JSON must match this exact structure:
{
  "post_title": "${topic.title}",
  "slides": [
    {
      "category_name": "CATEGORY NAME IN CAPS",
      "category_benefit": "short benefit in lowercase",
      "food1_name": "Food Name",
      "food1_data": "000 kcal · 00g protein",
      "food2_name": "Food Name",
      "food2_data": "000 kcal · 00g protein",
      "food3_name": "Food Name",
      "food3_data": "000 kcal · 00g protein",
      "food4_name": "Food Name",
      "food4_data": "000 kcal · 00g protein"
    }
  ]
}

Rules:
- Exactly ${topic.categories.length} slides, one per category
- food_data format: "165 kcal · 31g protein" (use the most relevant macro for the topic)
- All numbers must be accurate and real
- No trailing commas, valid JSON only`;
}

// ---------------------------------------------------------------------------
// CSV generator
// ---------------------------------------------------------------------------

function jsonToCSV(slideData) {
  const headers = [
    "post_title",
    "category_name",
    "category_benefit",
    "food1_name",
    "food1_data",
    "food2_name",
    "food2_data",
    "food3_name",
    "food3_data",
    "food4_name",
    "food4_data",
  ];

  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;

  const rows = slideData.slides.map((slide) =>
    headers.map((h) => escape(h === "post_title" ? slideData.post_title : slide[h] ?? "")).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌  ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const { topic, weekNumber, topicIndex } = getWeeklyTopic();
  const today = getTodayString();

  console.log(`\n🚀 Healtho Content Generator`);
  console.log(`📅 Date: ${today} (ISO week ${weekNumber})`);
  console.log(`📌 Topic ${topicIndex}/10: ${topic.title}\n`);

  // ── Call 1: Human-readable brief ──────────────────────────────────────────
  console.log("⏳ Generating post brief...\n");
  let briefText = "";

  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system: "You are an expert social media content strategist for health and nutrition brands. Always include accurate nutritional numbers — never approximate or fabricate.",
    messages: [{ role: "user", content: buildBriefPrompt(topic) }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
      briefText += event.delta.text;
    }
  }
  const briefFinal = await stream.finalMessage();
  console.log(`\n\n✅ Brief done — ${briefFinal.usage.output_tokens} tokens`);

  // ── Call 2: Structured JSON for Canva CSV ─────────────────────────────────
  console.log("\n⏳ Generating Canva CSV data...\n");

  const jsonResponse = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: "You output only raw valid JSON. No markdown. No explanation. No code fences. Just the JSON object.",
    messages: [{ role: "user", content: buildCSVPrompt(topic) }],
  });

  const rawJSON = jsonResponse.content[0].text.trim();
  console.log("Raw JSON received:\n", rawJSON.slice(0, 200), "...");

  let slideData;
  try {
    slideData = JSON.parse(rawJSON);
  } catch (e) {
    console.error("❌ JSON parse failed:", e.message);
    console.error("Raw output was:", rawJSON);
    process.exit(1);
  }

  const csv = jsonToCSV(slideData);
  console.log(`✅ CSV ready — ${slideData.slides.length} slides`);

  // ── Save files ────────────────────────────────────────────────────────────
  const outputDir = ensureOutputDir();
  const datePrefix = `${today}-week${weekNumber}-topic${topicIndex}`;

  // 1. Dated brief
  const briefContent = `# Healtho Content Brief
> Generated: ${today} · Week ${weekNumber} · Topic ${topicIndex} of 10

---

## Topic: ${topic.title}

${briefText}

---
*Generated by Healtho Content Automation*
`;
  fs.writeFileSync(path.join(outputDir, `${datePrefix}-brief.md`), briefContent, "utf8");

  // 2. Latest brief (always overwritten)
  fs.writeFileSync(path.join(outputDir, "latest-brief.md"), briefContent, "utf8");

  // 3. Canva Bulk Create CSV (always overwritten — ready to upload)
  const csvPath = path.join(outputDir, "canva-bulk-create.csv");
  fs.writeFileSync(csvPath, csv, "utf8");

  // 4. Dated CSV backup
  fs.writeFileSync(path.join(outputDir, `${datePrefix}-canva.csv`), csv, "utf8");

  console.log(`\n💾 Brief  → automation/output/latest-brief.md`);
  console.log(`📊 CSV    → automation/output/canva-bulk-create.csv`);
  console.log(`\n📋 Canva Bulk Create instructions:`);
  console.log(`   1. Open your Canva template`);
  console.log(`   2. Click Apps → Bulk Create → Upload CSV`);
  console.log(`   3. Upload canva-bulk-create.csv`);
  console.log(`   4. Map columns to template fields`);
  console.log(`   5. Generate — all slides auto-fill ✅`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});

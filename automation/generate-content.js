/**
 * Healtho — Weekly Social Media Content Brief Generator
 *
 * Runs every Monday via GitHub Actions.
 * Calls Claude API → generates a full post brief → saves to automation/output/
 *
 * Usage:  node generate-content.js
 * Env:    ANTHROPIC_API_KEY
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

/**
 * Returns which topic (0–9) to use based on ISO week number.
 * Rotates through the 10 topics in a perpetual cycle.
 */
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
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(topic) {
  return `You are a social media content strategist for Healtho — a data-driven health and nutrition app for families.

HEALTHO'S BRAND VOICE:
- Data first: every food mentioned MUST include real calorie and macro numbers (kcal per 100g, protein grams, etc.)
- No vague wellness speak: be specific and factual
- Practical: foods anyone can find at a grocery store
- CTA always ties back to tracking on the Healtho app

THE POST FORMAT (carousel, proven to get 100K+ likes):
- Slide 1: Title card — bold all-caps headline + full-bleed food photo
- Slides 2–N: 2×2 food photo grid per slide, each with a category name + benefit subtitle + 4 specific foods with calorie/macro data
- Last line of every slide: include the food name AND its data (e.g., "Chicken Breast · 165 kcal · 31g protein per 100g")

PLATFORMS: Instagram @healtho_10k · TikTok @healtho_10k · X @HealthO_10k

---

Generate a COMPLETE social media post brief for this week's topic:

TITLE: ${topic.title}
HOOK: ${topic.hook}

CATEGORIES TO COVER (one category per content slide):
${topic.categories.map((c, i) => `${i + 1}. ${c.name} — ${c.benefit}`).join("\n")}

For EACH category slide, provide:
- Category name
- Benefit subtitle (short, in parentheses, 1 line)
- Exactly 4 foods, each with: food name + calories per 100g + key macro (protein, fiber, or fat depending on topic)

Also generate:
1. INSTAGRAM CAPTION (hook sentence + 2–3 sentence educational context + CTA mentioning Healtho + 9 hashtags)
2. TIKTOK CAPTION (hook-first, shorter, 3–5 hashtags only)
3. X (TWITTER) CAPTION (hook stat → "Here's the breakdown 🧵" + note to attach 4 slides + "Save this." + 3–4 hashtags)
4. CANVA NOTES (1–2 sentences on what type of food photos to search for each slide — colour palette, mood)

Format your response as clean markdown so it's easy to copy into Canva.`;
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
  console.log("⏳ Calling Claude API...\n");

  // Stream the response so we can see it generate in the Actions log
  let fullText = "";

  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system:
      "You are an expert social media content strategist specialising in health and nutrition brands. You produce precise, data-rich content briefs in clean markdown. Always include real nutritional numbers — never approximate.",
    messages: [{ role: "user", content: buildPrompt(topic) }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
      fullText += event.delta.text;
    }
  }

  const finalMessage = await stream.finalMessage();
  console.log(
    `\n\n✅ Done — ${finalMessage.usage.input_tokens} in / ${finalMessage.usage.output_tokens} out tokens`
  );

  // ---------------------------------------------------------------------------
  // Save output
  // ---------------------------------------------------------------------------

  const outputDir = ensureOutputDir();
  const filename = `${today}-week${weekNumber}-topic${topicIndex}-brief.md`;
  const filepath = path.join(outputDir, filename);

  const fileContent = `# Healtho Content Brief
> Generated: ${today} · Week ${weekNumber} · Topic ${topicIndex} of 10
> Model: claude-opus-4-6

---

## Topic: ${topic.title}

${fullText}

---
*Generated by Healtho Content Automation — automation/generate-content.js*
`;

  fs.writeFileSync(filepath, fileContent, "utf8");
  console.log(`\n💾 Saved to: automation/output/${filename}`);

  // Write a "latest" symlink-style file for easy access
  const latestPath = path.join(outputDir, "latest-brief.md");
  fs.writeFileSync(latestPath, fileContent, "utf8");
  console.log(`📎 Also saved as: automation/output/latest-brief.md`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});

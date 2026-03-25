/**
 * Healtho — Weekly Social Media Content Brief Generator
 *
 * Runs every Monday via GitHub Actions.
 * Produces four files:
 *   1. latest-brief.md        — human-readable post brief with captions
 *   2. canva-bulk-create.csv  — upload directly to Canva Bulk Create
 *   3. latest-carousel.pptx  — ready-to-use 5-slide portrait carousel
 *   4. Dated backups of all three
 *
 * Usage:  node generate-content.js
 * Env:    ANTHROPIC_API_KEY
 */

import Anthropic from "@anthropic-ai/sdk";
import PptxGenJS from "pptxgenjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Photo helpers (Pexels API — free tier, no cost)
// ---------------------------------------------------------------------------

/** Download an image URL and return a base64 data URI. Follows one redirect. */
function downloadImageAsBase64(imageUrl) {
  return new Promise((resolve) => {
    const mod = imageUrl.startsWith("https") ? https : http;
    const req = mod.get(imageUrl, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadImageAsBase64(res.headers.location).then(resolve);
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const b64 = buffer.toString("base64");
        const mime = res.headers["content-type"] || "image/jpeg";
        resolve(`data:${mime};base64,${b64}`);
      });
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
    req.setTimeout(12000, () => { req.destroy(); resolve(null); });
  });
}

/**
 * Search Pexels for a food photo and return a base64 data URI.
 * Returns null if the API key is missing, quota exceeded, or network fails.
 */
async function fetchFoodPhoto(foodName, pexelsApiKey) {
  if (!pexelsApiKey) return null;
  const query = encodeURIComponent(foodName.toLowerCase());
  const apiUrl = `https://api.pexels.com/v1/search?query=${query}&per_page=3&size=small&orientation=square`;

  const photoUrl = await new Promise((resolve) => {
    const req = https.request(apiUrl, { headers: { Authorization: pexelsApiKey } }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(raw);
          // Pick the most-liked photo with a square-ish crop
          const photo = json.photos?.[0];
          resolve(photo?.src?.medium || null);
        } catch { resolve(null); }
      });
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.end();
  });

  if (!photoUrl) return null;
  return downloadImageAsBase64(photoUrl);
}

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
  // Allow manual override via FORCE_TOPIC_INDEX env var (1-based, e.g. "4" = Topic 4)
  if (process.env.FORCE_TOPIC_INDEX) {
    const forced = parseInt(process.env.FORCE_TOPIC_INDEX, 10);
    const idx = Math.max(1, Math.min(forced, TOPICS.length));
    return { topic: TOPICS[idx - 1], weekNumber: null, topicIndex: idx };
  }
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
// Prompt 2: Structured data for Canva Bulk Create + PPTX (JSON)
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
// PPTX carousel builder
// Portrait 4:5 (6" × 7.5") — matches Instagram native ratio
// ---------------------------------------------------------------------------

function buildPPTX(topic, slideData, weekNumber, topicIndex) {
  const prs = new PptxGenJS();

  // Portrait 4:5 layout
  prs.defineLayout({ name: "PORTRAIT_45", width: 6, height: 7.5 });
  prs.layout = "PORTRAIT_45";

  // ── Brand palette ──────────────────────────────────────────────────────────
  const C = {
    bg:     "F5EDD0",  // warm cream
    olive:  "5C5915",  // dark olive (food boxes + strip)
    orange: "E87D3E",  // accent orange
    black:  "1A1A1A",  // title text
    white:  "FFFFFF",  // box text
    muted:  "8B7A3A",  // subtitles / labels
  };

  // Content font — modern calligraphy style (natively available in Canva)
  const FC = "Dancing Script";

  const noLine = { color: "FFFFFF", width: 0 };

  // ── Shared helpers ─────────────────────────────────────────────────────────
  const addBg = (slide) =>
    slide.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: 6, h: 7.5,
      fill: { color: C.bg }, line: noLine,
    });

  const addBottomStrip = (slide) => {
    slide.addShape(prs.ShapeType.rect, {
      x: 0, y: 7.22, w: 6, h: 0.28,
      fill: { color: C.olive }, line: noLine,
    });
    slide.addText("healtho  ·  @healtho_10k", {
      x: 0, y: 7.24, w: 6, h: 0.24,
      fontSize: 9, color: C.white, bold: true,
      align: "center", fontFace: "Arial",
    });
  };

  // ==========================================================================
  // SLIDE 1 — Title / Hook card
  // ==========================================================================
  const s1 = prs.addSlide();
  addBg(s1);

  // Week label (top-right)
  // Note: Slide 1 background illustration is added manually in Canva after import.
  s1.addText(`WEEK ${weekNumber}  ·  TOPIC ${topicIndex}/10`, {
    x: 0.35, y: 0.3, w: 5.3, h: 0.28,
    fontSize: 8, color: C.muted, bold: true,
    align: "left", fontFace: "Arial",
  });

  // Big topic title
  s1.addText(topic.title, {
    x: 0.35, y: 0.72, w: 5.3, h: 3.1,
    fontSize: 36, color: C.black, bold: true,
    fontFace: FC, wrap: true, valign: "middle",
  });

  // Orange divider line
  s1.addShape(prs.ShapeType.rect, {
    x: 0.35, y: 3.9, w: 2.6, h: 0.08,
    fill: { color: C.orange }, line: noLine,
  });

  // Hook quote
  s1.addText(`"${topic.hook}"`, {
    x: 0.35, y: 4.08, w: 5.3, h: 1.8,
    fontSize: 19, color: C.olive, italic: true,
    fontFace: FC, wrap: true, valign: "top",
  });

  // Save reminder
  s1.addText("Save this for your next grocery run →", {
    x: 0.35, y: 6.78, w: 5.3, h: 0.3,
    fontSize: 9, color: C.muted, align: "left", fontFace: FC,
  });

  addBottomStrip(s1);

  // ==========================================================================
  // SLIDES 2–5 — One per food category
  // ==========================================================================
  const TOTAL_SLIDES = slideData.slides.length + 1; // +1 for title

  slideData.slides.forEach((cat, i) => {
    const s = prs.addSlide();
    addBg(s);

    // Category name
    s.addText(cat.category_name, {
      x: 0.3, y: 0.2, w: 5.4, h: 1.1,
      fontSize: 26, color: C.black, bold: true,
      fontFace: FC, wrap: true,
    });

    // Orange underline
    s.addShape(prs.ShapeType.rect, {
      x: 0.3, y: 1.32, w: 5.4, h: 0.07,
      fill: { color: C.orange }, line: noLine,
    });

    // Benefit subtitle
    s.addText(cat.category_benefit, {
      x: 0.3, y: 1.44, w: 5.4, h: 0.4,
      fontSize: 12, color: C.muted, italic: true,
      fontFace: FC,
    });

    // ── 2 × 2 food grid ──────────────────────────────────────────────────────
    const BW = 2.62;  // box width
    const BH = 2.2;   // box height
    const COLS = [0.2, 3.18];
    const ROWS = [2.0, 4.38];

    const foods = [
      { name: cat.food1_name, data: cat.food1_data, photo: cat.food1_photo },
      { name: cat.food2_name, data: cat.food2_data, photo: cat.food2_photo },
      { name: cat.food3_name, data: cat.food3_data, photo: cat.food3_photo },
      { name: cat.food4_name, data: cat.food4_data, photo: cat.food4_photo },
    ];

    foods.forEach((food, fi) => {
      const bx = COLS[fi % 2];
      const by = ROWS[Math.floor(fi / 2)];

      if (food.photo) {
        // ── Photo background ────────────────────────────────────────────────
        s.addImage({ data: food.photo, x: bx, y: by, w: BW, h: BH });
        // Semi-transparent dark scrim so text stays readable
        s.addShape(prs.ShapeType.rect, {
          x: bx, y: by, w: BW, h: BH,
          fill: { color: "000000", transparency: 35 }, line: noLine,
        });
      } else {
        // ── Fallback: solid olive box ────────────────────────────────────────
        s.addShape(prs.ShapeType.rect, {
          x: bx, y: by, w: BW, h: BH,
          fill: { color: C.olive }, line: noLine,
        });
      }

      // Food name
      s.addText(food.name, {
        x: bx + 0.15, y: by + 0.18, w: BW - 0.3, h: 0.65,
        fontSize: 14, color: C.white, bold: true,
        fontFace: FC, wrap: true,
      });

      // Thin orange rule
      s.addShape(prs.ShapeType.rect, {
        x: bx + 0.15, y: by + 0.9, w: BW - 0.3, h: 0.04,
        fill: { color: C.orange }, line: noLine,
      });

      // Macro / calorie data
      s.addText(food.data, {
        x: bx + 0.15, y: by + 1.0, w: BW - 0.3, h: 1.05,
        fontSize: 11, color: C.white,
        fontFace: FC, wrap: true,
      });
    });

    // Slide counter (e.g. "2 / 5")
    s.addText(`${i + 2} / ${TOTAL_SLIDES}`, {
      x: 4.5, y: 6.86, w: 1.25, h: 0.22,
      fontSize: 8, color: C.muted, align: "right", fontFace: "Arial",
    });

    addBottomStrip(s);
  });

  return prs;
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

  // ── Call 2: Structured JSON for CSV + PPTX ────────────────────────────────
  console.log("\n⏳ Generating slide data (CSV + PPTX)...\n");

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

  // ── Fetch food photos (Pexels) ────────────────────────────────────────────
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    console.log("\n📸 Fetching food photos from Pexels...");
    let hits = 0;
    for (const slide of slideData.slides) {
      for (let fi = 1; fi <= 4; fi++) {
        const foodName = slide[`food${fi}_name`];
        process.stdout.write(`   ${foodName.padEnd(22)}`);
        const photo = await fetchFoodPhoto(foodName, pexelsKey);
        slide[`food${fi}_photo`] = photo;
        if (photo) { hits++; process.stdout.write("✅\n"); }
        else        {          process.stdout.write("⬜ (using fallback)\n"); }
      }
    }
    console.log(`✅ Photos ready — ${hits}/16 loaded`);
  } else {
    console.log("\nℹ️  PEXELS_API_KEY not set — building PPTX with solid colour boxes.");
    console.log("   Add PEXELS_API_KEY to your .env (free at pexels.com/api) for food photos.");
  }

  // ── Build PPTX carousel ───────────────────────────────────────────────────
  console.log("\n⏳ Building PPTX carousel...");
  const prs = buildPPTX(topic, slideData, weekNumber, topicIndex);

  // ── Save all files ────────────────────────────────────────────────────────
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

  // 3. Canva Bulk Create CSV
  fs.writeFileSync(path.join(outputDir, "canva-bulk-create.csv"), csv, "utf8");

  // 4. Dated CSV backup
  fs.writeFileSync(path.join(outputDir, `${datePrefix}-canva.csv`), csv, "utf8");

  // 5. PPTX carousel (latest + dated)
  await prs.writeFile({ fileName: path.join(outputDir, "latest-carousel.pptx") });
  await prs.writeFile({ fileName: path.join(outputDir, `${datePrefix}-carousel.pptx`) });
  console.log(`✅ PPTX ready — ${slideData.slides.length + 1} slides`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Output files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Brief    → automation/output/latest-brief.md
📊 CSV      → automation/output/canva-bulk-create.csv
🎨 Carousel → automation/output/latest-carousel.pptx

📐 Carousel format: 5 slides · Portrait 4:5 (1080×1350)
   Slide 1  — Title / hook card
   Slides 2–5 — One food category per slide (2×2 grid)

📋 To use:
   Open latest-carousel.pptx in Canva, Google Slides,
   or PowerPoint — all data is pre-filled. Done. ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});

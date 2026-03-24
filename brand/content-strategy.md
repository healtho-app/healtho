# Healtho — Social Media Content Strategy
> Last updated: 2026-03-24
> Inspired by: @holistichealths (133.9K likes post analyzed)
> Platforms: Instagram @healtho_10k · TikTok @healtho_10k · X @HealthO_10k

---

## THE FORMAT (Proven Template)

Based on analysis of a high-performing health carousel (133.9K likes, 355 comments), this is the exact format to replicate.

### Post Structure: "Food Category Listicle Carousel"

**Slide 1 — Title Card**
- Full-bleed real food photo as background
- Big bold serif/mixed font title in white, centered
- Format: `[FOODS/HABITS/TIPS] FOR [SPECIFIC HEALTH GOAL]`
- Example: `HIGH PROTEIN FOODS UNDER 200 CALORIES`
- Watermark bottom-left: `@healtho_10k`
- Arrow (→) bottom-center indicating swipe

**Slides 2–N — Content Slides (identical layout)**
- 2x2 grid of real food photos filling the frame
- Each quadrant: food photo + white rounded-rectangle label with food name
- Center overlay band (semi-transparent white): Category name (bold) + benefit in parentheses
- Format: `Category Name\n(one-line benefit for your body)`
- 4 foods per slide, 1 category per slide

**Healtho's Unique Angle vs competitors:**
Add calorie/macro data beneath each food name label:
`Chicken Breast\n165 kcal · 31g protein`
This makes Healtho posts MORE useful than generic wellness accounts — the data angle is the brand.

### Caption Formula
```
[emoji] [Hook — state the benefit or the surprising fact]
[2–3 sentence educational context — explain WHY these foods work]
[CTA — tie back to Healtho]

#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5 #hashtag6 #hashtag7 #hashtag8 #hashtag9
```

**Example caption:**
```
💪 You don't need huge portions to hit your protein goals.
These high-protein, low-calorie foods keep you full, preserve muscle, and support your metabolism — all under 200 calories per serving. The key is knowing which foods give you the most nutrition per calorie.
Track exactly how much protein you're hitting daily on Healtho. Link in bio.

#highprotein #proteinfoods #nutritionFacts #healthyeating #caloriecount #macros #fatloss #healthdata #healtho
```

### Hashtag Bank (rotate 9 per post)

**Broad (always include 2–3):**
`#health` `#nutrition` `#wellness` `#healthyeating` `#healthylifestyle`

**Mid-tier (always include 3–4):**
`#nutritionFacts` `#healthdata` `#caloriecounting` `#macros` `#fatloss` `#weightloss` `#fitness` `#cleaneating`

**Niche/specific (always include 2–3, match the topic):**
`#highprotein` `#lowcalorie` `#mealprep` `#calorielist` `#bmi` `#tdee` `#caloriedeficit` `#healthapp` `#healtho`

---

## CANVA TEMPLATE SETUP (One-Time, Then Reuse Forever)

### Template Specs
- Size: **1080 x 1080px** (square, works on all 3 platforms)
- Create 2 master slide types:

**Master Slide A — Title Card**
- Background: full-bleed food photo (replace each post)
- Add semi-transparent dark overlay (30% opacity black) so text reads clearly
- Title text: Playfair Display Bold, 90pt, white, centered
- Watermark: "@healtho_10k", Lato Regular, 18pt, white, 50% opacity, bottom-left
- Arrow: →, white, 36pt, bottom-center

**Master Slide B — Content Slide (2x2 grid)**
- 4 image placeholders each 540x540px (fills entire canvas in 2x2)
- White rounded rectangle overlays for food name labels (4 corners)
- Center band: white fill, 40% opacity, spans full width ~200px tall
- Category text: Playfair Display Bold, 42pt, black/dark
- Benefit text: Lato Regular, 24pt, dark grey, italic

### Workflow Per Post
1. Duplicate the master template
2. Slide 1: Swap background photo → update title text
3. Slides 2–N: Swap 4 food photos per slide → update food names + calorie data + category name + benefit
4. Export all slides as JPG (File → Download → JPG, all pages)
5. Upload to Buffer as a carousel → schedule

**Time estimate per post: ~20–30 minutes in Canva**

---

## 10-WEEK CONTENT CALENDAR

Each week = 1 carousel post. Post on Monday (peak health motivation day).

| Week | Title | Slides (Categories) |
|------|-------|---------------------|
| 1 | HIGH PROTEIN FOODS UNDER 200 CALORIES | Lean Meats · Plant Proteins · Dairy & Eggs · Seafood |
| 2 | FOODS THAT BOOST YOUR METABOLISM | Thermogenic Foods · Fiber-Rich Foods · Caffeine Sources · Spices |
| 3 | BEST FOODS FOR FAT LOSS | High-Volume Low-Cal · Protein Sources · Fat-Burning Foods · Hydrating Foods |
| 4 | FOODS THAT KEEP YOU FULL LONGEST | High-Fiber Foods · Slow-Digesting Proteins · Healthy Fats · Water-Dense Foods |
| 5 | LOWEST CALORIE FOODS ON THE PLANET | Under 20 kcal/100g · Under 30 kcal/100g · Under 50 kcal/100g · High Volume Options |
| 6 | MUSCLE BUILDING FOODS | Complete Proteins · Fast-Digesting Proteins · Carb Sources · Recovery Foods |
| 7 | FOODS TO EAT FOR BETTER SLEEP | Melatonin-Rich · Magnesium-Rich · Tryptophan Sources · Avoid These Before Bed |
| 8 | HIGH CALORIE HEALTHY FOODS (FOR GAINING) | Calorie-Dense Nuts · Healthy Fats · Complex Carbs · Protein-Dense Dairy |
| 9 | FOODS THAT REDUCE BELLY BLOATING | Anti-Inflammatory · Probiotic Foods · Natural Diuretics · Digestive Aids |
| 10 | BREAKFAST FOODS RANKED BY PROTEIN | 30g+ Protein · 20–30g Protein · 10–20g Protein · Under 10g Protein |

---

## AUTOMATION PLAN

### Phase 1 — Content Brief Generator (Build Now)
**What it does:** Every Monday, Claude API auto-generates the full post brief.
**Output:** Title, all slide categories + 4 foods each + calorie data + benefit text + caption + hashtags
**You still do:** Open Canva, swap photos and text (~20–30 min), upload to Buffer

**Stack:**
- `automation/generate-content.js` — Node.js script using `@anthropic-ai/sdk`
- `.github/workflows/weekly-content.yml` — cron job every Monday 9am
- Output: `automation/output/week-XX-brief.md` file committed to repo
- You get a GitHub notification → open the file → use it in Canva

**Cost:** claude-haiku-4-5 ~$0.002 per week = essentially free

### Phase 2 — Full Visual Automation (Future)
**What it does:** End-to-end. Claude generates content → image service renders Canva-style slides → Buffer posts automatically.

**Tools to evaluate:**
- **Bannerbear** (bannerbear.com) — template → API → PNG. ~$49/mo
- **Creatomate** (creatomate.com) — more flexible, supports video too. ~$29/mo
- **Placid.app** — simplest API. ~$19/mo

**Flow:**
```
GitHub Actions (Monday 9am)
  → Claude API: generate post data (title, foods, calories, benefits, caption)
  → Image API: render slides from template using Claude's data
  → Buffer API: schedule rendered images as carousel post
  → Done (zero manual work)
```

---

## PLATFORM-SPECIFIC NOTES

### Instagram
- Post as **Carousel** (up to 10 slides)
- Caption: full formula above
- First comment: repeat hashtags for reach
- Best time: Monday 7–9am or 7–9pm local

### TikTok
- Post as **Photo Mode / Slideshow** (same Canva images)
- Caption: shorter, hook-first, 3–5 hashtags only
- Add trending audio at low volume (for algorithm)
- Best time: 6–9pm local

### X (Twitter)
- Post 4 slides only (X limit per post)
- Caption format: hook stat → "Here's the breakdown 🧵" → images → "Save this."
- 3–4 hashtags max

---

## CONTENT RULES (Brand Voice)

1. **Data first** — every slide has numbers. Calories, grams, percentages. This is Healtho's edge.
2. **No fluff** — no "eat healthy and feel great!" vague wellness speak. Be specific.
3. **Practical** — "foods you can buy at any grocery store", not exotic superfoods
4. **Tie back to the app** — every post CTA references tracking on Healtho
5. **One topic per post** — don't mix "protein foods" and "fat loss foods" in the same carousel

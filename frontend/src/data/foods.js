// Local food database — covers Indian staples + common western foods
// Each entry: id, name, emoji, calories, protein_g, carbs_g, fat_g, fiber_g, serving (label)
// All values are per serving size listed

const FOODS = [
  // ── Indian staples ──────────────────────────────────────────────────────────
  { id: 'dal-rice',        emoji: '🍚', name: 'Dal Rice',           calories: 450, protein_g: 12, carbs_g: 68, fat_g: 5,  fiber_g: 4,  serving: '1 plate (300g)' },
  { id: 'roti-wheat',      emoji: '🫓', name: 'Roti (Wheat)',        calories: 95,  protein_g: 3,  carbs_g: 18, fat_g: 1,  fiber_g: 2,  serving: '1 piece (40g)' },
  { id: 'paneer-100g',     emoji: '🧀', name: 'Paneer',              calories: 265, protein_g: 18, carbs_g: 1,  fat_g: 20, fiber_g: 0,  serving: '100g' },
  { id: 'masala-oats',     emoji: '🥣', name: 'Masala Oats',         calories: 210, protein_g: 7,  carbs_g: 35, fat_g: 4,  fiber_g: 3,  serving: '1 bowl (200ml)' },
  { id: 'poha',            emoji: '🍛', name: 'Poha',                calories: 250, protein_g: 5,  carbs_g: 48, fat_g: 4,  fiber_g: 2,  serving: '1 plate (150g)' },
  { id: 'idli',            emoji: '🤍', name: 'Idli',                calories: 78,  protein_g: 2,  carbs_g: 16, fat_g: 0,  fiber_g: 1,  serving: '1 piece (60g)' },
  { id: 'dosa',            emoji: '🥞', name: 'Dosa (Plain)',         calories: 168, protein_g: 4,  carbs_g: 32, fat_g: 3,  fiber_g: 1,  serving: '1 medium (80g)' },
  { id: 'sambar',          emoji: '🍲', name: 'Sambar',              calories: 90,  protein_g: 4,  carbs_g: 14, fat_g: 2,  fiber_g: 3,  serving: '1 cup (200ml)' },
  { id: 'chana-masala',    emoji: '🫘', name: 'Chana Masala',        calories: 280, protein_g: 12, carbs_g: 38, fat_g: 8,  fiber_g: 9,  serving: '1 cup (200g)' },
  { id: 'rajma',           emoji: '🫘', name: 'Rajma',               calories: 260, protein_g: 13, carbs_g: 42, fat_g: 4,  fiber_g: 8,  serving: '1 cup (200g)' },
  { id: 'biryani-veg',     emoji: '🍛', name: 'Veg Biryani',         calories: 380, protein_g: 8,  carbs_g: 65, fat_g: 10, fiber_g: 4,  serving: '1 plate (250g)' },
  { id: 'biryani-chicken', emoji: '🍛', name: 'Chicken Biryani',     calories: 480, protein_g: 28, carbs_g: 55, fat_g: 14, fiber_g: 3,  serving: '1 plate (300g)' },
  { id: 'upma',            emoji: '🥣', name: 'Upma',                calories: 200, protein_g: 5,  carbs_g: 35, fat_g: 5,  fiber_g: 2,  serving: '1 bowl (180g)' },
  { id: 'paratha-plain',   emoji: '🫓', name: 'Plain Paratha',       calories: 180, protein_g: 4,  carbs_g: 28, fat_g: 6,  fiber_g: 2,  serving: '1 piece (70g)' },
  { id: 'paratha-aloo',    emoji: '🫓', name: 'Aloo Paratha',        calories: 250, protein_g: 5,  carbs_g: 38, fat_g: 9,  fiber_g: 3,  serving: '1 piece (100g)' },
  { id: 'chai-milk',       emoji: '🍵', name: 'Masala Chai (Milk)',  calories: 80,  protein_g: 3,  carbs_g: 10, fat_g: 3,  fiber_g: 0,  serving: '1 cup (200ml)' },
  { id: 'lassi-plain',     emoji: '🥛', name: 'Lassi (Plain)',       calories: 150, protein_g: 6,  carbs_g: 18, fat_g: 6,  fiber_g: 0,  serving: '1 glass (250ml)' },

  // ── Proteins ─────────────────────────────────────────────────────────────────
  { id: 'chicken-breast',  emoji: '🍗', name: 'Chicken Breast',      calories: 165, protein_g: 31, carbs_g: 0,  fat_g: 4,  fiber_g: 0,  serving: '100g (cooked)' },
  { id: 'chicken-thigh',   emoji: '🍗', name: 'Chicken Thigh',       calories: 210, protein_g: 26, carbs_g: 0,  fat_g: 11, fiber_g: 0,  serving: '100g (cooked)' },
  { id: 'egg-whole',       emoji: '🥚', name: 'Egg (Whole)',          calories: 78,  protein_g: 6,  carbs_g: 1,  fat_g: 5,  fiber_g: 0,  serving: '1 large egg (50g)' },
  { id: 'egg-whites',      emoji: '🥚', name: 'Egg Whites',           calories: 52,  protein_g: 11, carbs_g: 1,  fat_g: 0,  fiber_g: 0,  serving: '100g' },
  { id: 'tuna-can',        emoji: '🐟', name: 'Tuna (Canned)',        calories: 130, protein_g: 28, carbs_g: 0,  fat_g: 1,  fiber_g: 0,  serving: '100g (drained)' },
  { id: 'salmon',          emoji: '🐟', name: 'Salmon',               calories: 208, protein_g: 20, carbs_g: 0,  fat_g: 13, fiber_g: 0,  serving: '100g (cooked)' },
  { id: 'greek-yogurt',    emoji: '🥛', name: 'Greek Yogurt (0%)',    calories: 59,  protein_g: 10, carbs_g: 4,  fat_g: 0,  fiber_g: 0,  serving: '100g' },
  { id: 'whey-protein',    emoji: '🥤', name: 'Whey Protein Shake',   calories: 130, protein_g: 25, carbs_g: 5,  fat_g: 2,  fiber_g: 0,  serving: '1 scoop (35g)' },
  { id: 'tofu',            emoji: '🧊', name: 'Tofu (Firm)',          calories: 76,  protein_g: 8,  carbs_g: 2,  fat_g: 4,  fiber_g: 0,  serving: '100g' },

  // ── Grains & carbs ───────────────────────────────────────────────────────────
  { id: 'white-rice',      emoji: '🍚', name: 'White Rice (Cooked)',  calories: 206, protein_g: 4,  carbs_g: 45, fat_g: 0,  fiber_g: 1,  serving: '1 cup (186g)' },
  { id: 'brown-rice',      emoji: '🍚', name: 'Brown Rice (Cooked)',  calories: 216, protein_g: 5,  carbs_g: 45, fat_g: 2,  fiber_g: 4,  serving: '1 cup (202g)' },
  { id: 'oats-plain',      emoji: '🥣', name: 'Oats (Rolled)',        calories: 150, protein_g: 5,  carbs_g: 27, fat_g: 3,  fiber_g: 4,  serving: '½ cup dry (40g)' },
  { id: 'bread-white',     emoji: '🍞', name: 'Bread (White)',        calories: 79,  protein_g: 3,  carbs_g: 15, fat_g: 1,  fiber_g: 1,  serving: '1 slice (30g)' },
  { id: 'bread-brown',     emoji: '🍞', name: 'Bread (Brown/Wheat)',  calories: 69,  protein_g: 4,  carbs_g: 12, fat_g: 1,  fiber_g: 2,  serving: '1 slice (30g)' },
  { id: 'pasta',           emoji: '🍝', name: 'Pasta (Cooked)',       calories: 220, protein_g: 8,  carbs_g: 43, fat_g: 1,  fiber_g: 3,  serving: '1 cup (140g)' },

  // ── Fruits ───────────────────────────────────────────────────────────────────
  { id: 'banana',          emoji: '🍌', name: 'Banana',               calories: 105, protein_g: 1,  carbs_g: 27, fat_g: 0,  fiber_g: 3,  serving: '1 medium (118g)' },
  { id: 'apple',           emoji: '🍎', name: 'Apple',                calories: 95,  protein_g: 0,  carbs_g: 25, fat_g: 0,  fiber_g: 4,  serving: '1 medium (182g)' },
  { id: 'mango',           emoji: '🥭', name: 'Mango',                calories: 135, protein_g: 1,  carbs_g: 35, fat_g: 1,  fiber_g: 4,  serving: '1 cup sliced (165g)' },
  { id: 'orange',          emoji: '🍊', name: 'Orange',               calories: 62,  protein_g: 1,  carbs_g: 15, fat_g: 0,  fiber_g: 3,  serving: '1 medium (131g)' },
  { id: 'strawberries',    emoji: '🍓', name: 'Strawberries',         calories: 49,  protein_g: 1,  carbs_g: 12, fat_g: 0,  fiber_g: 3,  serving: '1 cup (152g)' },
  { id: 'watermelon',      emoji: '🍉', name: 'Watermelon',           calories: 86,  protein_g: 2,  carbs_g: 22, fat_g: 0,  fiber_g: 1,  serving: '2 cups (280g)' },
  { id: 'grapes',          emoji: '🍇', name: 'Grapes',               calories: 62,  protein_g: 1,  carbs_g: 16, fat_g: 0,  fiber_g: 1,  serving: '½ cup (76g)' },

  // ── Vegetables ───────────────────────────────────────────────────────────────
  { id: 'spinach',         emoji: '🥬', name: 'Spinach (Cooked)',     calories: 41,  protein_g: 5,  carbs_g: 7,  fat_g: 0,  fiber_g: 4,  serving: '1 cup (180g)' },
  { id: 'broccoli',        emoji: '🥦', name: 'Broccoli (Cooked)',    calories: 55,  protein_g: 4,  carbs_g: 11, fat_g: 1,  fiber_g: 5,  serving: '1 cup (156g)' },
  { id: 'sweet-potato',    emoji: '🍠', name: 'Sweet Potato',         calories: 103, protein_g: 2,  carbs_g: 24, fat_g: 0,  fiber_g: 4,  serving: '1 medium (130g)' },

  // ── Dairy & fats ─────────────────────────────────────────────────────────────
  { id: 'whole-milk',      emoji: '🥛', name: 'Whole Milk',           calories: 149, protein_g: 8,  carbs_g: 12, fat_g: 8,  fiber_g: 0,  serving: '1 cup (244ml)' },
  { id: 'skim-milk',       emoji: '🥛', name: 'Skim Milk',            calories: 83,  protein_g: 8,  carbs_g: 12, fat_g: 0,  fiber_g: 0,  serving: '1 cup (244ml)' },
  { id: 'cheese-cheddar',  emoji: '🧀', name: 'Cheddar Cheese',       calories: 113, protein_g: 7,  carbs_g: 0,  fat_g: 9,  fiber_g: 0,  serving: '1 slice (28g)' },
  { id: 'butter',          emoji: '🧈', name: 'Butter',               calories: 102, protein_g: 0,  carbs_g: 0,  fat_g: 12, fiber_g: 0,  serving: '1 tbsp (14g)' },
  { id: 'peanut-butter',   emoji: '🥜', name: 'Peanut Butter',        calories: 188, protein_g: 8,  carbs_g: 6,  fat_g: 16, fiber_g: 2,  serving: '2 tbsp (32g)' },
  { id: 'avocado',         emoji: '🥑', name: 'Avocado',              calories: 234, protein_g: 3,  carbs_g: 12, fat_g: 21, fiber_g: 10, serving: '1 medium (150g)' },
  { id: 'almonds',         emoji: '🌰', name: 'Almonds',              calories: 164, protein_g: 6,  carbs_g: 6,  fat_g: 14, fiber_g: 4,  serving: '1 oz / 23 nuts (28g)' },
  { id: 'olive-oil',       emoji: '🫙', name: 'Olive Oil',            calories: 119, protein_g: 0,  carbs_g: 0,  fat_g: 14, fiber_g: 0,  serving: '1 tbsp (14g)' },

  // ── Snacks & drinks ──────────────────────────────────────────────────────────
  { id: 'protein-bar',     emoji: '🍫', name: 'Protein Bar',          calories: 200, protein_g: 20, carbs_g: 22, fat_g: 7,  fiber_g: 3,  serving: '1 bar (55g)' },
  { id: 'coffee-black',    emoji: '☕', name: 'Coffee (Black)',        calories: 2,   protein_g: 0,  carbs_g: 0,  fat_g: 0,  fiber_g: 0,  serving: '1 cup (240ml)' },
  { id: 'green-tea',       emoji: '🍵', name: 'Green Tea',            calories: 2,   protein_g: 0,  carbs_g: 0,  fat_g: 0,  fiber_g: 0,  serving: '1 cup (240ml)' },
  { id: 'orange-juice',    emoji: '🍊', name: 'Orange Juice',         calories: 112, protein_g: 2,  carbs_g: 26, fat_g: 0,  fiber_g: 0,  serving: '1 cup (248ml)' },
]

export default FOODS

// Search helper — matches name, returns sorted results
export function searchFoods(query) {
  if (!query || query.trim().length < 1) return []
  const q = query.toLowerCase().trim()
  return FOODS
    .filter(f => f.name.toLowerCase().includes(q))
    .slice(0, 10)
}

// Get food by id
export function getFoodById(id) {
  return FOODS.find(f => f.id === id) || null
}

export const POPULAR_FOODS = FOODS.slice(0, 8)

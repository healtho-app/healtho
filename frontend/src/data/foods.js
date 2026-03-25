// Local food database — covers Indian staples + common western foods
// Each entry: id, name, emoji, calories, protein_g, carbs_g, fat_g, fiber_g, serving, type ('food'|'drink')
// All values are per serving size listed

const FOODS = [
  // ── Indian staples ──────────────────────────────────────────────────────────
  { id: 'dal-rice',        type: 'food', emoji: '🍚', name: 'Dal Rice',           calories: 450, protein_g: 12, carbs_g: 68, fat_g: 5,  fiber_g: 4,  serving: '1 plate (300g)' },
  { id: 'roti-wheat',      type: 'food', emoji: '🫓', name: 'Roti (Wheat)',        calories: 95,  protein_g: 3,  carbs_g: 18, fat_g: 1,  fiber_g: 2,  serving: '1 piece (40g)' },
  { id: 'paneer-100g',     type: 'food', emoji: '🧀', name: 'Paneer',              calories: 265, protein_g: 18, carbs_g: 1,  fat_g: 20, fiber_g: 0,  serving: '100g' },
  { id: 'masala-oats',     type: 'food', emoji: '🥣', name: 'Masala Oats',         calories: 210, protein_g: 7,  carbs_g: 35, fat_g: 4,  fiber_g: 3,  serving: '1 bowl (200ml)' },
  { id: 'poha',            type: 'food', emoji: '🍛', name: 'Poha',                calories: 250, protein_g: 5,  carbs_g: 48, fat_g: 4,  fiber_g: 2,  serving: '1 plate (150g)' },
  { id: 'idli',            type: 'food', emoji: '🤍', name: 'Idli',                calories: 78,  protein_g: 2,  carbs_g: 16, fat_g: 0,  fiber_g: 1,  serving: '1 piece (60g)' },
  { id: 'dosa',            type: 'food', emoji: '🥞', name: 'Dosa (Plain)',         calories: 168, protein_g: 4,  carbs_g: 32, fat_g: 3,  fiber_g: 1,  serving: '1 medium (80g)' },
  { id: 'sambar',          type: 'food', emoji: '🍲', name: 'Sambar',              calories: 90,  protein_g: 4,  carbs_g: 14, fat_g: 2,  fiber_g: 3,  serving: '1 cup (200ml)' },
  { id: 'chana-masala',    type: 'food', emoji: '🫘', name: 'Chana Masala',        calories: 280, protein_g: 12, carbs_g: 38, fat_g: 8,  fiber_g: 9,  serving: '1 cup (200g)' },
  { id: 'rajma',           type: 'food', emoji: '🫘', name: 'Rajma',               calories: 260, protein_g: 13, carbs_g: 42, fat_g: 4,  fiber_g: 8,  serving: '1 cup (200g)' },
  { id: 'biryani-veg',     type: 'food', emoji: '🍛', name: 'Veg Biryani',         calories: 380, protein_g: 8,  carbs_g: 65, fat_g: 10, fiber_g: 4,  serving: '1 plate (250g)' },
  { id: 'biryani-chicken', type: 'food', emoji: '🍛', name: 'Chicken Biryani',     calories: 480, protein_g: 28, carbs_g: 55, fat_g: 14, fiber_g: 3,  serving: '1 plate (300g)' },
  { id: 'upma',            type: 'food', emoji: '🥣', name: 'Upma',                calories: 200, protein_g: 5,  carbs_g: 35, fat_g: 5,  fiber_g: 2,  serving: '1 bowl (180g)' },
  { id: 'paratha-plain',   type: 'food', emoji: '🫓', name: 'Plain Paratha',       calories: 180, protein_g: 4,  carbs_g: 28, fat_g: 6,  fiber_g: 2,  serving: '1 piece (70g)' },
  { id: 'paratha-aloo',    type: 'food', emoji: '🫓', name: 'Aloo Paratha',        calories: 250, protein_g: 5,  carbs_g: 38, fat_g: 9,  fiber_g: 3,  serving: '1 piece (100g)' },

  // ── Proteins ─────────────────────────────────────────────────────────────────
  { id: 'chicken-breast',  type: 'food', emoji: '🍗', name: 'Chicken Breast',      calories: 165, protein_g: 31, carbs_g: 0,  fat_g: 4,  fiber_g: 0,  serving: '100g (cooked)' },
  { id: 'chicken-thigh',   type: 'food', emoji: '🍗', name: 'Chicken Thigh',       calories: 210, protein_g: 26, carbs_g: 0,  fat_g: 11, fiber_g: 0,  serving: '100g (cooked)' },
  { id: 'egg-whole',       type: 'food', emoji: '🥚', name: 'Egg (Whole)',          calories: 78,  protein_g: 6,  carbs_g: 1,  fat_g: 5,  fiber_g: 0,  serving: '1 large egg (50g)' },
  { id: 'egg-whites',      type: 'food', emoji: '🥚', name: 'Egg Whites',           calories: 52,  protein_g: 11, carbs_g: 1,  fat_g: 0,  fiber_g: 0,  serving: '100g' },
  { id: 'tuna-can',        type: 'food', emoji: '🐟', name: 'Tuna (Canned)',        calories: 130, protein_g: 28, carbs_g: 0,  fat_g: 1,  fiber_g: 0,  serving: '100g (drained)' },
  { id: 'salmon',          type: 'food', emoji: '🐟', name: 'Salmon',               calories: 208, protein_g: 20, carbs_g: 0,  fat_g: 13, fiber_g: 0,  serving: '100g (cooked)' },
  { id: 'greek-yogurt',    type: 'food', emoji: '🥛', name: 'Greek Yogurt (0%)',    calories: 59,  protein_g: 10, carbs_g: 4,  fat_g: 0,  fiber_g: 0,  serving: '100g' },
  { id: 'tofu',            type: 'food', emoji: '🧊', name: 'Tofu (Firm)',          calories: 76,  protein_g: 8,  carbs_g: 2,  fat_g: 4,  fiber_g: 0,  serving: '100g' },

  // ── Grains & carbs ───────────────────────────────────────────────────────────
  { id: 'white-rice',      type: 'food', emoji: '🍚', name: 'White Rice (Cooked)',  calories: 206, protein_g: 4,  carbs_g: 45, fat_g: 0,  fiber_g: 1,  serving: '1 cup (186g)' },
  { id: 'brown-rice',      type: 'food', emoji: '🍚', name: 'Brown Rice (Cooked)',  calories: 216, protein_g: 5,  carbs_g: 45, fat_g: 2,  fiber_g: 4,  serving: '1 cup (202g)' },
  { id: 'oats-plain',      type: 'food', emoji: '🥣', name: 'Oats (Rolled)',        calories: 150, protein_g: 5,  carbs_g: 27, fat_g: 3,  fiber_g: 4,  serving: '½ cup dry (40g)' },
  { id: 'bread-white',     type: 'food', emoji: '🍞', name: 'Bread (White)',        calories: 79,  protein_g: 3,  carbs_g: 15, fat_g: 1,  fiber_g: 1,  serving: '1 slice (30g)' },
  { id: 'bread-brown',     type: 'food', emoji: '🍞', name: 'Bread (Brown/Wheat)',  calories: 69,  protein_g: 4,  carbs_g: 12, fat_g: 1,  fiber_g: 2,  serving: '1 slice (30g)' },
  { id: 'pasta',           type: 'food', emoji: '🍝', name: 'Pasta (Cooked)',       calories: 220, protein_g: 8,  carbs_g: 43, fat_g: 1,  fiber_g: 3,  serving: '1 cup (140g)' },

  // ── Fruits ───────────────────────────────────────────────────────────────────
  { id: 'banana',          type: 'food', emoji: '🍌', name: 'Banana',               calories: 105, protein_g: 1,  carbs_g: 27, fat_g: 0,  fiber_g: 3,  serving: '1 medium (118g)' },
  { id: 'apple',           type: 'food', emoji: '🍎', name: 'Apple',                calories: 95,  protein_g: 0,  carbs_g: 25, fat_g: 0,  fiber_g: 4,  serving: '1 medium (182g)' },
  { id: 'mango',           type: 'food', emoji: '🥭', name: 'Mango',                calories: 135, protein_g: 1,  carbs_g: 35, fat_g: 1,  fiber_g: 4,  serving: '1 cup sliced (165g)' },
  { id: 'orange',          type: 'food', emoji: '🍊', name: 'Orange',               calories: 62,  protein_g: 1,  carbs_g: 15, fat_g: 0,  fiber_g: 3,  serving: '1 medium (131g)' },
  { id: 'strawberries',    type: 'food', emoji: '🍓', name: 'Strawberries',         calories: 49,  protein_g: 1,  carbs_g: 12, fat_g: 0,  fiber_g: 3,  serving: '1 cup (152g)' },
  { id: 'watermelon',      type: 'food', emoji: '🍉', name: 'Watermelon',           calories: 86,  protein_g: 2,  carbs_g: 22, fat_g: 0,  fiber_g: 1,  serving: '2 cups (280g)' },
  { id: 'grapes',          type: 'food', emoji: '🍇', name: 'Grapes',               calories: 62,  protein_g: 1,  carbs_g: 16, fat_g: 0,  fiber_g: 1,  serving: '½ cup (76g)' },

  // ── Vegetables ───────────────────────────────────────────────────────────────
  { id: 'spinach',         type: 'food', emoji: '🥬', name: 'Spinach (Cooked)',     calories: 41,  protein_g: 5,  carbs_g: 7,  fat_g: 0,  fiber_g: 4,  serving: '1 cup (180g)' },
  { id: 'broccoli',        type: 'food', emoji: '🥦', name: 'Broccoli (Cooked)',    calories: 55,  protein_g: 4,  carbs_g: 11, fat_g: 1,  fiber_g: 5,  serving: '1 cup (156g)' },
  { id: 'sweet-potato',    type: 'food', emoji: '🍠', name: 'Sweet Potato',         calories: 103, protein_g: 2,  carbs_g: 24, fat_g: 0,  fiber_g: 4,  serving: '1 medium (130g)' },

  // ── Dairy & fats ─────────────────────────────────────────────────────────────
  { id: 'whole-milk',      type: 'food', emoji: '🥛', name: 'Whole Milk',           calories: 149, protein_g: 8,  carbs_g: 12, fat_g: 8,  fiber_g: 0,  serving: '1 cup (244ml)' },
  { id: 'skim-milk',       type: 'food', emoji: '🥛', name: 'Skim Milk',            calories: 83,  protein_g: 8,  carbs_g: 12, fat_g: 0,  fiber_g: 0,  serving: '1 cup (244ml)' },
  { id: 'cheese-cheddar',  type: 'food', emoji: '🧀', name: 'Cheddar Cheese',       calories: 113, protein_g: 7,  carbs_g: 0,  fat_g: 9,  fiber_g: 0,  serving: '1 slice (28g)' },
  { id: 'butter',          type: 'food', emoji: '🧈', name: 'Butter',               calories: 102, protein_g: 0,  carbs_g: 0,  fat_g: 12, fiber_g: 0,  serving: '1 tbsp (14g)' },
  { id: 'peanut-butter',   type: 'food', emoji: '🥜', name: 'Peanut Butter',        calories: 188, protein_g: 8,  carbs_g: 6,  fat_g: 16, fiber_g: 2,  serving: '2 tbsp (32g)' },
  { id: 'avocado',         type: 'food', emoji: '🥑', name: 'Avocado',              calories: 234, protein_g: 3,  carbs_g: 12, fat_g: 21, fiber_g: 10, serving: '1 medium (150g)' },
  { id: 'almonds',         type: 'food', emoji: '🌰', name: 'Almonds',              calories: 164, protein_g: 6,  carbs_g: 6,  fat_g: 14, fiber_g: 4,  serving: '1 oz / 23 nuts (28g)' },
  { id: 'olive-oil',       type: 'food', emoji: '🫙', name: 'Olive Oil',            calories: 119, protein_g: 0,  carbs_g: 0,  fat_g: 14, fiber_g: 0,  serving: '1 tbsp (14g)' },

  // ── Snacks ───────────────────────────────────────────────────────────────────
  { id: 'protein-bar',     type: 'food', emoji: '🍫', name: 'Protein Bar',          calories: 200, protein_g: 20, carbs_g: 22, fat_g: 7,  fiber_g: 3,  serving: '1 bar (55g)' },
]

const DRINKS = [
  // ── Zero / low cal ───────────────────────────────────────────────────────────
  { id: 'water',           type: 'drink', emoji: '💧', name: 'Water',               calories: 0,   protein_g: 0,  carbs_g: 0,  fat_g: 0,  fiber_g: 0,  serving: '1 glass (250ml)' },
  { id: 'coffee-black',    type: 'drink', emoji: '☕', name: 'Coffee (Black)',       calories: 2,   protein_g: 0,  carbs_g: 0,  fat_g: 0,  fiber_g: 0,  serving: '1 cup (240ml)' },
  { id: 'green-tea',       type: 'drink', emoji: '🍵', name: 'Green Tea',            calories: 2,   protein_g: 0,  carbs_g: 0,  fat_g: 0,  fiber_g: 0,  serving: '1 cup (240ml)' },
  { id: 'black-tea',       type: 'drink', emoji: '🍵', name: 'Black Tea',            calories: 2,   protein_g: 0,  carbs_g: 0,  fat_g: 0,  fiber_g: 0,  serving: '1 cup (240ml)' },
  { id: 'sparkling-water', type: 'drink', emoji: '💧', name: 'Sparkling Water',      calories: 0,   protein_g: 0,  carbs_g: 0,  fat_g: 0,  fiber_g: 0,  serving: '1 can (355ml)' },

  // ── Indian drinks ────────────────────────────────────────────────────────────
  { id: 'chai-milk',       type: 'drink', emoji: '🍵', name: 'Masala Chai (Milk)',  calories: 80,  protein_g: 3,  carbs_g: 10, fat_g: 3,  fiber_g: 0,  serving: '1 cup (200ml)' },
  { id: 'lassi-plain',     type: 'drink', emoji: '🥛', name: 'Lassi (Plain)',       calories: 150, protein_g: 6,  carbs_g: 18, fat_g: 6,  fiber_g: 0,  serving: '1 glass (250ml)' },
  { id: 'lassi-mango',     type: 'drink', emoji: '🥭', name: 'Mango Lassi',         calories: 210, protein_g: 5,  carbs_g: 38, fat_g: 5,  fiber_g: 1,  serving: '1 glass (250ml)' },
  { id: 'nimbu-pani',      type: 'drink', emoji: '🍋', name: 'Nimbu Pani',          calories: 40,  protein_g: 0,  carbs_g: 10, fat_g: 0,  fiber_g: 0,  serving: '1 glass (250ml)' },
  { id: 'coconut-water',   type: 'drink', emoji: '🥥', name: 'Coconut Water',       calories: 46,  protein_g: 2,  carbs_g: 9,  fat_g: 0,  fiber_g: 3,  serving: '1 cup (240ml)' },

  // ── Juices ───────────────────────────────────────────────────────────────────
  { id: 'orange-juice',    type: 'drink', emoji: '🍊', name: 'Orange Juice',        calories: 112, protein_g: 2,  carbs_g: 26, fat_g: 0,  fiber_g: 0,  serving: '1 cup (248ml)' },
  { id: 'apple-juice',     type: 'drink', emoji: '🍎', name: 'Apple Juice',         calories: 114, protein_g: 0,  carbs_g: 28, fat_g: 0,  fiber_g: 0,  serving: '1 cup (248ml)' },
  { id: 'mango-juice',     type: 'drink', emoji: '🥭', name: 'Mango Juice',         calories: 128, protein_g: 1,  carbs_g: 32, fat_g: 0,  fiber_g: 0,  serving: '1 cup (248ml)' },
  { id: 'tomato-juice',    type: 'drink', emoji: '🍅', name: 'Tomato Juice',        calories: 41,  protein_g: 2,  carbs_g: 10, fat_g: 0,  fiber_g: 1,  serving: '1 cup (243ml)' },

  // ── Milk & dairy drinks ──────────────────────────────────────────────────────
  { id: 'whole-milk-d',    type: 'drink', emoji: '🥛', name: 'Whole Milk',          calories: 149, protein_g: 8,  carbs_g: 12, fat_g: 8,  fiber_g: 0,  serving: '1 cup (244ml)' },
  { id: 'skim-milk-d',     type: 'drink', emoji: '🥛', name: 'Skim Milk',           calories: 83,  protein_g: 8,  carbs_g: 12, fat_g: 0,  fiber_g: 0,  serving: '1 cup (244ml)' },
  { id: 'chocolate-milk',  type: 'drink', emoji: '🍫', name: 'Chocolate Milk',      calories: 208, protein_g: 8,  carbs_g: 32, fat_g: 5,  fiber_g: 1,  serving: '1 cup (244ml)' },
  { id: 'almond-milk',     type: 'drink', emoji: '🥛', name: 'Almond Milk (Unswt)', calories: 30,  protein_g: 1,  carbs_g: 1,  fat_g: 3,  fiber_g: 1,  serving: '1 cup (244ml)' },
  { id: 'oat-milk',        type: 'drink', emoji: '🥛', name: 'Oat Milk',            calories: 120, protein_g: 3,  carbs_g: 16, fat_g: 5,  fiber_g: 2,  serving: '1 cup (244ml)' },

  // ── Coffee & café drinks ─────────────────────────────────────────────────────
  { id: 'latte',           type: 'drink', emoji: '☕', name: 'Latte (Whole Milk)',  calories: 190, protein_g: 10, carbs_g: 15, fat_g: 7,  fiber_g: 0,  serving: '16oz (grande)' },
  { id: 'cappuccino',      type: 'drink', emoji: '☕', name: 'Cappuccino',          calories: 120, protein_g: 7,  carbs_g: 10, fat_g: 4,  fiber_g: 0,  serving: '12oz (tall)' },
  { id: 'cold-coffee',     type: 'drink', emoji: '🧋', name: 'Cold Coffee (Milk)',  calories: 150, protein_g: 5,  carbs_g: 22, fat_g: 5,  fiber_g: 0,  serving: '1 glass (300ml)' },
  { id: 'black-coffee-s',  type: 'drink', emoji: '☕', name: 'Coffee with Sugar',   calories: 30,  protein_g: 0,  carbs_g: 8,  fat_g: 0,  fiber_g: 0,  serving: '1 cup (240ml)' },

  // ── Protein & fitness ────────────────────────────────────────────────────────
  { id: 'whey-shake',      type: 'drink', emoji: '🥤', name: 'Whey Protein Shake',  calories: 130, protein_g: 25, carbs_g: 5,  fat_g: 2,  fiber_g: 0,  serving: '1 scoop in water (35g)' },
  { id: 'protein-smoothie',type: 'drink', emoji: '🥤', name: 'Protein Smoothie',    calories: 280, protein_g: 28, carbs_g: 30, fat_g: 5,  fiber_g: 3,  serving: '1 serving (400ml)' },
  { id: 'sports-drink',    type: 'drink', emoji: '🧃', name: 'Sports Drink',        calories: 80,  protein_g: 0,  carbs_g: 21, fat_g: 0,  fiber_g: 0,  serving: '1 bottle (500ml)' },
  { id: 'bcaa-drink',      type: 'drink', emoji: '🥤', name: 'BCAA Drink',          calories: 15,  protein_g: 3,  carbs_g: 1,  fat_g: 0,  fiber_g: 0,  serving: '1 scoop in water (10g)' },

  // ── Soft drinks ──────────────────────────────────────────────────────────────
  { id: 'cola',            type: 'drink', emoji: '🥤', name: 'Cola (Regular)',      calories: 140, protein_g: 0,  carbs_g: 39, fat_g: 0,  fiber_g: 0,  serving: '1 can (355ml)' },
  { id: 'diet-cola',       type: 'drink', emoji: '🥤', name: 'Diet Cola',           calories: 0,   protein_g: 0,  carbs_g: 0,  fat_g: 0,  fiber_g: 0,  serving: '1 can (355ml)' },
  { id: 'lemonade',        type: 'drink', emoji: '🍋', name: 'Lemonade',            calories: 99,  protein_g: 0,  carbs_g: 26, fat_g: 0,  fiber_g: 0,  serving: '1 cup (248ml)' },
]

const ALL_ITEMS = [...FOODS, ...DRINKS]

export default FOODS
export { DRINKS }

// Search foods only
export function searchFoods(query) {
  if (!query || query.trim().length < 1) return []
  const q = query.toLowerCase().trim()
  return FOODS.filter(f => f.name.toLowerCase().includes(q)).slice(0, 10)
}

// Search drinks only
export function searchDrinks(query) {
  if (!query || query.trim().length < 1) return []
  const q = query.toLowerCase().trim()
  return DRINKS.filter(d => d.name.toLowerCase().includes(q)).slice(0, 10)
}

// Get any item by id (food or drink)
export function getFoodById(id) {
  return ALL_ITEMS.find(f => f.id === id) || null
}

export const POPULAR_FOODS  = FOODS.slice(0, 8)
export const POPULAR_DRINKS = DRINKS.slice(0, 8)

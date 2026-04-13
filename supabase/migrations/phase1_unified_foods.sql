-- ============================================================================
-- Phase 1: Unified Foods Table Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create unified foods table
CREATE TABLE IF NOT EXISTS foods (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name               text NOT NULL,
  normalized_name    text NOT NULL,
  emoji              text DEFAULT '🍽️',
  type               text NOT NULL DEFAULT 'food' CHECK (type IN ('food', 'drink')),
  calories           numeric NOT NULL DEFAULT 0,
  protein_g          numeric NOT NULL DEFAULT 0,
  carbs_g            numeric NOT NULL DEFAULT 0,
  fat_g              numeric NOT NULL DEFAULT 0,
  fiber_g            numeric NOT NULL DEFAULT 0,
  serving            text NOT NULL DEFAULT '1 serving',
  source             text NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'user', 'usda')),
  is_verified        boolean NOT NULL DEFAULT false,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usda_fdc_id        text,
  created_at         timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_foods_normalized_name_trgm ON foods USING gin (normalized_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_foods_type ON foods (type);
CREATE INDEX IF NOT EXISTS idx_foods_verified ON foods (is_verified);
CREATE INDEX IF NOT EXISTS idx_foods_created_by ON foods (created_by_user_id);

-- 4. RLS
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

-- Everyone can read global foods (created_by_user_id IS NULL)
CREATE POLICY "Anyone can read global foods" ON foods
  FOR SELECT USING (created_by_user_id IS NULL);

-- Authenticated users can read their own custom foods
CREATE POLICY "Users can read own foods" ON foods
  FOR SELECT TO authenticated
  USING (created_by_user_id = auth.uid());

-- Authenticated users can insert their own foods
CREATE POLICY "Users can insert own foods" ON foods
  FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

-- Authenticated users can update their own foods
CREATE POLICY "Users can update own foods" ON foods
  FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid());

-- Authenticated users can delete their own foods
CREATE POLICY "Users can delete own foods" ON foods
  FOR DELETE TO authenticated
  USING (created_by_user_id = auth.uid());

-- 5. Seed 78 foods (48 foods + 30 drinks)
INSERT INTO foods (name, normalized_name, emoji, type, calories, protein_g, carbs_g, fat_g, fiber_g, serving, source, is_verified) VALUES
-- Indian staples
('Dal Rice',           'dal rice',           '🍚', 'food', 450, 12, 68, 5,  4,  '1 plate (300g)',      'local', true),
('Roti (Wheat)',       'roti (wheat)',       '🫓', 'food', 95,  3,  18, 1,  2,  '1 piece (40g)',       'local', true),
('Paneer',             'paneer',             '🧀', 'food', 265, 18, 1,  20, 0,  '100g',                'local', true),
('Masala Oats',        'masala oats',        '🥣', 'food', 210, 7,  35, 4,  3,  '1 bowl (200ml)',      'local', true),
('Poha',               'poha',               '🍛', 'food', 250, 5,  48, 4,  2,  '1 plate (150g)',      'local', true),
('Idli',               'idli',               '🤍', 'food', 78,  2,  16, 0,  1,  '1 piece (60g)',       'local', true),
('Dosa (Plain)',       'dosa (plain)',       '🥞', 'food', 168, 4,  32, 3,  1,  '1 medium (80g)',      'local', true),
('Sambar',             'sambar',             '🍲', 'food', 90,  4,  14, 2,  3,  '1 cup (200ml)',       'local', true),
('Chana Masala',       'chana masala',       '🫘', 'food', 280, 12, 38, 8,  9,  '1 cup (200g)',        'local', true),
('Rajma',              'rajma',              '🫘', 'food', 260, 13, 42, 4,  8,  '1 cup (200g)',        'local', true),
('Veg Biryani',        'veg biryani',        '🍛', 'food', 380, 8,  65, 10, 4,  '1 plate (250g)',      'local', true),
('Chicken Biryani',    'chicken biryani',    '🍛', 'food', 480, 28, 55, 14, 3,  '1 plate (300g)',      'local', true),
('Upma',               'upma',               '🥣', 'food', 200, 5,  35, 5,  2,  '1 bowl (180g)',       'local', true),
('Plain Paratha',      'plain paratha',      '🫓', 'food', 180, 4,  28, 6,  2,  '1 piece (70g)',       'local', true),
('Aloo Paratha',       'aloo paratha',       '🫓', 'food', 250, 5,  38, 9,  3,  '1 piece (100g)',      'local', true),
-- Proteins
('Chicken Breast',     'chicken breast',     '🍗', 'food', 165, 31, 0,  4,  0,  '100g (cooked)',       'local', true),
('Chicken Thigh',      'chicken thigh',      '🍗', 'food', 210, 26, 0,  11, 0,  '100g (cooked)',       'local', true),
('Egg (Whole)',        'egg (whole)',        '🥚', 'food', 78,  6,  1,  5,  0,  '1 large egg (50g)',   'local', true),
('Egg Whites',         'egg whites',         '🥚', 'food', 52,  11, 1,  0,  0,  '100g',                'local', true),
('Tuna (Canned)',      'tuna (canned)',      '🐟', 'food', 130, 28, 0,  1,  0,  '100g (drained)',      'local', true),
('Salmon',             'salmon',             '🐟', 'food', 208, 20, 0,  13, 0,  '100g (cooked)',       'local', true),
('Greek Yogurt (0%)',  'greek yogurt (0%)',  '🥛', 'food', 59,  10, 4,  0,  0,  '100g',                'local', true),
('Tofu (Firm)',        'tofu (firm)',        '🧊', 'food', 76,  8,  2,  4,  0,  '100g',                'local', true),
-- Grains & carbs
('White Rice (Cooked)','white rice (cooked)','🍚', 'food', 206, 4,  45, 0,  1,  '1 cup (186g)',        'local', true),
('Brown Rice (Cooked)','brown rice (cooked)','🍚', 'food', 216, 5,  45, 2,  4,  '1 cup (202g)',        'local', true),
('Oats (Rolled)',      'oats (rolled)',      '🥣', 'food', 150, 5,  27, 3,  4,  '½ cup dry (40g)',     'local', true),
('Bread (White)',      'bread (white)',      '🍞', 'food', 79,  3,  15, 1,  1,  '1 slice (30g)',       'local', true),
('Bread (Brown/Wheat)','bread (brown/wheat)','🍞', 'food', 69,  4,  12, 1,  2,  '1 slice (30g)',       'local', true),
('Pasta (Cooked)',     'pasta (cooked)',     '🍝', 'food', 220, 8,  43, 1,  3,  '1 cup (140g)',        'local', true),
-- Fruits
('Banana',             'banana',             '🍌', 'food', 105, 1,  27, 0,  3,  '1 medium (118g)',     'local', true),
('Apple',              'apple',              '🍎', 'food', 95,  0,  25, 0,  4,  '1 medium (182g)',     'local', true),
('Mango',              'mango',              '🥭', 'food', 135, 1,  35, 1,  4,  '1 cup sliced (165g)', 'local', true),
('Orange',             'orange',             '🍊', 'food', 62,  1,  15, 0,  3,  '1 medium (131g)',     'local', true),
('Strawberries',       'strawberries',       '🍓', 'food', 49,  1,  12, 0,  3,  '1 cup (152g)',        'local', true),
('Watermelon',         'watermelon',         '🍉', 'food', 86,  2,  22, 0,  1,  '2 cups (280g)',       'local', true),
('Grapes',             'grapes',             '🍇', 'food', 62,  1,  16, 0,  1,  '½ cup (76g)',         'local', true),
-- Vegetables
('Spinach (Cooked)',   'spinach (cooked)',   '🥬', 'food', 41,  5,  7,  0,  4,  '1 cup (180g)',        'local', true),
('Broccoli (Cooked)',  'broccoli (cooked)',  '🥦', 'food', 55,  4,  11, 1,  5,  '1 cup (156g)',        'local', true),
('Sweet Potato',       'sweet potato',       '🍠', 'food', 103, 2,  24, 0,  4,  '1 medium (130g)',     'local', true),
-- Dairy & fats
('Whole Milk',         'whole milk',         '🥛', 'food', 149, 8,  12, 8,  0,  '1 cup (244ml)',       'local', true),
('Skim Milk',          'skim milk',          '🥛', 'food', 83,  8,  12, 0,  0,  '1 cup (244ml)',       'local', true),
('Cheddar Cheese',     'cheddar cheese',     '🧀', 'food', 113, 7,  0,  9,  0,  '1 slice (28g)',       'local', true),
('Butter',             'butter',             '🧈', 'food', 102, 0,  0,  12, 0,  '1 tbsp (14g)',        'local', true),
('Peanut Butter',      'peanut butter',      '🥜', 'food', 188, 8,  6,  16, 2,  '2 tbsp (32g)',        'local', true),
('Avocado',            'avocado',            '🥑', 'food', 234, 3,  12, 21, 10, '1 medium (150g)',     'local', true),
('Almonds',            'almonds',            '🌰', 'food', 164, 6,  6,  14, 4,  '1 oz / 23 nuts (28g)','local', true),
('Olive Oil',          'olive oil',          '🫙', 'food', 119, 0,  0,  14, 0,  '1 tbsp (14g)',        'local', true),
-- Snacks
('Protein Bar',        'protein bar',        '🍫', 'food', 200, 20, 22, 7,  3,  '1 bar (55g)',         'local', true),

-- DRINKS (30)
('Water',              'water',              '💧', 'drink', 0,   0,  0,  0,  0,  '1 glass (250ml)',         'local', true),
('Coffee (Black)',     'coffee (black)',     '☕', 'drink', 2,   0,  0,  0,  0,  '1 cup (240ml)',           'local', true),
('Green Tea',          'green tea',          '🍵', 'drink', 2,   0,  0,  0,  0,  '1 cup (240ml)',           'local', true),
('Black Tea',          'black tea',          '🍵', 'drink', 2,   0,  0,  0,  0,  '1 cup (240ml)',           'local', true),
('Sparkling Water',    'sparkling water',    '💧', 'drink', 0,   0,  0,  0,  0,  '1 can (355ml)',           'local', true),
('Masala Chai (Milk)', 'masala chai (milk)', '🍵', 'drink', 80,  3,  10, 3,  0,  '1 cup (200ml)',           'local', true),
('Lassi (Plain)',      'lassi (plain)',      '🥛', 'drink', 150, 6,  18, 6,  0,  '1 glass (250ml)',         'local', true),
('Mango Lassi',        'mango lassi',        '🥭', 'drink', 210, 5,  38, 5,  1,  '1 glass (250ml)',         'local', true),
('Nimbu Pani',         'nimbu pani',         '🍋', 'drink', 40,  0,  10, 0,  0,  '1 glass (250ml)',         'local', true),
('Coconut Water',      'coconut water',      '🥥', 'drink', 46,  2,  9,  0,  3,  '1 cup (240ml)',           'local', true),
('Orange Juice',       'orange juice',       '🍊', 'drink', 112, 2,  26, 0,  0,  '1 cup (248ml)',           'local', true),
('Apple Juice',        'apple juice',        '🍎', 'drink', 114, 0,  28, 0,  0,  '1 cup (248ml)',           'local', true),
('Mango Juice',        'mango juice',        '🥭', 'drink', 128, 1,  32, 0,  0,  '1 cup (248ml)',           'local', true),
('Tomato Juice',       'tomato juice',       '🍅', 'drink', 41,  2,  10, 0,  1,  '1 cup (243ml)',           'local', true),
('Whole Milk',         'whole milk',         '🥛', 'drink', 149, 8,  12, 8,  0,  '1 cup (244ml)',           'local', true),
('Skim Milk',          'skim milk',          '🥛', 'drink', 83,  8,  12, 0,  0,  '1 cup (244ml)',           'local', true),
('Chocolate Milk',     'chocolate milk',     '🍫', 'drink', 208, 8,  32, 5,  1,  '1 cup (244ml)',           'local', true),
('Almond Milk (Unswt)','almond milk (unswt)','🥛', 'drink', 30,  1,  1,  3,  1,  '1 cup (244ml)',           'local', true),
('Oat Milk',           'oat milk',           '🥛', 'drink', 120, 3,  16, 5,  2,  '1 cup (244ml)',           'local', true),
('Latte (Whole Milk)', 'latte (whole milk)', '☕', 'drink', 190, 10, 15, 7,  0,  '16oz (grande)',           'local', true),
('Cappuccino',         'cappuccino',         '☕', 'drink', 120, 7,  10, 4,  0,  '12oz (tall)',             'local', true),
('Cold Coffee (Milk)', 'cold coffee (milk)', '🧋', 'drink', 150, 5,  22, 5,  0,  '1 glass (300ml)',         'local', true),
('Coffee with Sugar',  'coffee with sugar',  '☕', 'drink', 30,  0,  8,  0,  0,  '1 cup (240ml)',           'local', true),
('Whey Protein Shake', 'whey protein shake', '🥤', 'drink', 130, 25, 5,  2,  0,  '1 scoop in water (35g)',  'local', true),
('Protein Smoothie',   'protein smoothie',   '🥤', 'drink', 280, 28, 30, 5,  3,  '1 serving (400ml)',       'local', true),
('Sports Drink',       'sports drink',       '🧃', 'drink', 80,  0,  21, 0,  0,  '1 bottle (500ml)',        'local', true),
('BCAA Drink',         'bcaa drink',         '🥤', 'drink', 15,  3,  1,  0,  0,  '1 scoop in water (10g)',  'local', true),
('Cola (Regular)',     'cola (regular)',     '🥤', 'drink', 140, 0,  39, 0,  0,  '1 can (355ml)',           'local', true),
('Diet Cola',          'diet cola',          '🥤', 'drink', 0,   0,  0,  0,  0,  '1 can (355ml)',           'local', true),
('Lemonade',           'lemonade',           '🍋', 'drink', 99,  0,  26, 0,  0,  '1 cup (248ml)',           'local', true);

-- 6. Add new columns to food_logs (non-breaking — all nullable)
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS food_id uuid REFERENCES foods(id) ON DELETE SET NULL;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS original_calories numeric;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS original_protein_g numeric;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS original_carbs_g numeric;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS original_fat_g numeric;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS original_fiber_g numeric;

-- 7. Migrate existing custom_foods into the unified foods table
INSERT INTO foods (name, normalized_name, calories, protein_g, carbs_g, fat_g, fiber_g, serving, source, is_verified, created_by_user_id, created_at)
SELECT
  name,
  lower(name),
  calories,
  protein_g,
  carbs_g,
  fat_g,
  fiber_g,
  serving_size || ' ' || serving_unit,
  'user',
  false,
  user_id,
  created_at
FROM custom_foods
ON CONFLICT DO NOTHING;

-- 8. Search RPC for fuzzy matching (used by frontend)
CREATE OR REPLACE FUNCTION search_foods(search_query text, user_id_param uuid DEFAULT NULL)
RETURNS SETOF foods
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM foods
  WHERE (
    normalized_name ILIKE '%' || lower(search_query) || '%'
    OR name ILIKE '%' || search_query || '%'
  )
  AND (
    created_by_user_id IS NULL
    OR created_by_user_id = user_id_param
  )
  ORDER BY
    is_verified DESC,
    similarity(normalized_name, lower(search_query)) DESC
  LIMIT 15;
$$;

GRANT EXECUTE ON FUNCTION search_foods TO authenticated;

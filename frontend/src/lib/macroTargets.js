// Macro target computation — single source of truth for the default macro split.
//
// Today we compute targets on the fly from the user's daily_calorie_goal using
// a fixed 50/25/25 split (carbs/protein/fat). Fiber is omitted for now — the
// goal shape is TBD (14g per 1,000 kcal is the common standard, but we haven't
// committed to a formula yet).
//
// Future: once we add per-user macro customization (keto, high-protein, etc.),
// this function becomes the fallback when user-specified targets are null.
// Callers should not need to change — they'll just get the overridden values
// back when the DB has them.
//
// Returns null when calorieGoal is missing/invalid — callers should handle
// "no goal set yet" (pre-onboarding users) by hiding the goal display.

// Energy per gram (standard dietary values)
const KCAL_PER_G_CARB    = 4
const KCAL_PER_G_PROTEIN = 4
const KCAL_PER_G_FAT     = 9

// Default macro split — must stay in sync with the onboarding summary screen
// (Register.jsx Step 7) so the "Default Macro Split" display and Dashboard
// targets show the same grams.
const SPLIT_CARBS_PCT   = 0.50
const SPLIT_PROTEIN_PCT = 0.25
const SPLIT_FAT_PCT     = 0.25

/**
 * Compute default macro targets in grams from a calorie goal.
 * @param {number | null | undefined} calorieGoal - daily calorie target (kcal)
 * @returns {{ carbs_g: number, protein_g: number, fat_g: number } | null}
 */
export function computeMacroTargets(calorieGoal) {
  const goal = Number(calorieGoal)
  if (!goal || !Number.isFinite(goal) || goal <= 0) return null
  return {
    carbs_g:   Math.round((goal * SPLIT_CARBS_PCT)   / KCAL_PER_G_CARB),
    protein_g: Math.round((goal * SPLIT_PROTEIN_PCT) / KCAL_PER_G_PROTEIN),
    fat_g:     Math.round((goal * SPLIT_FAT_PCT)     / KCAL_PER_G_FAT),
  }
}

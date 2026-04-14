const { createClient } = require("@supabase/supabase-js");
const { step1Schema, step2Schema, step3Schema } = require("../validators/register.validator");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role to write directly to DB
);

// ─── BMI Helpers ──────────────────────────────────────────────────────────────

/**
 * Calculates BMI.
 * @param {number} weight_kg
 * @param {number} height_cm
 * @returns {number} BMI rounded to 1 decimal place
 */
function calculateBMI(weight_kg, height_cm) {
  const height_m = height_cm / 100;
  return parseFloat((weight_kg / (height_m * height_m)).toFixed(1));
}

/**
 * Returns BMI category label.
 * @param {number} bmi
 * @returns {string}
 */
function bmiCategory(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25.0) return "Normal weight";
  if (bmi < 30.0) return "Overweight";
  return "Obese";
}

// ─── TDEE Helpers ─────────────────────────────────────────────────────────────

/**
 * Mifflin-St Jeor BMR (metric) with gender-specific constant.
 * Male: +5, Female: -161, Other/unknown: -78 (midpoint)
 */
function calculateBMR(weight_kg, height_cm, age, gender) {
  const genderOffset = gender === 'M' ? 5 : gender === 'F' ? -161 : -78;
  return 10 * weight_kg + 6.25 * height_cm - 5 * age + genderOffset;
}

/** Activity multipliers (Mifflin-St Jeor standard). */
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

function calculateTDEE(bmr, activity_level) {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level]);
}

// ─── Unit Conversion ──────────────────────────────────────────────────────────

function toMetric(weight, height, unit_system) {
  if (unit_system === "imperial") {
    return {
      weight_kg: parseFloat((weight * 0.453592).toFixed(2)), // lbs → kg
      height_cm: parseFloat((height * 2.54).toFixed(2)),     // inches → cm
    };
  }
  return { weight_kg: weight, height_cm: height };
}

// ─── Step 1: Create Account ───────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates a Supabase Auth user and a corresponding profile row.
 */
async function registerStep1(req, res) {
  const { error: validationError, value } = step1Schema.validate(req.body, {
    abortEarly: false,
  });
  if (validationError) {
    return res.status(400).json({
      success: false,
      errors: validationError.details.map((d) => d.message),
    });
  }

  const { full_name, email, password } = value;

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // set true if you require email verification
  });

  if (authError) {
    // Surface duplicate email error clearly
    if (authError.message?.toLowerCase().includes("already registered")) {
      return res.status(409).json({ success: false, message: "Email is already registered." });
    }
    return res.status(500).json({ success: false, message: authError.message });
  }

  const userId = authData.user.id;

  // 2. Insert profile row
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    full_name,
    email,
    registration_step: 1,   // track how far along registration is
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    // Roll back the auth user to avoid orphaned accounts
    await supabase.auth.admin.deleteUser(userId);
    return res.status(500).json({ success: false, message: profileError.message });
  }

  return res.status(201).json({
    success: true,
    message: "Account created. Proceed to step 2.",
    data: { user_id: userId, email },
  });
}

// ─── Step 2: Body Metrics ─────────────────────────────────────────────────────

/**
 * POST /api/auth/register/metrics
 * Saves height, weight, age, unit preference, and computed BMI to the profile.
 * Requires the user_id from step 1 in req.body (or from JWT via middleware).
 */
async function registerStep2(req, res) {
  const { error: validationError, value } = step2Schema.validate(req.body, {
    abortEarly: false,
  });
  if (validationError) {
    return res.status(400).json({
      success: false,
      errors: validationError.details.map((d) => d.message),
    });
  }

  const { unit_system, age, height, weight } = value;

  // user_id comes from the verified JWT (set by authMiddleware) or body fallback
  const userId = req.user?.id || req.body.user_id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "User ID is required." });
  }

  // Convert to metric for storage regardless of user's chosen unit
  const { weight_kg, height_cm } = toMetric(weight, height, unit_system);
  const bmi = calculateBMI(weight_kg, height_cm);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      unit_system,
      age,
      height_cm,
      weight_kg,
      bmi,
      registration_step: 2,
    })
    .eq("id", userId);

  if (updateError) {
    return res.status(500).json({ success: false, message: updateError.message });
  }

  return res.status(200).json({
    success: true,
    message: "Body metrics saved. Proceed to step 3.",
    data: {
      height_cm,
      weight_kg,
      bmi,
      bmi_category: bmiCategory(bmi),
    },
  });
}

// ─── Step 3: Activity Level ───────────────────────────────────────────────────

/**
 * POST /api/auth/register/activity
 * Saves activity level, computes TDEE, and marks registration as complete.
 */
async function registerStep3(req, res) {
  const { error: validationError, value } = step3Schema.validate(req.body, {
    abortEarly: false,
  });
  if (validationError) {
    return res.status(400).json({
      success: false,
      errors: validationError.details.map((d) => d.message),
    });
  }

  const { activity_level } = value;
  const userId = req.user?.id || req.body.user_id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "User ID is required." });
  }

  // Fetch stored metrics needed for TDEE
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("weight_kg, height_cm, age, gender")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) {
    return res.status(404).json({
      success: false,
      message: "Profile not found. Please complete step 2 first.",
    });
  }

  const bmr = calculateBMR(profile.weight_kg, profile.height_cm, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, activity_level);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      activity_level,
      daily_calorie_goal: tdee,
      registration_step: 3,
      is_onboarded: true,
    })
    .eq("id", userId);

  if (updateError) {
    return res.status(500).json({ success: false, message: updateError.message });
  }

  return res.status(200).json({
    success: true,
    message: "Registration complete! Welcome to Healtho 🎉",
    data: {
      activity_level,
      daily_calorie_goal: tdee,
      bmr: Math.round(bmr),
    },
  });
}

module.exports = { registerStep1, registerStep2, registerStep3 };

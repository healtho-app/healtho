const express = require("express");
const router = express.Router();

const {
  registerStep1,
  registerStep2,
  registerStep3,
} = require("../controllers/register.controller");

const { authMiddleware } = require("../middleware/auth.middleware");

// ─── Registration Routes ──────────────────────────────────────────────────────
//
//  Step 1 — no auth required (user doesn't exist yet)
//  Step 2 & 3 — protected: client must pass the Supabase JWT returned after
//               the user signs in with the credentials created in step 1.
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Step 1 — Create account (email + password + full name)
 * @access  Public
 * @body    { full_name, email, password }
 */
router.post("/register", registerStep1);

/**
 * @route   POST /api/auth/register/metrics
 * @desc    Step 2 — Save body metrics (age, height, weight, unit system)
 * @access  Protected (Bearer token)
 * @body    { unit_system, age, height, weight }
 */
router.post("/register/metrics", authMiddleware, registerStep2);

/**
 * @route   POST /api/auth/register/activity
 * @desc    Step 3 — Set activity level & finalise registration
 * @access  Protected (Bearer token)
 * @body    { activity_level }
 */
router.post("/register/activity", authMiddleware, registerStep3);

module.exports = router;

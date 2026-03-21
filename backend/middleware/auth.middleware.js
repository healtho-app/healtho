const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Middleware: validates the Supabase JWT from the Authorization header.
 * Attaches the decoded user object to req.user.
 *
 * Usage: router.post("/protected", authMiddleware, handler)
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing or malformed. Expected: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1];

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }

  req.user = data.user; // { id, email, ... }
  next();
}

module.exports = { authMiddleware };

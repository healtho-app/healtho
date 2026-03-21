const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const registerRoutes = require("./routes/register.routes");
app.use("/api/auth", registerRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Healtho API is running 🚀" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";

console.log("✅ Imports successful");

dotenv.config();
console.log("✅ .env loaded");
console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

const app = express();
console.log("✅ Express app created");

app.use(cors({
  origin: "http://localhost:3000",
  exposedHeaders: ["X-Quiz-Id"]
}));

app.use(express.json());
console.log("✅ Middleware added");

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
console.log("✅ URL configured");

// Test route
app.get("/test", (req, res) => {
  res.json({ message: "Test OK" });
});

// Personalized quiz route
app.post("/personalized-quiz", async (req, res) => {
  console.log("📨 /personalized-quiz called");
  return res.json({ test: "ok", message: "Personalized quiz endpoint works" });
});

console.log("✅ Routes registered");

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log("Routes available:");
  console.log("  - GET /test");
  console.log("  - POST /personalized-quiz");
});

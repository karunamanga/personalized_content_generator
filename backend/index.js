import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";

import { generateQuestions } from "../pdf/questionGenerator.js";

dotenv.config();

const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  exposedHeaders: ["X-Quiz-Id"]
}));

app.use(express.json());

// In-memory store for quizzes
const answerStore = {};

// ===============================
// READ PDF FROM GITHUB
// ===============================
app.post("/read-pdf", async (req, res) => {
  try {
    const { github_url } = req.body;
    if (!github_url) return res.status(400).json({ error: "github_url required" });

    const rpcBody = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: "read_github_pdf", arguments: { github_url } }
    };

    const response = await fetch("http://localhost:3333", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rpcBody)
    });

    if (!response.ok) {
      const txt = await response.text();
      return res.status(500).json({ error: "PDF service failed", details: txt });
    }

    const data = await response.json();
    if (!data?.result?.text) return res.status(500).json({ error: "No text extracted", raw: data });

    return res.json({ text: data.result.text });

  } catch (err) {
    console.error("❌ /read-pdf error:", err);
    return res.status(500).json({ error: "PDF extraction failed", details: err.message });
  }
});

// ===============================
// GENERATE MCQ QUESTIONS
// ===============================
app.post("/generate", async (req, res) => {
  try {
    const { docText, topic } = req.body;
    let text = "";

    if (docText && docText.trim().length > 100) {
      text = docText;
    } else if (topic && topic.trim()) {
      text = `Generate questions on topic: ${topic}`;
    } else {
      return res.status(400).json({ error: "docText or topic required" });
    }

    const questions = await generateQuestions(text);
    if (!Array.isArray(questions)) throw new Error("Invalid Gemini response");

    const quizId = `quiz_${Date.now()}`;
    
    // Normalize stored answers: convert letter/index to actual option text
    const normalizedAnswers = questions.map((q) => {
      const ans = q.answer;
      const opts = Array.isArray(q.options) ? q.options : [];

      if (!ans) return opts[0] || "";

      if (typeof ans === "string" && /^[A-D]$/i.test(ans) && opts.length > 0) {
        const idx = ans.toUpperCase().charCodeAt(0) - 65;
        return opts[idx] || opts[0];
      }

      if (typeof ans === "number" && opts.length > 0) {
        return opts[ans] || opts[0];
      }

      return ans;
    });

    answerStore[quizId] = {
      questions,
      answers: normalizedAnswers
    };

    
    console.log("✅ Quiz stored:", quizId, answerStore[quizId]);

    res.setHeader("X-Quiz-Id", quizId);
   

    return res.json(questions);

  } catch (err) {
    console.error("❌ /generate error:", err);
    return res.status(500).json({ error: "Question generation failed", details: err.message });
  }
});

// ===============================
// PERSONALIZED LEARNING QUIZ
// No score evaluation needed
// ===============================
app.post("/generate-from-pdf", async (req, res) => {
  try {
    const { userProfile } = req.body;
    if (!userProfile) return res.status(400).json({ error: "Missing user profile" });

    // 5 learning-preference questions (example)
    const questions = [
      { question: "How do you prefer learning new tech?", options: ["Reading docs","Watching videos","Hands-on","Group discussion"], answer: "Hands-on" },
      { question: "Do you like step-by-step tutorials?", options: ["Yes","No","Sometimes","Never"], answer: "Yes" },
      { question: "Do you take notes while learning?", options: ["Yes","No","Sometimes","Never"], answer: "Yes" },
      { question: "Do you prefer online courses or offline?", options: ["Online","Offline","Hybrid","Doesn't matter"], answer: "Online" },
      { question: "Do you prefer small examples or full projects?", options: ["Small examples","Full projects","Both","Neither"], answer: "Both" }
    ];

    return res.json(questions);

  } catch (err) {
    console.error("❌ /generate-from-pdf error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ===============================
// GENERATE TOPICS BASED ON PERSONALIZED QUIZ
// ===============================
app.post("/generate-topic", async (req, res) => {
  try {
    const { lastAnswers, userProfile } = req.body;

    // Example: Generate topics based on learning style
    const topics = ["React Hooks Deep Dive","Advanced MongoDB Indexing","Python Data Structures","Building Full-stack Apps","CI/CD Best Practices"];

    return res.json({ topics });

  } catch (err) {
    console.error("❌ /generate-topic error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ===============================
// EVALUATE QUIZ SCORE
// ===============================
app.post("/evaluate-quiz", (req, res) => {
  const { quizId, answers } = req.body;
  const stored = answerStore[quizId];

  if (!stored) {
    return res.status(404).json({ error: "Quiz not found" });
  }
  let correct = 0;
  stored.answers.forEach((ans, i) => {
    if ((ans || "").toLowerCase() === (answers[i] || "").toLowerCase())  {
      correct++;
    }
  });

  const total = stored.answers.length;
  const score = Math.round((correct / total) * 100);

  return res.json({
    success: true,
    correct,
    wrong: total - correct,
    score
  });
});

// ===============================
// GENERATE LEVEL ASSESSMENT QUESTIONS
// ===============================
// Generates 5 questions to assess user's knowledge level (beginner/intermediate/advanced)
app.post("/generate-level-test", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "topic required" });
    }

    const prompt = `
You are an expert instructor designing a quick knowledge assessment test.

User's topic: ${topic}

Generate exactly 5 MCQ questions that can differentiate between beginner, intermediate, and advanced learners on this topic.

Questions should be:
- Progressively harder (Q1 easiest, Q5 hardest)
- About foundational concepts, application, and deep understanding
- Multiple choice with 4 options

Return ONLY valid JSON array, no explanation:

[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer": "A",
    "difficulty": "Beginner"
  },
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer": "B",
    "difficulty": "Intermediate"
  },
  ...
]
`;

    const model = (await import("@google/generative-ai")).GoogleGenerativeAI
      ? new (await import("@google/generative-ai")).GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: "gemini-2.5-flash" })
      : null;

    if (!model) {
      // Fallback: return mock questions if API unavailable
      const mockQuestions = [
        {
          question: `What is the basic definition of ${topic}?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option A",
          difficulty: "Beginner"
        },
        {
          question: `How would you apply ${topic} in a real-world scenario?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option B",
          difficulty: "Intermediate"
        },
        {
          question: `What is an advanced technique in ${topic}?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option C",
          difficulty: "Advanced"
        },
        {
          question: `How does ${topic} relate to other concepts?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option A",
          difficulty: "Intermediate"
        },
        {
          question: `What are the edge cases in ${topic}?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option D",
          difficulty: "Advanced"
        }
      ];
      return res.json(mockQuestions);
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const rawText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Empty Gemini output");

    const questions = JSON.parse(rawText);
    return res.json(questions);

  } catch (err) {
    console.error("❌ /generate-level-test error:", err);
    return res.status(500).json({ error: "Level test generation failed", details: err.message });
  }
});

// ===============================
// EVALUATE LEVEL BASED ON ANSWERS
// ===============================
// Compares user answers against correct answers and determines level
app.post("/evaluate-level", (req, res) => {
  try {
    const { answers, correctAnswers } = req.body;

    if (!Array.isArray(answers) || !Array.isArray(correctAnswers)) {
      return res.status(400).json({ error: "answers and correctAnswers arrays required" });
    }

    if (answers.length !== correctAnswers.length) {
      return res.status(400).json({ error: "answers and correctAnswers length mismatch" });
    }

    // Count correct answers
    let correct = 0;
    answers.forEach((ans, i) => {
      if ((ans || "").toLowerCase().trim() === (correctAnswers[i] || "").toLowerCase().trim()) {
        correct++;
      }
    });

    const total = answers.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Determine level based on score
    let level = "Beginner";
    if (percentage >= 80) {
      level = "Advanced";
    } else if (percentage >= 60) {
      level = "Intermediate";
    }

    return res.json({
      success: true,
      correct,
      total,
      percentage,
      level
    });

  } catch (err) {
    console.error("❌ /evaluate-level error:", err);
    return res.status(500).json({ error: "Level evaluation failed", details: err.message });
  }
});

// ===============================
// START SERVER
// ===============================
const PORT = 5000;
app.listen(PORT, () => {
  console.log("✅ Backend running on http://localhost:" + PORT);
  console.log("Available routes:");
  console.log(" - POST /read-pdf");
  console.log(" - POST /generate");
  console.log(" - POST /generate-from-pdf");
  console.log(" - POST /generate-topic");
  console.log(" - POST /generate-level-test");
  console.log(" - POST /evaluate-level");
  console.log(" - POST /evaluate-quiz");
});

import { createServer } from "http";
import fetch from "node-fetch";
import { createRequire } from "module";
import "dotenv/config";
import { generateQuestions } from "./questionGenerator.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse"); // works with v1.1.1

// ------------------- Global Error Protection -------------------
process.on("uncaughtException", err => {
  console.error("🔥 Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
  console.error("🔥 Unhandled Rejection:", err);
});
// ---------------------------------------------------------------


// Convert GitHub link → raw link
function githubToRaw(url) {
  if (url.includes("raw.githubusercontent.com")) return url;

  const match = url.match(
    /github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/
  );

  if (!match) throw new Error("Invalid GitHub URL");

  const [, owner, repo, branch, path] = match;

  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURIComponent(
    path
  )}`;
}


// Fetch PDF
async function fetchPDF(githubUrl) {
  const rawUrl = githubToRaw(githubUrl);

  console.log("📥 Fetching PDF:", rawUrl);

  const res = await fetch(rawUrl);

  if (!res.ok) {
    throw new Error("Failed to fetch PDF");
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  // Real PDF check
  if (!buffer.slice(0, 4).toString().includes("%PDF")) {
    throw new Error("Not a valid PDF file");
  }

  return buffer;
}


// ------------------- Server -------------------
const server = createServer((req, res) => {

  let body = "";

  req.on("data", chunk => {
    body += chunk;
  });


  req.on("end", async () => {

    try {
      if (!body) {
        throw new Error("Empty request body");
      }

      const request = JSON.parse(body);


      if (request.method !== "tools/call") {
        throw new Error("Invalid method");
      }

      const { name, arguments: args } = request.params;


      // ---------- Only PDF Extraction ----------
      if (name === "read_github_pdf") {

        const buffer = await fetchPDF(args.github_url);

        const data = await pdfParse(buffer);

        const cleanText = data.text
          .replace(/\s+/g, " ")
          .replace(/\n+/g, " ")
          .trim()
          .substring(0, 8000);


        res.writeHead(200, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            text: cleanText
          }
        }));

        return;
      }


      // ---------- PDF + Generate Questions ----------
      if (name === "read_github_pdf_and_generate_questions") {

        const buffer = await fetchPDF(args.github_url);

        const data = await pdfParse(buffer);


        const text = data.text
          .replace(/\s+/g, " ")
          .replace(/\n+/g, " ")
          .trim()
          .substring(0, 8000);


        console.log("📤 Sending to Gemini, length:", text.length);


        let questions;

        // Protect Gemini call
        try {
          questions = await generateQuestions(text);
        } catch (aiErr) {

          console.error("❌ AI FAILED:", aiErr);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32002,
              message: "Question generation failed",
              details: aiErr.message
            }
          }));

          return;
        }


        console.log("✅ Questions Generated");


        res.writeHead(200, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            questions
          }
        }));

        return;
      }


      throw new Error("Unknown MCP method");


    } catch (err) {

      console.error("❌ SERVER ERROR:", err);

      res.writeHead(500, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: err.message
        }
      }));
    }

  });

});


server.listen(3333, () => {
  console.log("✅ MCP GitHub PDF server running on port 3333");
});
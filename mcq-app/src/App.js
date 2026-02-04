import {
  SignedIn,
  SignedOut,
  SignIn,
  UserButton
} from "@clerk/clerk-react";

import { useState } from "react";
import "./App.css";

function App() {

  // MCQ States
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");
  const [showResult, setShowResult] = useState(false);

  // Loading & Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Document States
  const [pdfFile, setPdfFile] = useState(null);
  const [githubLink, setGithubLink] = useState("");
  const [docText, setDocText] = useState("");


  // ==========================
  // Extract Resume / GitHub PDF
  // ==========================

  const extractDocument = async () => {

    setLoading(true);
    setError("");

    try {

      let res;

      // GitHub PDF
      if (githubLink.trim()) {

        // Use backend proxy endpoint (/read-pdf) which forwards to the PDF microservice.
        res = await fetch("http://localhost:5000/read-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ github_url: githubLink })
        });

        const data = await res.json();

        setDocText(data.text || "");
      }

      // Resume Upload
      else if (pdfFile) {

        const formData = new FormData();
        formData.append("file", pdfFile);

        res = await fetch("http://localhost:5000/upload", {
          method: "POST",
          body: formData
        });

        const data = await res.json();

        setDocText(data.text);
      }

      else {
        setError("Please upload a file or paste GitHub link");
      }

    } catch (err) {

      console.error(err);
      setError("Document extraction failed");

    }

    setLoading(false);
  };


  // ==========================
  // Generate MCQ
  // ==========================

  const generateQuiz = async () => {

    if (!topic.trim() && !docText.trim()) return;

    setLoading(true);
    setError("");

    try {

      const res = await fetch("http://localhost:5000/generate", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          topic: docText || topic   // Use resume/GitHub if exists
        }),
      });

      if (!res.ok) {
        throw new Error("Server error");
      }

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No questions");
      }

      setQuestions(data);
      setIndex(0);
      setScore(0);
      setShowResult(false);

    } catch (err) {

      console.error(err);
      setError("Failed to generate quiz");

    }

    setLoading(false);
  };


  // ==========================
  // Next Question
  // ==========================

  const nextQuestion = () => {

    if (selected === questions[index].answer) {
      setScore(score + 1);
    }

    setSelected("");

    if (index + 1 < questions.length) {
      setIndex(index + 1);
    }
    else {
      setShowResult(true);
    }
  };


  // ==========================
  // UI
  // ==========================

  return (

    <div className="container">

      {/* Logged Out */}

      <SignedOut>

        <div className="login-box">
          <h2>Login to Continue</h2>
          <SignIn />
        </div>

      </SignedOut>


      {/* Logged In */}

      <SignedIn>

        {/* Top Bar */}

        <div className="top-bar">

          <h2>MCQ Generator</h2>
          <UserButton />

        </div>


        {/* Header */}

        <div className="header">
          <h1>Personalized Learning Platform</h1>
        </div>


        {/* Upload Section */}

        {!questions.length && (

          <div className="card">

            <h3>Upload Resume / GitHub PDF</h3>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
            />

            <p>OR</p>

            <input
              type="text"
              placeholder="Paste GitHub PDF link"
              value={githubLink}
              onChange={(e) => setGithubLink(e.target.value)}
            />

            <button
              onClick={extractDocument}
              disabled={loading}
            >
              {loading ? "Extracting..." : "Extract Document"}
            </button>

          </div>
        )}


        {/* Extracted Text Preview */}

        {docText && !questions.length && (

          <div className="card">

            <h3>Extracted Content</h3>

            <textarea
              rows="6"
              value={docText}
              readOnly
              style={{ width: "100%" }}
            />

          </div>
        )}


        {/* Topic Input */}

        {questions.length === 0 && (

          <div className="start-box">

            <input
              type="text"
              placeholder="Enter topic (optional)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            <button
              onClick={generateQuiz}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Quiz"}
            </button>

            {error && <p style={{ color: "red" }}>{error}</p>}

          </div>
        )}


        {/* Quiz */}

        {questions.length > 0 && !showResult && (

          <div className="card">

            <h3>
              {index + 1}. {questions[index].question}
            </h3>

            {questions[index].options.map((opt, i) => (

              <label key={i} className="option">

                <input
                  type="radio"
                  name="option"
                  value={opt}
                  checked={selected === opt}
                  onChange={(e) => setSelected(e.target.value)}
                />

                {opt}

              </label>

            ))}

            <button
              onClick={nextQuestion}
              disabled={!selected}
            >
              Next
            </button>

          </div>
        )}


        {/* Result */}

        {showResult && (

          <div className="card">

            <h2>Result</h2>

            <p className="result">
              Your Score: {score} / {questions.length}
            </p>

            <button
              onClick={() => {

                setQuestions([]);
                setIndex(0);
                setScore(0);
                setSelected("");
                setShowResult(false);
                setTopic("");
                setDocText("");
                setGithubLink("");
                setPdfFile(null);
                setError("");

              }}
            >
              Restart
            </button>

          </div>
        )}

      </SignedIn>

    </div>
  );
}

export default App;

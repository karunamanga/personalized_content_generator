import fetch from "node-fetch";

const githubUrl =
  "https://github.com/sowmyabethina/mcp/blob/main/sample.pdf";

async function run() {

  const res = await fetch("http://localhost:3333", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,

      method: "tools/call",

      params: {
        name: "read_github_pdf_and_generate_questions", // ✅ FIXED
        arguments: {
          github_url: githubUrl
        }
      }
    })
  });

  const data = await res.json();

  console.log("✅ Result:\n", JSON.stringify(data, null, 2));
}

run();
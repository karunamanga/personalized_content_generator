import fetch from "node-fetch";

// Works with normal GitHub page URL or raw URL
const githubUrl = "https://github.com/sowmyabethina/mcp/blob/main/sample.pdf";

async function run() {
  const res = await fetch("http://localhost:3333", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "read_github_pdf",
        arguments: {
          github_url: githubUrl
        }
      }
    })
  });

  const data = await res.json();
  console.log(data);
}

run();
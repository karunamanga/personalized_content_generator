const url = 'http://localhost:5000/read-pdf';
const body = { github_url: 'https://github.com/sowmyabethina/mcp/blob/main/sample.pdf' };

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
  } catch (err) {
    console.error('ERR', err);
  }
})();
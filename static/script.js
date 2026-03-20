const API_ENDPOINT = '/predict';

// ─── MAIN FUNCTION ─────────────────────────
async function checkURL() {
  const input = document.getElementById('urlInput').value.trim();

  if (!input) {
    alert("Enter a URL");
    return;
  }

  const url = input.startsWith('http') ? input : 'https://' + input;

  setLoading(true);
  hideResult();

  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!res.ok) throw new Error();

    const data = await res.json();
    handleResult(data);

  } catch (err) {
    console.error(err);
    alert("Error connecting to backend");
  }

  setLoading(false);
}

// ─── HANDLE RESULT ─────────────────────────
function handleResult(data) {
  const resultArea = document.getElementById('resultArea');
  const resultCard = document.getElementById('resultCard');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultSub = document.getElementById('resultSub');

  resultArea.classList.remove('hidden');

  const isPhishing = data.prediction === 'phishing';

  if (isPhishing) {
    resultCard.className = 'result-card danger';
    resultIcon.textContent = '⚠️';
    resultTitle.textContent = 'PHISHING WEBSITE DETECTED';
    setThreatBar(90);
  } else {
    resultCard.className = 'result-card safe';
    resultIcon.textContent = '✅';
    resultTitle.textContent = 'LEGITIMATE WEBSITE';
    setThreatBar(20);
  }

  let text = isPhishing
    ? "Do NOT proceed."
    : "Safe to use.";

  if (data.confidence) {
    text += ` (Confidence: ${Math.round(data.confidence * 100)}%)`;
  }

  if (data.brand) {
    text += ` | Similar to: ${data.brand}`;
  }

  if (data.score) {
    text += ` (${data.score}% match)`;
  }

  resultSub.textContent = text;
}

// ─── UI HELPERS ─────────────────────────
function setLoading(state) {
  const btn = document.getElementById('checkBtn');
  const label = document.getElementById('btnLabel');
  const spinner = document.getElementById('btnSpinner');

  btn.disabled = state;

  if (state) {
    label.textContent = "Analyzing...";
    spinner.classList.remove("hidden");
  } else {
    label.textContent = "Analyze URL";
    spinner.classList.add("hidden");
  }
}

function setThreatBar(pct) {
  const bar = document.getElementById('threatBar');
  bar.style.width = pct + "%";
}

function hideResult() {
  document.getElementById('resultArea').classList.add('hidden');
}

function clearInput() {
  document.getElementById('urlInput').value = "";
  hideResult();
}

// ENTER key support
document.getElementById('urlInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkURL();
});
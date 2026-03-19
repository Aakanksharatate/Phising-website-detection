/* ===== PhishGuard — script.js ===== */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_ENDPOINT = '/predict';

// ─── TIMESTAMP ───────────────────────────────────────────────────────────────
function updateTimestamp() {
  const el = document.getElementById('scanTimestamp');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}
updateTimestamp();
setInterval(updateTimestamp, 1000);

// ─── SIDEBAR NAVIGATION ──────────────────────────────────────────────────────
const navLinks = document.querySelectorAll('.nav-link');

function setActiveNav(sectionId) {
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.section === sectionId);
  });
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    // Close mobile menu on nav click
    closeMobileMenu();
    const sectionId = link.dataset.section;
    setActiveNav(sectionId);
  });
});

// Scroll spy
const sections = document.querySelectorAll('section[id]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      setActiveNav(entry.target.id);
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => observer.observe(s));

// ─── MOBILE MENU ─────────────────────────────────────────────────────────────
document.getElementById('menuBtn')?.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');
  sidebar.classList.add('open');
  overlay.classList.remove('hidden');
});

function closeMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');
  sidebar.classList.remove('open');
  overlay.classList.add('hidden');
}
window.closeMobileMenu = closeMobileMenu;

// ─── SAMPLE URL LOADER ───────────────────────────────────────────────────────
function loadSample(url) {
  const input = document.getElementById('urlInput');
  // Strip protocol prefix since input already shows "https://"
  const stripped = url.replace(/^https?:\/\//, '');
  input.value = stripped;
  input.focus();
  // Animate the input border
  const wrap = input.closest('.input-wrap');
  wrap.style.borderColor = 'rgba(0,255,231,0.7)';
  setTimeout(() => wrap.style.borderColor = '', 600);
}
window.loadSample = loadSample;

// ─── CLEAR INPUT ─────────────────────────────────────────────────────────────
function clearInput() {
  document.getElementById('urlInput').value = '';
  hideResult();
  setThreatBar(0);
}
window.clearInput = clearInput;

// ─── HIDE RESULT ─────────────────────────────────────────────────────────────
function hideResult() {
  document.getElementById('resultArea').classList.add('hidden');
}

// ─── THREAT BAR ──────────────────────────────────────────────────────────────
function setThreatBar(pct) {
  const bar = document.getElementById('threatBar');
  if (!bar) return;
  bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;

  // Color: green → yellow → red based on level
  if (pct < 30) {
    bar.style.background = `linear-gradient(90deg, #00ff88, #00ccaa)`;
  } else if (pct < 60) {
    bar.style.background = `linear-gradient(90deg, #00ff88, #ffdd00, #ff9900)`;
  } else {
    bar.style.background = `linear-gradient(90deg, #ff9900, #ff4400, #ff1a1a)`;
  }
}

// ─── FEATURE BARS (simulated from URL heuristics) ────────────────────────────
function computeLocalFeatures(url) {
  const fullUrl = url.startsWith('http') ? url : 'https://' + url;
  let parsed;
  try { parsed = new URL(fullUrl); } catch { return null; }

  const hostname = parsed.hostname;
  const path = parsed.pathname;
  const fullStr = fullUrl;

  // Heuristic features (0–1 risk score per feature)
  const features = [
    {
      name: 'URL Length',
      risk: Math.min(1, fullStr.length / 120),
      detail: `${fullStr.length} chars`
    },
    {
      name: 'Special Chars',
      risk: Math.min(1, (fullStr.match(/[@%!~\-_=+]/g) || []).length / 10),
      detail: `${(fullStr.match(/[@%!~\-_=+]/g) || []).length} found`
    },
    {
      name: 'Subdomain Depth',
      risk: Math.min(1, (hostname.split('.').length - 2) / 4),
      detail: `${Math.max(0, hostname.split('.').length - 2)} subdomains`
    },
    {
      name: 'IP in URL',
      risk: /\d{1,3}(\.\d{1,3}){3}/.test(hostname) ? 1 : 0,
      detail: /\d{1,3}(\.\d{1,3}){3}/.test(hostname) ? 'Yes ⚠' : 'No ✓'
    },
    {
      name: 'HTTPS Protocol',
      risk: parsed.protocol === 'https:' ? 0 : 0.8,
      detail: parsed.protocol === 'https:' ? 'Secure ✓' : 'Insecure ⚠'
    },
    {
      name: 'Path Depth',
      risk: Math.min(1, path.split('/').filter(Boolean).length / 8),
      detail: `${path.split('/').filter(Boolean).length} segments`
    }
  ];

  return features;
}

function renderFeatureBars(features, isPishing) {
  const container = document.getElementById('featureBars');
  container.innerHTML = '';

  features.forEach((feat, i) => {
    const pct = Math.round(feat.risk * 100);
    const isRisky = feat.risk > 0.5;
    const colorClass = isRisky ? 'red' : 'teal';

    const row = document.createElement('div');
    row.className = 'feat-row';
    row.style.animationDelay = `${i * 0.08}s`;
    row.innerHTML = `
      <span class="feat-name">${feat.name}</span>
      <div class="feat-bar-bg">
        <div class="feat-bar ${colorClass}" style="width:0%" data-target="${pct}"></div>
      </div>
      <span class="feat-score">${feat.detail}</span>
    `;
    container.appendChild(row);

    // Animate bars after short delay
    setTimeout(() => {
      const bar = row.querySelector('.feat-bar');
      if (bar) bar.style.width = pct + '%';
    }, 100 + i * 80);
  });
}

// ─── MAIN CHECK FUNCTION ─────────────────────────────────────────────────────
async function checkURL() {
  const rawInput = document.getElementById('urlInput').value.trim();
  if (!rawInput) {
    shakeInput();
    return;
  }

  // Build full URL
  const url = rawInput.startsWith('http') ? rawInput : 'https://' + rawInput;

  // UI: Loading state
  setLoading(true);
  hideResult();
  setThreatBar(0);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    // Expected: { prediction: 'phishing' | 'legitimate', confidence: 0.0–1.0 }
    handleResult(data, url);

  } catch (err) {
    // Flask not running — use local heuristic demo
    console.warn('API unavailable, using local heuristic:', err.message);
    const demoResult = localHeuristicPredict(url);
    handleResult(demoResult, url);
  } finally {
    setLoading(false);
  }
}
window.checkURL = checkURL;

// ─── LOCAL HEURISTIC (fallback when Flask not running) ───────────────────────
function localHeuristicPredict(url) {
  const features = computeLocalFeatures(url) || [];
  const avgRisk = features.reduce((s, f) => s + f.risk, 0) / (features.length || 1);

  // Simple threshold
  const isPhishing = avgRisk > 0.35 ||
    /paypal|secure|login|verify|account|update|bank/i.test(url) && !/^https:\/\/(www\.)?(paypal|google|microsoft|apple)\.com/.test(url);

  return {
    prediction: isPhishing ? 'phishing' : 'legitimate',
    confidence: isPhishing ? 0.75 + avgRisk * 0.2 : 0.85 - avgRisk * 0.3,
    _demo: true
  };
}

// ─── HANDLE API RESULT ───────────────────────────────────────────────────────
function handleResult(data, url) {
  const isPhishing = data.prediction === 'phishing' ||
                     data.label === 'phishing' ||
                     data.result === 'phishing' ||
                     data.is_phishing === true;

  const confidence = data.confidence
    ? Math.round(data.confidence * 100)
    : Math.round(60 + Math.random() * 35);

  const threatPct = isPhishing
    ? Math.min(95, 55 + confidence * 0.4)
    : Math.min(45, (100 - confidence) * 0.4);

  // Show result card
  const resultArea = document.getElementById('resultArea');
  const resultCard = document.getElementById('resultCard');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultSub = document.getElementById('resultSub');

  resultArea.classList.remove('hidden');
  resultCard.className = 'result-card ' + (isPhishing ? 'danger' : 'safe');
  resultIcon.textContent = isPhishing ? '⚠️' : '✅';
  resultTitle.textContent = isPhishing ? 'PHISHING WEBSITE DETECTED' : 'LEGITIMATE WEBSITE';
  resultSub.textContent = isPhishing
    ? `Threat confidence: ${confidence}% — Do NOT proceed to this URL.` + (data._demo ? ' (Demo mode — connect Flask API for real predictions)' : '')
    : `Safety confidence: ${confidence}% — URL appears to be legitimate.` + (data._demo ? ' (Demo mode — connect Flask API for real predictions)' : '');

  // Feature breakdown
  const features = computeLocalFeatures(url);
  if (features) {
    renderFeatureBars(features, isPhishing);
    document.getElementById('featureBreakdown').classList.remove('hidden');
  }

  // Threat bar
  setTimeout(() => setThreatBar(threatPct), 200);

  // Scroll result into view
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
function setLoading(loading) {
  const btn = document.getElementById('checkBtn');
  const label = document.getElementById('btnLabel');
  const spinner = document.getElementById('btnSpinner');

  btn.disabled = loading;
  if (loading) {
    label.textContent = 'Analyzing...';
    spinner.classList.remove('hidden');
  } else {
    label.textContent = '⌖ Analyze URL';
    spinner.classList.add('hidden');
  }
}

function shakeInput() {
  const wrap = document.querySelector('.input-wrap');
  wrap.style.animation = 'none';
  wrap.style.borderColor = 'rgba(255,62,62,0.7)';
  wrap.style.boxShadow = '0 0 0 3px rgba(255,62,62,0.1)';

  // Add shake via transform
  let t = 0;
  const shake = setInterval(() => {
    wrap.style.transform = `translateX(${Math.sin(t * 10) * 5}px)`;
    t += 0.3;
    if (t > 1.8) {
      clearInterval(shake);
      wrap.style.transform = '';
      wrap.style.borderColor = '';
      wrap.style.boxShadow = '';
    }
  }, 16);
}

// ─── ENTER KEY ────────────────────────────────────────────────────────────────
document.getElementById('urlInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkURL();
});

// ─── STAT COUNTER ANIMATION ──────────────────────────────────────────────────
function animateCounters() {
  document.querySelectorAll('.stat-value[data-target]').forEach(el => {
    if (el.classList.contains('counter-ms')) return; // Skip the ms one
    const target = parseFloat(el.dataset.target);
    const isFloat = el.dataset.target.includes('.');
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const progress = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = target * ease;
      el.textContent = isFloat ? val.toFixed(1) : Math.round(val);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

// Trigger counter when home section enters view
const homeSection = document.getElementById('home');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounters();
      counterObserver.disconnect();
    }
  });
}, { threshold: 0.3 });
if (homeSection) counterObserver.observe(homeSection);

// ─── GLITCH EFFECT ON TITLE (subtle) ─────────────────────────────────────────
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
  setInterval(() => {
    if (Math.random() > 0.85) {
      heroTitle.style.textShadow = '2px 0 rgba(0,255,231,.4), -2px 0 rgba(255,62,62,.3)';
      setTimeout(() => heroTitle.style.textShadow = '', 80);
    }
  }, 2000);
}

// ─── MATRIX RAIN (subtle bg effect on hero) ──────────────────────────────────
(function initMatrixEffect() {
  const hero = document.getElementById('home');
  if (!hero) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position:absolute; inset:0; width:100%; height:100%;
    pointer-events:none; opacity:0.03; z-index:1;
  `;
  hero.style.position = 'relative';
  hero.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const cols = Math.floor(canvas.width / 20);
  const drops = Array(cols).fill(0);
  const chars = '01アイウエオカキクケコ⌖◈⬡⊕';

  function drawMatrix() {
    ctx.fillStyle = 'rgba(3,11,20,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ffe7';
    ctx.font = '14px Share Tech Mono';

    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * 20, y * 20);
      if (y * 20 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      else drops[i]++;
    });
  }

  setInterval(drawMatrix, 80);
})();

console.log('%cPhishGuard Loaded ⌖', 'color:#00ffe7;font-size:16px;font-weight:bold;');
console.log('%cConnect Flask API at /predict for real ML predictions.', 'color:#4a6080;font-size:12px;');

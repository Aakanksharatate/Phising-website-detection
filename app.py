from flask import Flask, request, jsonify, render_template
import pandas as pd
import joblib
from URLFeatureExtraction import extract_features
from visual_detection import capture_website, detect_brand_similarity

app = Flask(__name__)

# --- add at top ---
from urllib.parse import urlparse

TRUSTED_DOMAINS = [
    "google.com", "amazon.com", "github.com",
    "microsoft.com", "apple.com", "facebook.com"
]

def normalize_url(url: str) -> str:
    if not url.startswith("http"):
        url = "https://" + url
    return url

def get_domain(url: str) -> str:
    parsed = urlparse(url)
    return parsed.netloc.replace("www.", "").lower()

def is_valid_domain(domain: str) -> bool:
    # simple check for demo (has dot and no spaces)
    return "." in domain and " " not in domain

# Load model once
model = joblib.load("best_phishing_model.pkl")

FEATURE_ORDER = [
    'Have_IP', 'Have_At', 'URL_Length', 'URL_Depth',
    'Redirection', 'https_Domain', 'TinyURL', 'Prefix/Suffix',
    'DNS_Record', 'Web_Traffic', 'Domain_Age', 'Domain_End',
    'iFrame', 'Mouse_Over', 'Right_Click', 'Web_Forwards'
]

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    url = data.get('url', '').strip()

    # ---- Normalize + basic validation ----
    url = normalize_url(url)
    domain = get_domain(url)

    if not is_valid_domain(domain):
        return jsonify({
            "prediction": "phishing",
            "confidence": 0.9,
            "result": "⚠️ Invalid or suspicious URL format",
            "brand": None,
            "score": None
        })

    # ---- Whitelist (demo safety) ----
    if any(td in domain for td in TRUSTED_DOMAINS):
        return jsonify({
            "prediction": "legitimate",
            "confidence": 0.99,
            "result": "✅ Trusted Domain",
            "brand": None,
            "score": None
        })

    # ---- Feature extraction ----
    feature_dict = extract_features(url)
    input_df = pd.DataFrame([feature_dict])
    input_df = input_df[FEATURE_ORDER]

    # ---- Model prediction + threshold ----
    prediction = model.predict(input_df)[0]

    try:
        proba = model.predict_proba(input_df)[0]
        confidence = float(max(proba))
    except:
        confidence = 0.8

    # Threshold to reduce false positives
    if prediction == 1 and confidence > 0.85:
        label = "phishing"
        result_text = "⚠️ Phishing Website Detected"
    else:
        label = "legitimate"
        result_text = "✅ Legitimate Website"

    # ---- Visual detection with threshold ----
    brand = None
    score = None
    try:
        site_img = capture_website(url)
        brand, score = detect_brand_similarity(site_img)
        if score:
            score = round(score * 100, 2)
        # ignore weak matches
        if not score or score < 70:
            brand, score = None, None
    except:
        pass

    return jsonify({
        "prediction": label,
        "confidence": confidence,
        "result": result_text,
        "brand": brand,
        "score": score
    })

    # ✅ FINAL RESPONSE (STANDARDIZED)
    return jsonify({
        "prediction": label,        # ⭐ REQUIRED (fixes your bug)
        "confidence": confidence,   # ⭐ useful for UI
        "result": result_text,      # optional (for display)
        "brand": brand,
        "score": score
    })


if __name__ == '__main__':
    app.run(debug=True)
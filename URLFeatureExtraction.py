from urllib.parse import urlparse
import re

def extract_features(url):
    parsed = urlparse(url)

    features = {}

    # 1. Have_IP
    features["Have_IP"] = 1 if re.match(r"\d+\.\d+\.\d+\.\d+", parsed.netloc) else 0

    # 2. Have_At
    features["Have_At"] = 1 if "@" in url else 0

    # 3. URL_Length
    features["URL_Length"] = len(url)

    # 4. URL_Depth
    features["URL_Depth"] = url.count("/")

    # 5. Redirection
    features["Redirection"] = 1 if url.count("//") > 1 else 0

    # 6. https_Domain
    features["https_Domain"] = 1 if "https" in parsed.netloc else 0

    # 7. TinyURL
    shortening_services = r"bit\.ly|goo\.gl|tinyurl|ow\.ly|t\.co"
    features["TinyURL"] = 1 if re.search(shortening_services, url) else 0

    # 8. Prefix/Suffix
    features["Prefix/Suffix"] = 1 if "-" in parsed.netloc else 0

    # 9–16 (Not easily extractable without external services)
    # Setting safe defaults (can improve later)

    features["DNS_Record"] = 0
    features["Web_Traffic"] = 0
    features["Domain_Age"] = 0
    features["Domain_End"] = 0
    features["iFrame"] = 0
    features["Mouse_Over"] = 0
    features["Right_Click"] = 0
    features["Web_Forwards"] = 0

    return features
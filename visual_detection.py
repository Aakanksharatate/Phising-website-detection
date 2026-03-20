import cv2
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from skimage.metrics import structural_similarity as ssim


# STEP 1: CAPTURE WEBSITE SCREENSHOT
def capture_website(url, output="site.png"):

    if not url.startswith("http"):
        url = "https://" + url

    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")

    driver = webdriver.Chrome(options=options)

    driver.set_window_size(1200, 800)
    driver.get(url)

    driver.save_screenshot(output)

    driver.quit()

    return output


# STEP 2: IMAGE SIMILARITY
def compare_images(img1_path, img2_path):

    img1 = cv2.imread(img1_path)
    img2 = cv2.imread(img2_path)

    if img1 is None or img2 is None:
        return 0

    img1 = cv2.resize(img1, (600, 400))
    img2 = cv2.resize(img2, (600, 400))

    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    score, _ = ssim(gray1, gray2, full=True)

    return score


# STEP 3: BRAND DETECTION
def detect_brand_similarity(site_image):

    brands = {
        "Amazon": "legit_sites/amazon.png",
        "Google": "legit_sites/google.png",
        "Facebook": "legit_sites/facebook.png"
    }

    results = {}

    for brand, img in brands.items():
        score = compare_images(site_image, img)
        results[brand] = score

    best_match = max(results, key=results.get)
    best_score = results[best_match]

    # ✅ IMPORTANT FIX: Apply threshold
    if best_score < 0.6:
        return None, None   # no strong similarity

    return best_match, best_score
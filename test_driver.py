from selenium import webdriver

driver = webdriver.Chrome()

driver.get("https://google.com")

print("Chrome opened successfully!")

driver.quit()
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time

# 1. Setup Chrome (browser opens automatically)
driver = webdriver.Chrome()

# 2. Go to Blinkit
driver.get("https://www.blinkit.com")
print("Opened Blinkit...")
time.sleep(3)

# 3. MANUAL STEP YOU DO:
print("PLEASE MANUALLY:")
print("1. Set location to Bangalore (560001)")
print("2. Click search box")
print("3. Type 'milk' and search")
print("4. Wait for products to load")
print("5. Press ENTER here when ready...")
input()  # Wait for you to do it

# 4. Code extracts what's on screen
print("\n📦 Extracting products from screen...")

# Find all product names and prices
try:
    # Try different selectors (website changes)
    products = driver.find_elements(By.CLASS_NAME, "product") or \
               driver.find_elements(By.CLASS_NAME, "ProductCard") or \
               driver.find_elements(By.XPATH, "//div[contains(@class, 'item')]")
    
    if products:
        print(f"Found {len(products)} products!")
        
        for i, product in enumerate(products[:5], 1):
            text = product.text.strip()
            if text:
                # Simple extraction
                lines = text.split('\n')
                print(f"\n{i}. {' | '.join(lines[:3])}")
    else:
        print("No products found with selectors.")
        print("Current page URL:", driver.current_url)
        print("Page title:", driver.title)
        
        # Show ALL text on page as backup
        all_text = driver.find_element(By.TAG_NAME, "body").text
        print("\nAll text on page (first 500 chars):")
        print(all_text[:500])
        
except Exception as e:
    print(f"Error: {e}")

# 5. Close browser
print("\nClosing browser...")
driver.quit()
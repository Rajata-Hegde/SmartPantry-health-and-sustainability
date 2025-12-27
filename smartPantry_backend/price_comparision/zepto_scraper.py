from playwright.sync_api import sync_playwright
import time
from datetime import datetime
import re

class ZeptoScraper:
    def __init__(self, pincode="560001"):
        self.pincode = pincode
    
    def search(self, query):
        """REAL Zepto scraping using browser automation"""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            try:
                # Go to Zepto
                page.goto("https://www.zeptonow.com/", timeout=30000)
                time.sleep(3)
                
                # Handle location popup
                try:
                    page.click("button:has-text('Bangalore')", timeout=3000)
                except:
                    pass
                
                # Search for product
                search_selector = "input[placeholder*='Search'], input[type='search']"
                page.fill(search_selector, query)
                page.press(search_selector, "Enter")
                
                time.sleep(4)  # Wait for results
                
                # Extract product data
                products = []
                
                # Try different selectors for product cards
                selectors = [
                    "[data-testid*='product']",
                    ".product-card",
                    ".item-card",
                    "div[class*='product']"
                ]
                
                for selector in selectors:
                    product_cards = page.locator(selector).all()
                    if product_cards:
                        for card in product_cards[:3]:  # Get first 3
                            try:
                                # Get product info
                                name = card.locator("h3, .name, [data-testid='product-name']").first.text_content()
                                price_text = card.locator(".price, [data-testid='price']").first.text_content()
                                
                                # Extract price
                                price_match = re.search(r'₹?\s*(\d+)', price_text)
                                price = float(price_match.group(1)) if price_match else 0
                                
                                if price > 0 and name:
                                    products.append({
                                        'name': name.strip(),
                                        'price': price + 5,  # MRP estimate
                                        'discounted_price': price,
                                        'quantity': self._extract_quantity(name),
                                        'brand': self._extract_brand(name),
                                        'delivery_time': '10-12 min',
                                        'timestamp': datetime.now().isoformat()
                                    })
                            except:
                                continue
                        break
                
                browser.close()
                return products
                
            except Exception as e:
                print(f"Zepto scraping error: {e}")
                browser.close()
                return []
    
    def _extract_quantity(self, name):
        """Extract quantity from product name"""
        patterns = [
            r'(\d+\s*(?:g|gram))',
            r'(\d+\s*(?:kg|kilo))',
            r'(\d+\s*(?:ml))',
            r'(\d+\s*(?:l|litre))',
            r'(\d+\s*(?:pcs|pieces))'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, name.lower())
            if match:
                return match.group(1)
        return ""
    
    def _extract_brand(self, name):
        """Extract brand from product name"""
        brands = ['Amul', 'Nestle', 'Britannia', 'Tata', 'MTR', 'Aashirvaad']
        for brand in brands:
            if brand.lower() in name.lower():
                return brand
        return ""
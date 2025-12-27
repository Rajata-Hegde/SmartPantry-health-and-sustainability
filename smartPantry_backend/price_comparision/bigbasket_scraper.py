import requests
from bs4 import BeautifulSoup
from datetime import datetime
import re

class BigBasketScraper:
    def __init__(self):
        self.base_url = "https://www.bigbasket.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        self.session = requests.Session()
    
    def search(self, query):
        """Search ANY product on BigBasket - REAL scraping"""
        print(f"   Searching BigBasket for: '{query}'")
        
        try:
            # Format query for URL
            search_query = query.replace(' ', '+')
            url = f"{self.base_url}/ps/?q={search_query}"
            
            response = self.session.get(url, headers=self.headers, timeout=20)
            
            if response.status_code == 200:
                # Parse HTML
                soup = BeautifulSoup(response.content, 'html.parser')
                
                products = []
                
                # Look for product cards - try multiple selectors
                selectors = [
                    '[qa="product"]',
                    '.items .item',
                    '.product',
                    '.SKUDeck___StyledDiv-sc-1e5d9gk-0 .product'
                ]
                
                for selector in selectors:
                    items = soup.select(selector)
                    if items:
                        for item in items[:5]:  # Get top 5
                            product_data = self._extract_product_data(item)
                            if product_data:
                                products.append(product_data)
                        break
                
                return products
            
            return []
            
        except Exception as e:
            print(f"   BigBasket error: {str(e)[:50]}")
            return []
    
    def _extract_product_data(self, element):
        """Extract product data from HTML element"""
        try:
            # Get product name
            name_elem = element.select_one('[qa="product_name"], h3, .prod-name')
            name = name_elem.get_text(strip=True) if name_elem else ""
            
            if not name or len(name) < 2:
                return None
            
            # Get price
            price_elem = element.select_one('[qa="productPrice"], .price, .discnt-price')
            price_text = price_elem.get_text(strip=True) if price_elem else "₹0"
            
            # Extract numeric price
            price_match = re.search(r'₹?\s*(\d+(?:\.\d+)?)', price_text)
            price = float(price_match.group(1)) if price_match else 0
            
            if price <= 0:
                return None
            
            # Get MRP
            mrp_elem = element.select_one('.strike, del, .mrp')
            mrp = price
            if mrp_elem:
                mrp_text = mrp_elem.get_text(strip=True)
                mrp_match = re.search(r'₹?\s*(\d+(?:\.\d+)?)', mrp_text)
                if mrp_match:
                    mrp = float(mrp_match.group(1))
            
            # Get quantity
            qty_elem = element.select_one('[label="wt"], .size, .net-weight')
            quantity = qty_elem.get_text(strip=True) if qty_elem else ""
            
            # Get brand (extract from name if possible)
            brand = ""
            common_brands = ['Amul', 'Nestle', 'Britannia', 'Tata', 'MTR', 'Aashirvaad', 
                           'Fortune', 'Saffola', 'Parle', 'Lays', 'Maggi', 'Kellogg']
            for b in common_brands:
                if b.lower() in name.lower():
                    brand = b
                    break
            
            return {
                'name': name[:200],
                'price': mrp,
                'discounted_price': price,
                'quantity': quantity,
                'brand': brand,
                'delivery_time': '90-120 min',
                'timestamp': datetime.now().isoformat(),
                'platform': 'BigBasket'
            }
            
        except:
            return None
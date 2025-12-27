import requests
from datetime import datetime
import json

class InstamartScraper:
    def __init__(self, pincode="560001"):
        self.pincode = pincode
        self.session = requests.Session()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'x-app-id': 'SwiggyInstamartWeb',
            'Content-Type': 'application/json'
        }
    
    def search(self, query):
        """REAL Swiggy Instamart API"""
        try:
            # First, get location ID
            location_id = self._get_location_id()
            if not location_id:
                return []
            
            # Search API
            url = "https://www.swiggy.com/api/instamart/search"
            
            payload = {
                "query": query,
                "store_id": location_id,
                "limit": 10,
                "offset": 0
            }
            
            response = self.session.post(url, json=payload, headers=self.headers, timeout=15)
            data = response.json()
            
            products = []
            
            if data.get('data', {}).get('items'):
                for item in data['data']['items'][:3]:  # Get top 3
                    if item.get('price'):
                        products.append({
                            'name': item.get('name', query),
                            'price': item.get('price', {}).get('mrp', 0),
                            'discounted_price': item.get('price', {}).get('final_price', 0),
                            'quantity': item.get('weight', ''),
                            'brand': item.get('brand', ''),
                            'delivery_time': '15-20 min',
                            'timestamp': datetime.now().isoformat()
                        })
            
            return products
            
        except Exception as e:
            print(f"Instamart API error: {e}")
            return []
    
    def _get_location_id(self):
        """Get location/store ID for Instamart"""
        try:
            url = f"https://www.swiggy.com/api/instamart/location?place_id={self.pincode}"
            response = self.session.get(url, headers=self.headers, timeout=10)
            data = response.json()
            
            if data.get('data', {}).get('stores'):
                return data['data']['stores'][0]['store_id']
            return None
        except:
            return None
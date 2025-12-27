import time
from datetime import datetime

print("🛒 LOADING UNIVERSAL PRICE COMPARISON...")

# Import scrapers
from blinkit_scraper import BlinkitScraper
from bigbasket_scraper import BigBasketScraper
from zepto_scraper import ZeptoScraper
from instamart_scraper import InstamartScraper

class UniversalPriceComparer:
    def __init__(self, pincode="560001"):
        self.pincode = pincode
        
        # Initialize all platform scrapers
        self.platforms = {
            "Blinkit": BlinkitScraper(pincode),
            "BigBasket": BigBasketScraper(),
            "Zepto": ZeptoScraper(pincode),
            "Instamart": InstamartScraper(pincode)
        }
        
        print(f"✅ Ready! Enter ANY product name to compare.")
        print(f"📍 Location: Bangalore (Pincode: {pincode})")
    
    def find_best_match(self, all_products, query):
        """Find the best matching product across platforms"""
        if not all_products:
            return []
        
        # Group products by similarity
        query_lower = query.lower()
        matched_products = []
        
        for platform, products in all_products.items():
            if products:
                # Take the first product (most relevant from search)
                product = products[0]
                
                # Calculate relevance score
                relevance = self._calculate_relevance(product['name'], query_lower)
                product['relevance'] = relevance
                product['platform'] = platform
                
                matched_products.append(product)
        
        # Sort by relevance (highest first)
        matched_products.sort(key=lambda x: x['relevance'], reverse=True)
        
        return matched_products
    
    def _calculate_relevance(self, product_name, query):
        """Calculate how relevant a product is to the query"""
        name_lower = product_name.lower()
        
        # Exact match gives highest score
        if query in name_lower:
            return 100
        
        # Check word overlap
        query_words = set(query.split())
        name_words = set(name_lower.split())
        
        common_words = query_words.intersection(name_words)
        if common_words:
            return len(common_words) * 20
        
        # Partial match
        for word in query_words:
            if word in name_lower:
                return 30
        
        return 10  # Default low score
    
    def compare_product(self, product_name):
        """Compare ANY product across all platforms"""
        print(f"\n{'='*60}")
        print(f"🔍 COMPARING: {product_name.upper()}")
        print(f"⏰ Time: {datetime.now().strftime('%I:%M %p')}")
        print('='*60)
        
        all_results = {}
        
        # Search on each platform
        for platform_name, scraper in self.platforms.items():
            try:
                print(f"\n📱 {platform_name}:")
                
                # Get products from this platform
                products = scraper.search(product_name)
                
                if products:
                    all_results[platform_name] = products
                    print(f"   ✅ Found {len(products)} products")
                    
                    # Show top result
                    top_product = products[0]
                    print(f"   Top: {top_product['name'][:40]}...")
                    print(f"   Price: ₹{top_product['discounted_price']} ({top_product['quantity']})")
                else:
                    print(f"   ❌ No products found")
                
                # Be respectful - wait between requests
                time.sleep(2)
                
            except Exception as e:
                print(f"   ⚠️  Error: {str(e)[:50]}")
                continue
        
        # Find best matching products
        best_matches = self.find_best_match(all_results, product_name)
        
        # Show comparison
        if best_matches:
            self._show_comparison(best_matches, product_name)
        else:
            print(f"\n😞 No matching products found for '{product_name}'")
            print("Try:")
            print("  • Check spelling")
            print("  • Try generic name: 'milk' instead of 'Amul Gold Milk 500ml'")
            print("  • Try English names")
        
        return best_matches
    
    def _show_comparison(self, products, original_query):
        """Show comparison table"""
        print(f"\n{'='*60}")
        print("📊 PRICE COMPARISON")
        print('='*60)
        
        # Sort by price (cheapest first)
        products.sort(key=lambda x: x['discounted_price'])
        
        # Table header
        print(f"\n{'Platform':<12} {'Price':<12} {'Product':<30} {'Delivery':<15} {'Match'}")
        print('-' * 75)
        
        for p in products:
            # Shorten long product names
            display_name = p['name']
            if len(display_name) > 28:
                display_name = display_name[:25] + "..."
            
            # Match quality indicator
            match_score = p.get('relevance', 0)
            if match_score > 80:
                match = "✅ Excellent"
            elif match_score > 50:
                match = "👍 Good"
            else:
                match = "⚠️  Fair"
            
            print(f"{p['platform']:<12} ₹{p['discounted_price']:<11} "
                  f"{display_name:<30} {p['delivery_time']:<15} {match}")
        
        # Show insights
        if len(products) > 1:
            cheapest = products[0]
            expensive = products[-1]
            
            savings = expensive['discounted_price'] - cheapest['discounted_price']
            percent = (savings / expensive['discounted_price']) * 100 if expensive['discounted_price'] > 0 else 0
            
            print(f"\n💡 INSIGHTS:")
            print(f"   • Cheapest: {cheapest['platform']} (₹{cheapest['discounted_price']})")
            
            if savings > 0:
                print(f"   • You Save: ₹{savings:.2f} ({percent:.1f}%)")
            
            # Find fastest delivery
            fast_platforms = [p for p in products if 'min' in p['delivery_time']]
            if fast_platforms:
                fastest = min(fast_platforms, 
                            key=lambda x: int(x['delivery_time'].split('-')[0]))
                print(f"   • Fastest: {fastest['platform']} ({fastest['delivery_time']})")
        
        print(f"\n✅ Compared {len(products)} platforms")
    
    def run(self):
        """Main interactive loop"""
        print("\n" + "="*60)
        print("🛒 UNIVERSAL GROCERY PRICE COMPARISON")
        print("="*60)
        print("Enter ANY product name to compare across platforms")
        print("Platforms: Blinkit, BigBasket, Zepto, Instamart")
        print("Type 'exit' to quit")
        print("-" * 60)
        
        while True:
            product = input("\n📦 Enter product name: ").strip()
            
            if product.lower() in ['exit', 'quit', 'q']:
                print("\n👋 Happy shopping!")
                break
            
            if product:
                self.compare_product(product)
            else:
                print("❌ Please enter a product name")

# Run the system
if __name__ == "__main__":
    comparer = UniversalPriceComparer(pincode="560001")
    comparer.run()
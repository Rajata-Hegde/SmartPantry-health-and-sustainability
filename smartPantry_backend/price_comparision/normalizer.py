import re
from difflib import SequenceMatcher

class ProductNormalizer:
    def __init__(self):
        # Common brands in Indian groceries
        self.brands = {
            'amul': ['amul', 'a-mul'],
            'nestle': ['nestle', 'nestlé', 'maggi'],
            'britannia': ['britannia', 'britania'],
            'tata': ['tata', 'tata salt'],
            'mother dairy': ['mother dairy', 'motherdairy'],
            'mtr': ['mtr'],
            'aashirvaad': ['aashirvaad', 'ashirvad']
        }
        
        # Common products mapping
        self.product_map = {
            'milk': ['milk', 'doodh', 'full cream milk', 'toned milk'],
            'bread': ['bread', 'double roti', 'brown bread', 'white bread'],
            'eggs': ['eggs', 'eggs - regular', 'farm eggs', 'brown eggs'],
            'rice': ['rice', 'basmati rice', 'sona masoori', 'white rice'],
            'atta': ['atta', 'wheat flour', 'chakki atta']
        }
    
    def normalize(self, product_name):
        """Normalize product name for comparison"""
        name_lower = product_name.lower().strip()
        
        # Remove extra words
        words_to_remove = ['fresh', 'premium', 'original', 'natural', 'pure']
        for word in words_to_remove:
            name_lower = name_lower.replace(word, '')
        
        # Extract brand
        brand = None
        for brand_name, variations in self.brands.items():
            if any(variation in name_lower for variation in variations):
                brand = brand_name.title()
                break
        
        # Extract quantity
        quantity = self._extract_quantity(name_lower)
        
        # Extract base product name
        base_name = self._extract_base_name(name_lower, brand)
        
        # Clean base name
        base_name = re.sub(r'\d+[a-zA-Z]*', '', base_name)  # Remove numbers
        base_name = re.sub(r'[^\w\s]', '', base_name)  # Remove special chars
        base_name = ' '.join(base_name.split())  # Remove extra spaces
        
        return {
            'normalized_name': base_name,
            'brand': brand,
            'quantity': quantity,
            'original_name': product_name
        }
    
    def _extract_quantity(self, text):
        """Extract quantity in standardized format"""
        # Patterns for different units
        patterns = {
            'g': r'(\d+)\s*(?:g|gram|grams)\b',
            'kg': r'(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogram)\b',
            'ml': r'(\d+)\s*(?:ml|milliliter)\b',
            'l': r'(\d+(?:\.\d+)?)\s*(?:l|litre|liter)\b',
            'pieces': r'(\d+)\s*(?:pcs|pieces|nos?)\b',
            'pack': r'(\d+)\s*(?:pack|pkt|packet)\b'
        }
        
        for unit, pattern in patterns.items():
            match = re.search(pattern, text)
            if match:
                value = match.group(1)
                if unit == 'kg':
                    return f"{float(value) * 1000}g"
                elif unit == 'l':
                    return f"{float(value) * 1000}ml"
                return f"{value}{unit}"
        
        return ""
    
    def _extract_base_name(self, text, brand):
        """Extract base product name"""
        # Remove brand name if found
        if brand:
            brand_lower = brand.lower()
            text = text.replace(brand_lower, '')
        
        # Remove quantity patterns
        text = re.sub(r'\d+\s*(?:g|kg|ml|l|pcs|pack)\b', '', text)
        
        # Remove common descriptors
        descriptors = ['organic', 'fresh', 'premium', 'original', 'natural']
        for desc in descriptors:
            text = text.replace(desc, '')
        
        return text.strip()
    
    def are_similar(self, product1, product2, threshold=0.7):
        """Check if two products are similar using fuzzy matching"""
        norm1 = self.normalize(product1)
        norm2 = self.normalize(product2)
        
        # Compare normalized names
        similarity = SequenceMatcher(None, 
                                   norm1['normalized_name'], 
                                   norm2['normalized_name']).ratio()
        
        # Bonus if same brand
        if norm1['brand'] and norm2['brand'] and norm1['brand'] == norm2['brand']:
            similarity += 0.2
        
        # Penalize if different quantities
        if norm1['quantity'] and norm2['quantity'] and norm1['quantity'] != norm2['quantity']:
            similarity -= 0.1
        
        return similarity >= threshold

# Test the normalizer
if __name__ == "__main__":
    normalizer = ProductNormalizer()
    
    test_products = [
        "Amul Gold Milk 500ml",
        "Amul Taaza Toned Milk 1L",
        "Nestle Milk 500ml",
        "Britannia Milk Bread 400g"
    ]
    
    for product in test_products:
        normalized = normalizer.normalize(product)
        print(f"{product} -> {normalized}")
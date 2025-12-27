import re
import os
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
from tabulate import tabulate
import cv2
import numpy as np
import requests  # <-- added for sending to Flask backend

# Set the Tesseract executable path

pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
# Set the TESSDATA_PREFIX environment variable
os.environ['TESSDATA_PREFIX'] = r"C:/Program Files/Tesseract-OCR/tessdata"


class ReceiptScanner:
    def __init__(self, image_path):
        self.image_path = image_path
        self.store_name = ""
        self.items = []
        self.bill_number = ""
        self.date = ""
        self.total_amount = 0.0
        
    def preprocess_image(self):
        """Preprocess image to improve OCR accuracy"""
        try:
            # Read image with OpenCV
            img = cv2.imread(self.image_path)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply thresholding to get black text on white background
            gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            
            # Denoise
            gray = cv2.medianBlur(gray, 3)
            
            # Optional: Resize for better OCR (if image is too small)
            height, width = gray.shape
            if height < 1000:
                scale = 1000 / height
                gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            
            # Convert back to PIL Image
            return Image.fromarray(gray)
        except Exception as e:
            print(f"Error preprocessing image: {e}")
            # Fallback to original image
            return Image.open(self.image_path)
    
    def extract_text(self):
        """Extract text from receipt image using OCR"""
        try:
            # Preprocess the image
            image = self.preprocess_image()
            

            # Use custom OCR config for better accuracy
            custom_config = r'--oem 3 --psm 6'
            text = pytesseract.image_to_string(image, config=custom_config)
            
            print("\n--- Extracted Text ---")
            print(text)
            print("--- End of Extracted Text ---\n")
            
            return text
        except Exception as e:
            print(f"Error reading image: {e}")
            return None
    
    def clean_currency_symbol(self, text):
        """Clean and standardize currency symbols that might be misread by OCR"""
        # Replace common OCR misreads of $ symbol
        text = re.sub(r'[S§¢]\s*(\d)', r'$\1', text)
        text = re.sub(r'(\d)\s*[S§¢]', r'\1', text)
        return text
    
    def extract_metadata(self, text):
        """Extract bill number, date, and store name from receipt"""
        lines = text.split('\n')
        
        # Extract store name (look for it in first 15 lines, skip certain patterns)
        store_candidates = []
        for i, line in enumerate(lines[:15]):
            line_stripped = line.strip()
            if line_stripped and len(line_stripped) > 3:
                # Skip obvious non-store lines
                if re.search(r'Bill|Date|Name:\s*CASH|ADD:|Mob|Phone|GSTIN|TAX|INVOICE|DESCRIPTION|QTY|AMOUNT|HSN|M\.R\.P', line_stripped, re.IGNORECASE):
                    continue
                # Must have reasonable letters (not just garbage OCR)
                if re.search(r'[A-Z][a-z]{2,}|[A-Z]{2,}', line_stripped):
                    # Calculate "quality score" - higher is better
                    alpha_count = sum(c.isalpha() for c in line_stripped)
                    space_count = sum(c.isspace() for c in line_stripped)
                    special_count = sum(not c.isalnum() and not c.isspace() for c in line_stripped)
                    
                    if alpha_count > 3 and alpha_count > special_count:
                        store_candidates.append((i, line_stripped, alpha_count))
        
        # Pick best store name candidate (prefer early lines with more letters)
        if store_candidates:
            # Sort by position (earlier is better) and alpha count
            store_candidates.sort(key=lambda x: (x[0], -x[2]))
            self.store_name = store_candidates[0][1]
        
        # Extract bill number with more flexible patterns
        bill_patterns = [
            r'Bill\s*No\.?\s*:?\s*[:\.]?\s*(\d+)',
            r'No\.?\s*:?\s*(\d{5,})',
            r'Invoice\s*No\.?\s*:?\s*(\d+)',
            r'Receipt\s*No\.?\s*:?\s*(\d+)',
        ]
        for line in lines[:20]:
            for pattern in bill_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    self.bill_number = match.group(1)
                    break
            if self.bill_number:
                break
        
        # Extract date with more flexible patterns
        date_patterns = [
            r'Date?\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
            r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})',
        ]
        for line in lines[:20]:
            for pattern in date_patterns:
                match = re.search(pattern, line)
                if match:
                    self.date = match.group(1)
                    break
            if self.date:
                break
    
    def parse_receipt(self, text):
        """Parse the extracted text to identify store, items, quantities, and prices"""
        if not text:
            return
        
        # Clean up currency symbols
        text = self.clean_currency_symbol(text)
        lines = text.split('\n')
        
        # Extract metadata
        self.extract_metadata(text)
        
        # Track if we're in the items section
        in_items_section = False
        found_description_header = False
        
        # Enhanced pattern matching for receipt items
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 3:
                continue
            
            # Detect start of items section
            if re.search(r'DESCRIPTION|ITEM|PRODUCT|HSN\s+Item', line, re.IGNORECASE):
                found_description_header = True
                in_items_section = True
                continue
            
            # Skip obvious header/footer lines
            if re.search(r'^(QTY|AMOUNT|Rate|M\.R\.P|Bill No|Date|Name|ADD:|Mob|Phone|GSTIN|TAX INVOICE|User Name|Signature|Exchange|Thank|Visit)', line, re.IGNORECASE):
                continue
            
            # Stop parsing at summary section
            if re.search(r'E\.&\.O\.E|Tax-X|Items=|Total|Subtotal|CGST|SGST|Net Amt', line, re.IGNORECASE):
                # But still try to extract total
                if 'Total' in line or 'Net Amt' in line:
                    self._extract_total_from_line(line)
                continue
            
            # Pattern 1: Simple format - "Item Qty $Amount" or "Item Qty Amount"
            # Handle both $ and S (OCR misread)
            pattern1 = r'^(.+?)\s+(\d+\.?\d*)\s+[\$]?(\d+\.?\d*)$'
            match1 = re.match(pattern1, line)
            
            if match1:
                item_name = match1.group(1).strip()
                quantity = float(match1.group(2))
                total = float(match1.group(3))
                unit_price = total / quantity if quantity > 0 else total
                
                if self._is_valid_item(item_name, line):
                    self.items.append({
                        'item': self._clean_item_name(item_name),
                        'quantity': quantity,
                        'unit_price': unit_price,
                        'total': total
                    })
                    continue
            
            # Pattern 2: "Item Qty UnitPrice Total" (e.g., "LUX(big)* 1.00 20.00 20.00")
            pattern2 = r'^(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$'
            match2 = re.match(pattern2, line)
            
            if match2:
                item_name = match2.group(1).strip()
                quantity = float(match2.group(2))
                unit_price = float(match2.group(3))
                total = float(match2.group(4))
                
                if self._is_valid_item(item_name, line):
                    self.items.append({
                        'item': self._clean_item_name(item_name),
                        'quantity': quantity,
                        'unit_price': unit_price,
                        'total': total
                    })
                    continue
            
            # Pattern 3: HSN format - Look ahead for multi-line items
            # "1701 SUGAR" followed by "1 2.000 0.00 45.00 90.00"
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                
                # Current line: HSN code + item name
                pattern3_line1 = r'^(\d{4})\s+(.+)$'
                # Next line: line number, qty, mrp, rate, amount
                pattern3_line2 = r'^(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$'
                
                match3_1 = re.match(pattern3_line1, line)
                match3_2 = re.match(pattern3_line2, next_line)
                
                if match3_1 and match3_2:
                    item_name = match3_1.group(2).strip()
                    quantity = float(match3_2.group(2))
                    unit_price = float(match3_2.group(4))
                    total = float(match3_2.group(5))
                    
                    if self._is_valid_item(item_name, line):
                        self.items.append({
                            'item': self._clean_item_name(item_name),
                            'quantity': quantity,
                            'unit_price': unit_price,
                            'total': total
                        })
                        continue
            
            # Pattern 4: Looking for numbers pattern that suggests item data
            # Sometimes OCR mangles item names but numbers are clear
            # "0713 MOONG DALL\n2 1.000 0.00 118.00 118.00"
            pattern4 = r'^(\d{4})\s+(.+)$'
            match4 = re.match(pattern4, line)
            
            if match4 and i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                # Try to find quantity and amounts
                pattern4_next = r'^(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$'
                match4_next = re.match(pattern4_next, next_line)
                
                if match4_next:
                    item_name = match4.group(2).strip()
                    quantity = float(match4_next.group(2))
                    unit_price = float(match4_next.group(4))
                    total = float(match4_next.group(5))
                    
                    # More lenient validation for HSN format
                    if len(item_name) >= 2 and re.search(r'[A-Za-z]{2,}', item_name):
                        self.items.append({
                            'item': self._clean_item_name(item_name),
                            'quantity': quantity,
                            'unit_price': unit_price,
                            'total': total
                        })
                        continue
            
            # Pattern 5: Single line with 5+ numbers (code, qty, multiple prices)
            # "1513 KLF COCONUT OIL 450ML\n3 1.000 235.00 225.00 225.00"
            pattern5 = r'^(.+?)\s+(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$'
            match5 = re.match(pattern5, line)
            
            if match5:
                item_name = match5.group(1).strip()
                # Remove leading numbers (HSN codes)
                item_name = re.sub(r'^\d+\s+', '', item_name)
                quantity = float(match5.group(3))
                unit_price = float(match5.group(5))
                total = float(match5.group(6))
                
                if self._is_valid_item(item_name, line):
                    self.items.append({
                        'item': self._clean_item_name(item_name),
                        'quantity': quantity,
                        'unit_price': unit_price,
                        'total': total
                    })
                    continue
        
        # Extract total amount from bottom of receipt
        self._extract_total(text)
    
    def _clean_item_name(self, item_name):
        """Clean up item name from OCR artifacts"""
        # Remove trailing asterisks
        item_name = re.sub(r'\*+$', '', item_name)
        # Remove leading/trailing whitespace
        item_name = item_name.strip()
        # Remove multiple spaces
        item_name = re.sub(r'\s+', ' ', item_name)
        return item_name
    
    def _extract_total(self, text):
        """Extract the total amount from receipt"""
        lines = text.split('\n')
        
        # Look for total in last 15 lines
        for line in reversed(lines[-15:]):
            self._extract_total_from_line(line)
            if self.total_amount > 0:
                return
    
    def _extract_total_from_line(self, line):
        """Extract total from a single line"""
        # Pattern: "TOTAL $57" or "Net Amt: 661.00" or "Total 628.80"
        total_patterns = [
            r'TOTAL\s*:?\s*[\$₹]?(\d+\.?\d*)',
            r'Net\s*Amt\s*:?\s*[\$₹]?(\d+\.?\d*)',
            r'Grand\s*Total\s*:?\s*[\$₹]?(\d+\.?\d*)',
            r'Amount\s*:?\s*[\$₹]?(\d+\.?\d*)',
        ]
        
        for pattern in total_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                amount = float(match.group(1))
                # Only accept reasonable totals (> 0 and < 1000000)
                if 0 < amount < 1000000:
                    self.total_amount = amount
                    return
    
    def _is_valid_item(self, item_name, full_line=""):
        """Check if the line is likely a valid item"""
        # Convert to lowercase for checking
        item_lower = item_name.lower()
        
        # Exclude common non-item terms
        exclude_terms = [
            'total', 'subtotal', 'tax', 'cash', 'change', 'card', 
            'amount', 'balance', 'paid', 'tender', 'summary',
            'cashier', 'clerk', 'register', 'receipt', 'thank',
            'date', 'time', 'phone', 'address', 'road', 'street',
            'gst', 'cgst', 'sgst', 'e.&.o.e', 'items=', 'r.off',
            'user name', 'signature', 'exchange', 'damage', 'visit',
            'rupees', 'only', 'bill no', 'invoice', 'hsn item',
            'description', 'qty', 'amount', 'm.r.p', 'rate'
        ]
        
        for term in exclude_terms:
            if term in item_lower:
                return False
        
        # Exclude if starts with common non-item prefixes
        if re.match(r'^(tax|cgst|sgst|total|subtotal|amount|qty)', item_lower):
            return False
        
        # Must have at least 2 characters
        if len(item_name) < 2:
            return False
        
        # Must have at least one letter
        if not re.search(r'[a-zA-Z]', item_name):
            return False
        
        # Exclude lines that are mostly garbage (OCR errors)
        alpha_count = sum(c.isalpha() for c in item_name)
        total_count = len(item_name.replace(' ', ''))
        if total_count > 0 and alpha_count / total_count < 0.3:
            return False
        
        # Exclude lines with too many special characters
        special_count = sum(not c.isalnum() and not c.isspace() for c in item_name)
        if special_count > len(item_name) / 2:
            return False
        
        return True
    
    def display_table(self):
        """Display extracted information in table format"""
        print("\n" + "="*70)
        print(f"STORE: {self.store_name if self.store_name else 'Unknown'}")
        if self.bill_number:
            print(f"BILL NO: {self.bill_number}")
        if self.date:
            print(f"DATE: {self.date}")
        print("="*70 + "\n")
        
        if not self.items:
            print("No items found on receipt.")
            print("\nTroubleshooting tips:")
            print("- Ensure the image is clear and well-lit")
            print("- Try taking a straight-on photo (not angled)")
            print("- Make sure text is readable in the image")
            return
        
        # Prepare data for table
        table_data = []
        for item in self.items:
            table_data.append([
                item['item'],
                item['quantity'],
                f"${item['unit_price']:.2f}",
                f"${item['total']:.2f}"
            ])
        
        # Print table
        headers = ["Item", "Qty", "Unit Price", "Total"]
        print(tabulate(table_data, headers=headers, tablefmt="grid"))
        
        # Calculate and display total
        calculated_total = sum(item['total'] for item in self.items)
        
        print(f"\nCALCULATED TOTAL: ${calculated_total:.2f}")
        
        if self.total_amount > 0:
            print(f"RECEIPT TOTAL: ${self.total_amount:.2f}")
            difference = abs(calculated_total - self.total_amount)
            if difference > 0.01:
                print(f"⚠ NOTE: Totals don't match. Difference: ${difference:.2f}")
                if difference / self.total_amount > 0.5:  # More than 50% off
                    print("   This suggests some items may not have been detected.")
        
        print()
    
    def scan(self):
        """Main method to scan and process receipt"""
        print("Scanning receipt...")
        text = self.extract_text()
        
        if text:
            print("Extracting information...")
            self.parse_receipt(text)
            self.display_table()

            # -----------------------------
            # SEND TO FLASK BACKEND (NO LOGIC CHANGES TO OCR)
            # -----------------------------
            try:
                payload = {
                    "store_name": self.store_name,
                    "bill_number": self.bill_number,
                    "date": self.date,
                    "total_amount": self.total_amount,
                    "items": self.items
                }
                print("\nSending extracted data to backend...")
                resp = requests.post("http://127.0.0.1:5000/receipt", json=payload, timeout=10)
                try:
                    print("Backend response:", resp.json())
                except Exception:
                    print("Backend returned non-json response, status:", resp.status_code)
            except Exception as e:
                print("Failed to send data to backend:", e)

        else:
            print("Failed to extract text from image.")


def main():
    # Example usage
    print("Receipt Scanner")
    print("-" * 60)
    receipt_path = input("Enter the path to your receipt image: ").strip()
    
    scanner = ReceiptScanner(receipt_path)
    scanner.scan()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import sys
import os
import json
import argparse
from PIL import Image
import re
import cv2
import numpy as np
import pytesseract

# You must have Tesseract installed and pytesseract available in Python environment.
# Configure tesseract path here if needed.
# Example on Windows:
# pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"



pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
os.environ["TESSDATA_PREFIX"] = r"C:\Program Files\Tesseract-OCR\tessdata"

def preprocess_image(path):
    try:
        img = cv2.imread(path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        gray = cv2.medianBlur(gray, 3)
        height, width = gray.shape
        if height < 1000:
            scale = 1000 / height
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        return Image.fromarray(gray)
    except Exception:
        return Image.open(path)


def clean_currency_symbol(text):
    text = re.sub(r'[S§¢]\s*(\d)', r'$\1', text)
    text = re.sub(r'(\d)\s*[S§¢]', r'\1', text)
    return text


class SimpleOCR:
    def __init__(self, path):
        self.path = path
        self.store_name = ""
        self.items = []
        self.bill_number = ""
        self.date = ""
        self.total_amount = 0.0

    def extract_text(self):
        image = preprocess_image(self.path)
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(image, config=custom_config)
        return text

    def _clean_item_name(self, item_name):
        item_name = re.sub(r'\*+$', '', item_name)
        item_name = item_name.strip()
        item_name = re.sub(r'\s+', ' ', item_name)
        return item_name

    def _is_valid_item(self, item_name, full_line=""):
        item_lower = item_name.lower()
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
        if re.match(r'^(tax|cgst|sgst|total|subtotal|amount|qty)', item_lower):
            return False
        if len(item_name) < 2:
            return False
        if not re.search(r'[a-zA-Z]', item_name):
            return False
        alpha_count = sum(c.isalpha() for c in item_name)
        total_count = len(item_name.replace(' ', ''))
        if total_count > 0 and alpha_count / total_count < 0.3:
            return False
        special_count = sum(not c.isalnum() and not c.isspace() for c in item_name)
        if special_count > len(item_name) / 2:
            return False
        return True

    def _extract_total_from_line(self, line):
        total_patterns = [
            r'TOTAL\s*:?[\$₹]?(\d+\.?\d*)',
            r'Net\s*Amt\s*:?[\$₹]?(\d+\.?\d*)',
            r'Grand\s*Total\s*:?[\$₹]?(\d+\.?\d*)',
            r'Amount\s*:?[\$₹]?(\d+\.?\d*)',
        ]
        for pattern in total_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                amount = float(match.group(1))
                if 0 < amount < 1000000:
                    self.total_amount = amount
                    return

    def extract_metadata(self, text):
        lines = text.split('\n')
        store_candidates = []
        for i, line in enumerate(lines[:15]):
            line_stripped = line.strip()
            if line_stripped and len(line_stripped) > 3:
                if re.search(r'Bill|Date|Name:\s*CASH|ADD:|Mob|Phone|GSTIN|TAX|INVOICE|DESCRIPTION|QTY|AMOUNT|HSN|M\.R\.P', line_stripped, re.IGNORECASE):
                    continue
                if re.search(r'[A-Z][a-z]{2,}|[A-Z]{2,}', line_stripped):
                    alpha_count = sum(c.isalpha() for c in line_stripped)
                    special_count = sum(not c.isalnum() and not c.isspace() for c in line_stripped)
                    if alpha_count > 3 and alpha_count > special_count:
                        store_candidates.append((i, line_stripped, alpha_count))
        if store_candidates:
            store_candidates.sort(key=lambda x: (x[0], -x[2]))
            self.store_name = store_candidates[0][1]
        bill_patterns = [
            r'Bill\s*No\.?\s*:??\s*[:\.]?\s*(\d+)',
            r'No\.?\s*:??\s*(\d{5,})',
            r'Invoice\s*No\.?\s*:??\s*(\d+)',
            r'Receipt\s*No\.?\s*:??\s*(\d+)',
        ]
        for line in lines[:20]:
            for pattern in bill_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    self.bill_number = match.group(1)
                    break
            if self.bill_number:
                break
        date_patterns = [
            r'Date?\s*:??\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
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

    def _extract_total(self, text):
        lines = text.split('\n')
        for line in reversed(lines[-15:]):
            self._extract_total_from_line(line)
            if self.total_amount > 0:
                return

    def parse_receipt(self, text):
        if not text:
            return
        text = clean_currency_symbol(text)
        lines = text.split('\n')
        self.extract_metadata(text)
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 3:
                continue
            if re.search(r'DESCRIPTION|ITEM|PRODUCT|HSN\s+Item', line, re.IGNORECASE):
                continue
            if re.search(r'^(QTY|AMOUNT|Rate|M\.R\.P|Bill No|Date|Name|ADD:|Mob|Phone|GSTIN|TAX INVOICE|User Name|Signature|Exchange|Thank|Visit)', line, re.IGNORECASE):
                continue
            if re.search(r'E\.|Tax-X|Items=|Total|Subtotal|CGST|SGST|Net Amt', line, re.IGNORECASE):
                if 'Total' in line or 'Net Amt' in line:
                    self._extract_total_from_line(line)
                continue
            pattern1 = r'^(.+?)\s+(\d+\.?\d*)\s+[\$]?(\d+\.?\d*)$'
            match1 = re.match(pattern1, line)
            if match1:
                item_name = match1.group(1).strip()
                quantity = float(match1.group(2))
                total = float(match1.group(3))
                unit_price = total / quantity if quantity > 0 else total
                if self._is_valid_item(item_name, line):
                    self.items.append({'name': self._clean_item_name(item_name), 'quantity': quantity, 'unit_price': unit_price, 'total': total})
                    continue
            pattern2 = r'^(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$'
            match2 = re.match(pattern2, line)
            if match2:
                item_name = match2.group(1).strip()
                quantity = float(match2.group(2))
                unit_price = float(match2.group(3))
                total = float(match2.group(4))
                if self._is_valid_item(item_name, line):
                    self.items.append({'name': self._clean_item_name(item_name), 'quantity': quantity, 'unit_price': unit_price, 'total': total})
                    continue
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                pattern3_line1 = r'^(\d{4})\s+(.+)$'
                pattern3_line2 = r'^(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$'
                match3_1 = re.match(pattern3_line1, line)
                match3_2 = re.match(pattern3_line2, next_line)
                if match3_1 and match3_2:
                    item_name = match3_1.group(2).strip()
                    quantity = float(match3_2.group(2))
                    unit_price = float(match3_2.group(4))
                    total = float(match3_2.group(5))
                    if self._is_valid_item(item_name, line):
                        self.items.append({'name': self._clean_item_name(item_name), 'quantity': quantity, 'unit_price': unit_price, 'total': total})
                        continue
            pattern4 = r'^(\d{4})\s+(.+)$'
            match4 = re.match(pattern4, line)
            if match4 and i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                pattern4_next = r'^(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$'
                match4_next = re.match(pattern4_next, next_line)
                if match4_next:
                    item_name = match4.group(2).strip()
                    quantity = float(match4_next.group(2))
                    unit_price = float(match4_next.group(4))
                    total = float(match4_next.group(5))
                    if len(item_name) >= 2 and re.search(r'[A-Za-z]{2,}', item_name):
                        self.items.append({'name': self._clean_item_name(item_name), 'quantity': quantity, 'unit_price': unit_price, 'total': total})
                        continue
            pattern5 = r'^(.*)\s+(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$'
            match5 = re.match(pattern5, line)
            if match5:
                item_name = match5.group(1).strip()
                item_name = re.sub(r'^\d+\s+', '', item_name)
                quantity = float(match5.group(3))
                unit_price = float(match5.group(5))
                total = float(match5.group(6))
                if self._is_valid_item(item_name, line):
                    self.items.append({'name': self._clean_item_name(item_name), 'quantity': quantity, 'unit_price': unit_price, 'total': total})
                    continue
        self._extract_total(text)

    def to_dict(self):
        return {
            'store_name': self.store_name,
            'bill_number': self.bill_number,
            'date': self.date,
            'total_amount': self.total_amount,
            'items': self.items
        }


def main():
    parser = argparse.ArgumentParser(description='OCR receipt to JSON')
    parser.add_argument('image', help='Path to receipt image')
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(json.dumps({'error': 'file not found'}))
        sys.exit(1)

    o = SimpleOCR(args.image)
    text = o.extract_text()
    if text:
        o.parse_receipt(text)
    print(json.dumps(o.to_dict()))


if __name__ == '__main__':
    main()

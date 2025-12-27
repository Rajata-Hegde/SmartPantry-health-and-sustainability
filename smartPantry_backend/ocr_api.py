from flask import Flask, request, jsonify
import tempfile
from ocr import ReceiptScanner   # your OCR class

app = Flask(__name__)

@app.route("/run_ocr", methods=["POST"])
def run_ocr():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    img = request.files["image"]

    # Save temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        img.save(tmp.name)
        scanner = ReceiptScanner(tmp.name)
        scanner.scan()

        # Build response to send to main backend
        return jsonify({
            "store_name": scanner.store_name,
            "bill_number": scanner.bill_number,
            "date": scanner.date,
            "total_amount": scanner.total_amount,
            "items": scanner.items
        })

if __name__ == "__main__":
    app.run(port=8000, debug=True)

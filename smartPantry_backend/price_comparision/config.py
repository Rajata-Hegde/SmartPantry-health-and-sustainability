# config.py
import os
from dotenv import load_dotenv

load_dotenv()

# Bangalore pincodes
PINCODES = ["560001", "560034", "560102"]  # Add your pincodes

# Platform configurations
PLATFORMS = {
    "blinkit": {
        "base_url": "https://blinkit.com",
        "enabled": True,
        "pincode_required": True
    },
    "bigbasket": {
        "base_url": "https://www.bigbasket.com",
        "enabled": True
    },
    "zepto": {
        "base_url": "https://www.zepto.com",
        "enabled": True,
        "pincode_required": True
    }
}

# Database
DB_PATH = "data/prices.db"
LOG_FILE = "logs/scraper.log"
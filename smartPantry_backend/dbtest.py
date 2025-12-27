import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

try:
    conn = psycopg2.connect(
        host=os.getenv("PGHOST"),
        port=os.getenv("PGPORT"),
        dbname=os.getenv("PGDATABASE"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD")
    )
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print("✅ Connected to PostgreSQL:", cur.fetchone()[0])
    cur.close()
    conn.close()
except Exception as e:
    print("❌ Connection failed:", e)

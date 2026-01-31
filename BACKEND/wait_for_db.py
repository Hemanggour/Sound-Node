import os
import time

import psycopg

db_url = os.getenv("DATABASE_URL")

print("Waiting for database...")

while True:
    try:
        psycopg.connect(db_url)
        print("Database is ready")
        break
    except Exception:
        print("Database not ready, waiting...")
        time.sleep(2)

import os
import glob
import sqlite3

db = os.getenv("PATHOS_DB_PATH")
candidates = [db] if db else glob.glob("**/*.db", recursive=True)
candidates = [c for c in candidates if c]

if not candidates:
    raise SystemExit("No .db found and PATHOS_DB_PATH not set.")

path = candidates[0]
print("DB:", path)

conn = sqlite3.connect(path)
cur = conn.cursor()

cur.execute("""
  SELECT name, sql
  FROM sqlite_master
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
""")
rows = cur.fetchall()

print("Tables:", [r[0] for r in rows])
print("\n--- SCHEMA ---")
for name, sql in rows:
    print(f"\n{name}:\n{sql}")

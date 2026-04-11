import sqlite3
import pandas as pd

conn = sqlite3.connect("students.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS students (
    name TEXT,
    roll TEXT,
    semester INTEGER,
    subject TEXT,
    marks INTEGER
)
""")

conn.commit()

def insert_data(df):
    df.to_sql("students", conn, if_exists="replace", index=False)

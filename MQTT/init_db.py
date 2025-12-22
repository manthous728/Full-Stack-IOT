import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2 import sql
from config import DB_DEFAULT, IOT_DB, TABLES


try:
    conn = psycopg2.connect(**DB_DEFAULT)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    cur.execute(
        sql.SQL("CREATE DATABASE {}").format(sql.Identifier(IOT_DB))
    )

    print(f"Database '{IOT_DB}' berhasil dibuat.")

    cur.close()
    conn.close()

except psycopg2.errors.DuplicateDatabase:
    print(f"Database '{IOT_DB}' sudah ada.")
except Exception as e:
    print("Error saat bikin database:", e)


DB_IOT = {
    "host": "localhost",
    "port": 5432,
    "dbname": IOT_DB,
    "user": "postgres",
    "password": "postgres"
}

try:
    conn = psycopg2.connect(**DB_IOT)
    cur = conn.cursor()

    for table_name, table_sql in TABLES.items():
        cur.execute(table_sql)
        print(f"Tabel '{table_name}' berhasil dibuat.")

    conn.commit()
    cur.close()
    conn.close()

except Exception as e:
    print("Error saat bikin tabel:", e)

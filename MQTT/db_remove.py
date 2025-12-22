import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2 import sql
from config import IOT_DB

db_name = IOT_DB

try:
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="postgres",
        host="localhost",
        port="5432"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    cur.execute("""
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = %s AND pid <> pg_backend_pid();
    """, (db_name,))

    cur.execute(
        sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(db_name))
    )

    print(f"Database {db_name} berhasil dihapus.")

except psycopg2.Error as e:
    print(f"Gagal menghapus database {db_name}: {e}")

finally:
    if 'cur' in locals():
        cur.close()
    if 'conn' in locals():
        conn.close()

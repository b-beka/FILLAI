import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
database_url = os.getenv("DATABASE_URL")
print(f"Попытка подключения к: {database_url}")

try:
    conn = psycopg2.connect(database_url)
    print("✅ Подключение успешно!")
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print(f"Версия PostgreSQL: {cur.fetchone()[0]}")
    conn.close()
except psycopg2.OperationalError as e:
    print(f"❌ Ошибка подключения: {e}")
    print("\nВозможные причины:")
    print("1. PostgreSQL не запущен")
    print("2. Неправильный порт (ожидается 2006)")
    print("3. Неправильный пароль")
    print("4. База данных fillai_db не существует")
except Exception as e:
    print(f"❌ Неожиданная ошибка: {e}")
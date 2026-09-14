import psycopg2

passwords = [
    "postgres", "admin", "root", "password", "123456", "1234", "12345",
    "ayush", "ayush123", "ayush2026", "ayush@123", "Ayush@123", "Ayush123",
    "Postgres", "Postgres@123", "Postgres123", "Admin@123", "Admin123",
    "root@123", "root123", "civanta", "civanta123", "Civanta@123", "Civanta123",
    "postgres123", "password123", "12345678", "123456789", "ayushshaury"
]

found = False
for p in passwords:
    try:
        conn = psycopg2.connect(
            host="127.0.0.1",
            port=5432,
            user="postgres",
            password=p,
            dbname="postgres",
            connect_timeout=1
        )
        print(f"SUCCESS! Password is: '{p}'")
        conn.close()
        found = True
        break
    except Exception as e:
        pass

if not found:
    print("None of the common user passwords matched.")

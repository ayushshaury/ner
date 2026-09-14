import psycopg2

try:
    print("Attempting connection to PostgreSQL at 127.0.0.1:5432...")
    conn = psycopg2.connect(
        host="127.0.0.1",
        port=5432,
        user="postgres",
        password="postgres",
        dbname="postgres",
        connect_timeout=3
    )
    print("Connected with password 'postgres'!")
except Exception as e1:
    print("Connection with password failed, trying trust (no password)...")
    try:
        conn = psycopg2.connect(
            host="127.0.0.1",
            port=5432,
            user="postgres",
            dbname="postgres",
            connect_timeout=3
        )
        print("Connected without password (TRUST MODE)!")
    except Exception as e2:
        print("Trust connection error:", e2)
        conn = None

if conn:
    cur = conn.cursor()
    print("Setting postgres user password to 'postgres'...")
    cur.execute("ALTER USER postgres WITH PASSWORD 'postgres';")
    conn.commit()

    conn.autocommit = True
    cur.execute("SELECT 1 FROM pg_database WHERE datname='civanta'")
    if not cur.fetchone():
        print("Creating database 'civanta'...")
        cur.execute("CREATE DATABASE civanta;")
        print("Database 'civanta' created successfully!")
    else:
        print("Database 'civanta' already exists!")

    # Connect to civanta db and ensure postgis extension is created
    conn_civ = psycopg2.connect(
        host="127.0.0.1",
        port=5432,
        user="postgres",
        password="postgres",
        dbname="civanta"
    )
    cur_civ = conn_civ.cursor()
    print("Enabling PostGIS extension on 'civanta' database...")
    cur_civ.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    conn_civ.commit()
    print("PostGIS extension enabled successfully!")

    conn_civ.close()
    conn.close()

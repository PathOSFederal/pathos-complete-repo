# Postgres Local Development (Flagged)

This project defaults to SQLite. Postgres is available behind `DB_DIALECT=postgres`.

## 1) Start Postgres via Docker Compose (bind to 10.0.0.5)

Create a compose file:

```yaml
# /tmp/pathos-postgres.yml
services:
  postgres:
    image: postgres:16
    container_name: pathos-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: pathos
      POSTGRES_USER: pathos
      POSTGRES_PASSWORD: pathos
    ports:
      - "10.0.0.5:5432:5432"
    volumes:
      - pathos_pgdata:/var/lib/postgresql/data

volumes:
  pathos_pgdata:
```

Run it:

```bash
docker compose -f /tmp/pathos-postgres.yml up -d
```

## 2) UFW allowlist rule (allow from 10.0.0.245)

```bash
sudo ufw allow from 10.0.0.245 to any port 5432 proto tcp
```

## 3) WSL environment variables

```bash
export DB_DIALECT=postgres
export DATABASE_URL="postgresql://pathos:pathos@10.0.0.5:5432/pathos"
```

## 4) Run migrations

```bash
poetry run python -c "from app.db.migrations.runner import run_migrations; from pathlib import Path; run_migrations(Path('data/pathos.db'))"
```

Note: In Postgres mode the runner uses `DATABASE_URL`; the `Path(...)` argument is ignored.

## 5) Start the API

```bash
poetry run uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000
```

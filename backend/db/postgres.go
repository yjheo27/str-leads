package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

const migration = `
CREATE TABLE IF NOT EXISTS leads (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name        TEXT,
	phone       TEXT,
	email       TEXT,
	address     TEXT,
	strategy    TEXT NOT NULL DEFAULT 'Unassigned',
	status      TEXT NOT NULL DEFAULT 'New',
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;`

func Connect() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return fmt.Errorf("DATABASE_URL not set")
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("failed to ping: %w", err)
	}
	if _, err := pool.Exec(context.Background(), migration); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}
	Pool = pool
	return nil
}

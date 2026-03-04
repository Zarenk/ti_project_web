-- Enable the unaccent extension for accent-insensitive text search.
-- This is a built-in PostgreSQL extension (no external install needed).
-- It allows queries like: WHERE unaccent(name) ILIKE unaccent('%search%')
CREATE EXTENSION IF NOT EXISTS unaccent;

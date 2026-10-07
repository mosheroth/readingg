-- Created automatically on the first API call. This file documents the Vercel Postgres shape.

CREATE TABLE IF NOT EXISTS books (
  simania_book_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  translator TEXT,
  publisher TEXT,
  published_year INTEGER,
  pages INTEGER,
  category TEXT,
  subcategory TEXT,
  cover_url TEXT,
  url TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  simania_review_id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(simania_book_id),
  reviewer TEXT,
  reviewer_id INTEGER,
  rating NUMERIC,
  body TEXT NOT NULL,
  written_at TIMESTAMPTZ,
  likes INTEGER,
  url TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_written_at_idx ON reviews (written_at DESC);
CREATE INDEX IF NOT EXISTS reviews_book_idx ON reviews (book_id);

CREATE TABLE IF NOT EXISTS crawl_state (
  key TEXT PRIMARY KEY,
  cursor_id INTEGER,
  done BOOLEAN NOT NULL DEFAULT false,
  locked_until TIMESTAMPTZ,
  oldest_seen TIMESTAMPTZ,
  reviews_seen INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

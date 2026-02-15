-- Add banned column to users table
ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0;

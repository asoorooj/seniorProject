SELECT * FROM evaluations;

-- Add new user columns to an existing users table (PostgreSQL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(256);
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_chat BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_image BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_audio BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP NULL;

-- Optional indexes/constraints to align with your SQLAlchemy model
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_external_id ON users (external_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users (email);

-- Fill required non-nullable fields with temporary values for user id = 1
UPDATE users
SET
    external_id = COALESCE(external_id, 'temp_external_1'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    email = COALESCE(email, 'temp_user1@example.com'),
    password_hash = COALESCE(password_hash, 'temp_password_hash_change_me'),
    consent_chat = COALESCE(consent_chat, FALSE),
    consent_image = COALESCE(consent_image, FALSE),
    consent_audio = COALESCE(consent_audio, FALSE)
WHERE id = 1;

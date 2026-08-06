ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_mode_check;

ALTER TABLE users
  ADD CONSTRAINT users_auth_mode_check
  CHECK (auth_mode IN ('neon-auth', 'local-profile', 'local-credential', 'hosted'));

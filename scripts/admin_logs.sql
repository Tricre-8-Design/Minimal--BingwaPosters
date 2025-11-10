-- Creates audit log table for admin actions.
-- Columns: id (bigint PK), admin_id (uuid or int, depending on admins.id), action text, ip text, timestamp timestamptz

-- Adjust admin_id type to match your admins.id type (uuid or bigint). Here we assume uuid.
CREATE TABLE IF NOT EXISTS admin_logs (
  id bigserial PRIMARY KEY,
  admin_id uuid NULL,
  action text NOT NULL,
  ip text NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
-- Restrict access by default; allow only service role to write. Configure policies as needed.
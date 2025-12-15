-- Add 'cancelled' to activity_status enum
ALTER TYPE activity_status ADD VALUE IF NOT EXISTS 'cancelled';
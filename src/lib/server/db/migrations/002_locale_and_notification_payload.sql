ALTER TABLE users ADD COLUMN locale TEXT CHECK (locale IN ('en', 'ar'));

ALTER TABLE notifications ADD COLUMN payload TEXT;

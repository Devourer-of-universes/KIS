-- Moderation: message reports and user warnings

CREATE TABLE IF NOT EXISTS message_reports (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, reviewed, resolved, dismissed
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reports_message ON message_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_chat ON message_reports(chat_id);

CREATE TABLE IF NOT EXISTS user_warnings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    moderator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    report_id INTEGER REFERENCES message_reports(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON user_warnings(user_id, created_at DESC);

-- Moderation tables may be created by a superuser while the app connects as messenger_user.
-- Ensure the application role can use SERIAL sequences and read/write moderation tables.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'message_reports_id_seq') THEN
        GRANT USAGE, SELECT ON SEQUENCE public.message_reports_id_seq TO messenger_user;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'user_warnings_id_seq') THEN
        GRANT USAGE, SELECT ON SEQUENCE public.user_warnings_id_seq TO messenger_user;
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_reports TO messenger_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_warnings TO messenger_user;

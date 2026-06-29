-- ============================================================
-- LETVC ILO — Chat System Schema
-- Run this in Supabase SQL Editor AFTER the main schema
-- ============================================================

-- ─── CHAT CONVERSATIONS ─────────────────────────────────────
-- One conversation per student-trainer pair
CREATE TABLE IF NOT EXISTS chat_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  trainer_id  UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, trainer_id)   -- only one conversation per pair
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_student ON chat_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_trainer ON chat_conversations(trainer_id);

-- ─── CHAT MESSAGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role       TEXT NOT NULL CHECK (sender_role IN ('student', 'trainer')),
  message           TEXT NOT NULL CHECK (char_length(message) > 0),
  is_read           BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender       ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created      ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread       ON chat_messages(conversation_id, is_read);

-- ─── AUTO-UPDATE conversation.updated_at ON NEW MESSAGE ──────
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;

-- Allow all access via service role key (your backend uses this)
CREATE POLICY "Service role full access - chat_conversations"
  ON chat_conversations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - chat_messages"
  ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- ─── ENABLE REALTIME ─────────────────────────────────────────
-- Run this to enable realtime on chat_messages:
-- In Supabase dashboard go to:
--   Database → Replication → Tables → enable chat_messages
-- OR run:
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;

-- ─── ENABLE REALTIME FOR ASSESSMENTS ─────────────────────────
-- This allows the student's My Assessment page to update
-- automatically the moment a trainer marks them as assessed.
ALTER PUBLICATION supabase_realtime ADD TABLE assessments;

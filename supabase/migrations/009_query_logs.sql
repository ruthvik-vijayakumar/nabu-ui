-- 009_query_logs.sql
-- Per-scribe query logs (auditing/analytics of AI interactions)

CREATE TABLE IF NOT EXISTS query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scribe_id UUID NOT NULL REFERENCES scribe(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  response_text TEXT,
  model VARCHAR(100) DEFAULT 'gpt-4',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_query_log_scribe_id ON query_log(scribe_id);
CREATE INDEX IF NOT EXISTS idx_query_log_user_id ON query_log(user_id);
CREATE INDEX IF NOT EXISTS idx_query_log_created_at ON query_log(created_at DESC);

-- RLS
ALTER TABLE query_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'query_log' AND policyname = 'Query log: select own'
  ) THEN
    CREATE POLICY "Query log: select own" ON query_log FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'query_log' AND policyname = 'Query log: insert own'
  ) THEN
    CREATE POLICY "Query log: insert own" ON query_log FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;



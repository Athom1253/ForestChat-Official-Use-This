
CREATE TABLE IF NOT EXISTS call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  call_type text NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice','video','screen')),
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','accepted','declined','ended','missed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_call_signals_callee ON call_signals(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_caller ON call_signals(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_status ON call_signals(status);
CREATE INDEX IF NOT EXISTS idx_call_signals_created ON call_signals(created_at DESC);

ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_call_signals" ON call_signals FOR SELECT
  TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "insert_own_call_signals" ON call_signals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "update_own_call_signals" ON call_signals FOR UPDATE
  TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "delete_own_call_signals" ON call_signals FOR DELETE
  TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

ALTER TABLE call_signals REPLICA IDENTITY FULL;

/*
# Add INSTEAD OF UPDATE trigger to message_reads view

The message_reads view only had an INSTEAD OF INSERT trigger.
Without an UPDATE trigger, updating read receipts fails silently.
*/

CREATE OR REPLACE FUNCTION message_reads_update_fn()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE read_receipts
  SET last_read_message_id = NEW.last_read_message_id,
      last_read_at = NEW.last_read_at
  WHERE chat_id = NEW.channel_id AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS message_reads_instead_update ON message_reads;
CREATE TRIGGER message_reads_instead_update
  INSTEAD OF UPDATE ON message_reads
  FOR EACH ROW EXECUTE FUNCTION message_reads_update_fn();

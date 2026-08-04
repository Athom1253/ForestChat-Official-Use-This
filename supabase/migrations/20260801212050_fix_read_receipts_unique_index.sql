/*
# Fix read_receipts unique index

Add unique index on (chat_id, user_id) in read_receipts table 
so upserts with onConflict work from the frontend.
*/

CREATE UNIQUE INDEX IF NOT EXISTS read_receipts_chat_user_unique 
ON read_receipts (chat_id, user_id);

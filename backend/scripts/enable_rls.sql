-- Enable Row Level Security (RLS) on the tables

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create Policies for `users`
-- Users can only read and update their own record
CREATE POLICY "Users can read own record" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (id = auth.uid());


-- Create Policies for `notes`
-- Users can read, insert, update, delete only their own notes

CREATE POLICY "Users can read own notes" ON notes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notes" ON notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (user_id = auth.uid());

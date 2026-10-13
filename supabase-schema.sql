-- ====================================================================
-- MarksBoard: Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ====================================================================

-- 1. Create the student_profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  usn TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  college TEXT DEFAULT 'Dayananda Sagar University',
  branch TEXT DEFAULT 'Computer Science and Engineering',
  avatar TEXT DEFAULT '👨‍💻',
  bio TEXT DEFAULT 'Engineering Student 🚀',
  target_cgpa NUMERIC DEFAULT 9.0,
  current_semester INTEGER DEFAULT 5,
  semesters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Allow anonymous public operations via Supabase anon key
DROP POLICY IF EXISTS "Allow public read of student profiles" ON student_profiles;
CREATE POLICY "Allow public read of student profiles" 
  ON student_profiles 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow public insert of student profiles" ON student_profiles;
CREATE POLICY "Allow public insert of student profiles" 
  ON student_profiles 
  FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update of student profiles" ON student_profiles;
CREATE POLICY "Allow public update of student profiles" 
  ON student_profiles 
  FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Allow public delete of student profiles" ON student_profiles;
CREATE POLICY "Allow public delete of student profiles" 
  ON student_profiles 
  FOR DELETE 
  USING (true);

-- 4. Enable Realtime updates (Optional, for instant live sync)
ALTER PUBLICATION supabase_realtime ADD TABLE student_profiles;

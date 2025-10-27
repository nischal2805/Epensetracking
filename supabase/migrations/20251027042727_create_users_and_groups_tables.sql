/*
  # Smart Expense Sharing System - Users and Groups Schema
  
  ## Overview
  This migration creates the foundational tables for user management and group collaboration
  in an India-centric expense sharing application.
  
  ## New Tables
  
  ### 1. users
  Stores user profile information synced with Supabase Auth
  - `id` (uuid, primary key): Unique user identifier matching auth.users
  - `email` (varchar): User's email address (unique)
  - `name` (varchar): User's display name
  - `created_at` (timestamp): Account creation timestamp
  
  ### 2. groups
  Stores expense sharing groups (e.g., "Goa Trip", "Roommates", "Office Lunch")
  - `id` (uuid, primary key): Unique group identifier
  - `name` (varchar): Group display name
  - `created_by` (uuid, foreign key): User who created the group
  - `created_at` (timestamp): Group creation timestamp
  
  ### 3. group_members
  Junction table managing many-to-many relationship between users and groups
  - `group_id` (uuid, foreign key): Reference to groups table
  - `user_id` (uuid, foreign key): Reference to users table
  - `joined_at` (timestamp): When user joined the group
  - Composite primary key on (group_id, user_id)
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only view and manage their own data
  - Group members can view group information and other members
  - Only group creators can modify group settings
  
  ## Important Notes
  - All timestamps use Indian Standard Time (IST) calculations can be done at app level
  - Currency will be stored in paisa (smallest unit) for precision
  - CASCADE deletes ensure data integrity when groups/users are removed
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create group_members junction table
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for groups table
CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups"
  ON groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for group_members table
CREATE POLICY "Group members can view other members"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can add members"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can remove members"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

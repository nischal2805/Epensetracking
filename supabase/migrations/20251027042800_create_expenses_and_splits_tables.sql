/*
  # Smart Expense Sharing System - Expenses and Splits Schema
  
  ## Overview
  This migration creates tables for tracking expenses and their splits among group members.
  All amounts are stored in paisa (smallest Indian currency unit) for precision.
  
  ## New Tables
  
  ### 1. expenses
  Stores individual expense records with Indian context
  - `id` (uuid, primary key): Unique expense identifier
  - `group_id` (uuid, foreign key): Reference to groups table
  - `description` (varchar): Expense description (e.g., "Dinner at Swiggy")
  - `amount` (decimal): Total amount in Rupees (₹) with paisa precision (e.g., 450.50)
  - `category` (varchar): Expense category (Food, Travel, Entertainment, Shopping, Bills)
  - `date` (date): Expense date (defaults to current date)
  - `paid_by` (uuid, foreign key): User who paid for the expense
  - `receipt_url` (text): URL to receipt image in Firebase Storage (nullable)
  - `input_method` (varchar): How expense was entered ('manual', 'nlp', 'receipt')
  - `created_at` (timestamp): Record creation timestamp
  
  ### 2. expense_splits
  Stores how an expense is split among group members
  - `id` (uuid, primary key): Unique split record identifier
  - `expense_id` (uuid, foreign key): Reference to expenses table
  - `user_id` (uuid, foreign key): User responsible for this split
  - `share_amount` (decimal): Amount this user owes in Rupees (₹)
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Group members can view expenses in their groups
  - Only expense creator can modify/delete their expenses
  - Splits are automatically accessible based on expense visibility
  
  ## Data Integrity
  - CASCADE deletes ensure splits are removed when expense is deleted
  - Foreign key constraints maintain referential integrity
  - Decimal precision set to (10,2) for rupees and paisa
  
  ## Important Notes
  - Category values: 'Food', 'Entertainment', 'Travel', 'Shopping', 'Bills', 'Other'
  - Input method values: 'manual', 'nlp', 'receipt'
  - Split amounts should sum to total expense amount (validated at app level)
*/

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category VARCHAR(50) NOT NULL DEFAULT 'Other',
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  paid_by UUID REFERENCES users(id) NOT NULL,
  receipt_url TEXT,
  input_method VARCHAR(20) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create expense_splits table
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  share_amount DECIMAL(10,2) NOT NULL CHECK (share_amount >= 0)
);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses table
CREATE POLICY "Group members can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
    AND paid_by = auth.uid()
  );

CREATE POLICY "Expense payer can update their expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = paid_by)
  WITH CHECK (auth.uid() = paid_by);

CREATE POLICY "Expense payer can delete their expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = paid_by);

-- RLS Policies for expense_splits table
CREATE POLICY "Group members can view splits"
  ON expense_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN group_members gm ON gm.group_id = e.group_id
      WHERE e.id = expense_splits.expense_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Expense payer can create splits"
  ON expense_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_splits.expense_id
      AND expenses.paid_by = auth.uid()
    )
  );

CREATE POLICY "Expense payer can delete splits"
  ON expense_splits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_splits.expense_id
      AND expenses.paid_by = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);

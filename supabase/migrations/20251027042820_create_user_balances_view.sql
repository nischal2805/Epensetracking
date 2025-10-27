/*
  # Smart Expense Sharing System - User Balances View
  
  ## Overview
  This migration creates a materialized view for calculating balances between users.
  The view simplifies complex balance calculations needed for "You owe" and "Owes you" displays.
  
  ## New View
  
  ### user_balances
  Calculates net amounts owed between users within groups
  - `group_id` (uuid): The group context for the balance
  - `from_user` (uuid): User who paid the expense
  - `to_user` (uuid): User who owes money
  - `owes` (decimal): Total amount owed in Rupees (₹)
  
  ## Logic
  The view aggregates all expense splits where:
  - Someone paid for an expense (from_user)
  - Another person has a share in that expense (to_user)
  - Excludes cases where payer and splitter are the same person
  
  ## Usage Examples
  1. Find who owes current user:
     SELECT * FROM user_balances WHERE from_user = auth.uid()
  
  2. Find who current user owes:
     SELECT * FROM user_balances WHERE to_user = auth.uid()
  
  3. Calculate net balance between two users:
     Net = (A owes B) - (B owes A)
  
  ## Important Notes
  - Balances are calculated in real-time based on expense_splits
  - App layer will implement debt simplification algorithm
  - All amounts in Indian Rupees with paisa precision
  - View automatically updates when expenses/splits change
*/

-- Create user_balances view
CREATE OR REPLACE VIEW user_balances AS
SELECT 
  e.group_id,
  e.paid_by as from_user,
  es.user_id as to_user,
  SUM(es.share_amount) as owes
FROM expenses e
JOIN expense_splits es ON e.id = es.expense_id
WHERE e.paid_by != es.user_id
GROUP BY e.group_id, e.paid_by, es.user_id;

-- Grant access to authenticated users
GRANT SELECT ON user_balances TO authenticated;

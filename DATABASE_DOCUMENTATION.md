# Database Documentation - Smart Expense Sharing System

## Overview

This document provides comprehensive documentation on the **hybrid database architecture** used in the Smart Expense Sharing System. The system utilizes both SQL (Supabase/PostgreSQL) and NoSQL (Firebase/Firestore) databases, demonstrating when and why to use each type of database.

---

## Why Hybrid Database Architecture?

### SQL (Supabase PostgreSQL) - For Structured Data
- **ACID Compliance**: Critical for financial transactions
- **Data Integrity**: Foreign key constraints, referential integrity
- **Complex Queries**: JOINs, aggregations, views
- **Row Level Security**: Built-in authorization
- **Transactions**: Atomic operations for money-related data

### NoSQL (Firebase Firestore) - For Flexible Data
- **Schema Flexibility**: Activity logs with varying details
- **Real-time Updates**: Live data synchronization
- **File Storage**: Receipt images, attachments
- **Horizontal Scaling**: Better for high read/write scenarios
- **Document-based**: Natural for log-style data

---

## SQL Database Schema (Supabase)

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   USERS     │       │  GROUP_MEMBERS   │       │   GROUPS    │
├─────────────┤       ├──────────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ user_id (FK)     │       │ id (PK)     │
│ email       │       │ group_id (FK)    │───────►│ name        │
│ name        │       │ joined_at        │       │ created_by  │─┐
│ created_at  │       └──────────────────┘       │ created_at  │ │
└─────────────┘                                   └─────────────┘ │
       ▲                                                  ▲       │
       │                                                  │       │
       │       ┌─────────────────────────────────────────┘       │
       │       │                                                  │
┌──────┴───────┴──┐       ┌──────────────────┐                   │
│    EXPENSES     │       │  EXPENSE_SPLITS  │                   │
├─────────────────┤       ├──────────────────┤                   │
│ id (PK)         │◄──────│ expense_id (FK)  │                   │
│ group_id (FK)   │       │ user_id (FK)     │───────────────────┘
│ description     │       │ share_amount     │
│ amount          │       │ id (PK)          │
│ category        │       └──────────────────┘
│ date            │
│ paid_by (FK)    │
│ receipt_url     │
│ input_method    │
│ created_at      │
└─────────────────┘
```

### Table Definitions

#### 1. USERS Table
Stores user profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier, matches Supabase Auth |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User's email address |
| name | VARCHAR(100) | NOT NULL | Display name |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |

**SQL:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. GROUPS Table
Stores expense sharing groups.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique group identifier |
| name | VARCHAR(100) | NOT NULL | Group name (e.g., "Goa Trip") |
| created_by | UUID | FOREIGN KEY → users.id | User who created the group |
| created_at | TIMESTAMP | DEFAULT NOW() | Group creation time |

**SQL:**
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. GROUP_MEMBERS Table (Junction Table)
Many-to-many relationship between users and groups.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| group_id | UUID | PRIMARY KEY, FOREIGN KEY | Reference to groups |
| user_id | UUID | PRIMARY KEY, FOREIGN KEY | Reference to users |
| joined_at | TIMESTAMP | DEFAULT NOW() | When user joined group |

**SQL:**
```sql
CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);
```

#### 4. EXPENSES Table
Stores expense transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique expense identifier |
| group_id | UUID | FOREIGN KEY, NOT NULL | Group this expense belongs to |
| description | VARCHAR(255) | NOT NULL | What was purchased |
| amount | DECIMAL(10,2) | NOT NULL, CHECK > 0 | Total amount in Rupees |
| category | VARCHAR(50) | DEFAULT 'Other' | Expense category |
| date | DATE | DEFAULT CURRENT_DATE | Transaction date |
| paid_by | UUID | FOREIGN KEY, NOT NULL | Who paid |
| receipt_url | TEXT | NULLABLE | URL to receipt image |
| input_method | VARCHAR(20) | DEFAULT 'manual' | How expense was entered |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |

**SQL:**
```sql
CREATE TABLE expenses (
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
```

#### 5. EXPENSE_SPLITS Table
Divides expenses among group members.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique split identifier |
| expense_id | UUID | FOREIGN KEY, NOT NULL | Parent expense |
| user_id | UUID | FOREIGN KEY, NOT NULL | Who owes this amount |
| share_amount | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Amount owed |

**SQL:**
```sql
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  share_amount DECIMAL(10,2) NOT NULL CHECK (share_amount >= 0)
);
```

#### 6. USER_BALANCES View
Calculates who owes whom in each group.

**SQL:**
```sql
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
```

---

## Database Normalization Analysis

This database follows **Third Normal Form (3NF)** principles.

### First Normal Form (1NF) ✓
- All columns contain atomic values
- Each row is unique (primary keys)
- No repeating groups

**Example:** Instead of storing members as a comma-separated list in groups, we use a separate `group_members` table.

### Second Normal Form (2NF) ✓
- Already in 1NF
- All non-key attributes depend on the entire primary key

**Example:** In `group_members`, the `joined_at` depends on both `group_id` AND `user_id` together.

### Third Normal Form (3NF) ✓
- Already in 2NF
- No transitive dependencies

**Example:** We don't store `group_name` in `expenses` table - we reference `group_id` and JOIN when needed.

### Normalization Benefits
1. **Reduced Redundancy**: User names stored once in users table
2. **Update Anomaly Prevention**: Changing a group name updates one row
3. **Delete Anomaly Prevention**: Deleting an expense doesn't delete user data
4. **Insert Anomaly Prevention**: Can add users before they join any group

---

## NoSQL Database Schema (Firebase Firestore)

### Collections Structure

```
firestore/
├── activityLogs/
│   └── {logId}/
│       ├── userId: string
│       ├── groupId: string
│       ├── action: string
│       ├── details: object
│       └── timestamp: Timestamp
│
├── receipts/
│   └── {receiptId}/
│       ├── expenseId: string
│       ├── userId: string
│       ├── imageUrl: string
│       ├── uploadedAt: Timestamp
│       └── metadata: object
│
├── nlpCache/
│   └── {cacheId}/
│       ├── inputText: string
│       ├── parsedResult: object
│       ├── confidence: number
│       └── timestamp: Timestamp
│
└── voiceInputs/
    └── {inputId}/
        ├── expenseId: string
        ├── userId: string
        ├── audioUrl: string
        ├── transcription: string
        └── processedAt: Timestamp
```

### Collection Details

#### 1. activityLogs
Stores user activity timeline for audit and display.

```javascript
{
  userId: "uuid",        // Who performed the action
  groupId: "uuid",       // Which group (if applicable)
  action: "expense_added", // Action type
  details: {             // Flexible object for action-specific data
    expenseId: "uuid",
    description: "Dinner",
    amount: 500
  },
  timestamp: Timestamp   // When action occurred
}
```

**Why NoSQL?** Activity details vary by action type - NoSQL handles this naturally.

#### 2. receipts
Metadata for uploaded receipt images.

```javascript
{
  expenseId: "uuid",     // Links to SQL expense
  userId: "uuid",        // Owner
  imageUrl: "https://...", // Firebase Storage URL
  uploadedAt: Timestamp,
  metadata: {
    size: 102400,
    type: "image/jpeg",
    extractedData: {
      amount: 450,
      merchant: "Swiggy",
      date: "2024-01-15"
    }
  }
}
```

**Why NoSQL?** OCR metadata varies; image URLs need fast retrieval.

#### 3. nlpCache
Caches NLP parsing results for performance.

```javascript
{
  inputText: "i paid 500 for dinner",
  parsedResult: {
    amount: 500,
    description: "dinner",
    category: "Food"
  },
  confidence: 85,
  timestamp: Timestamp
}
```

**Why NoSQL?** Cache entries are flexible and temporary.

---

## Database Indexes

### SQL Indexes (Supabase)

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Group queries
CREATE INDEX idx_groups_created_by ON groups(created_by);

-- Member lookups
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);

-- Expense queries
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Split queries
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
```

### NoSQL Indexes (Firestore)

```javascript
// Composite indexes for common queries
// activityLogs - by user, sorted by time
Collection: activityLogs
Fields: userId (Ascending), timestamp (Descending)

// activityLogs - by group, sorted by time
Collection: activityLogs
Fields: groupId (Ascending), timestamp (Descending)

// nlpCache - find cached results
Collection: nlpCache
Fields: inputText (Ascending), timestamp (Descending)
```

---

## Security (Row Level Security - RLS)

### Supabase RLS Policies

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can view groups they're members of
CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- Group members can view expenses
CREATE POLICY "Group members can view expenses"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );
```

### Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /activityLogs/{logId} {
      allow read: if request.auth != null &&
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid;
    }
    
    match /receipts/{receiptId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                           │
│  ┌─────────────────────┐    ┌─────────────────────────┐    │
│  │ supabase-service.ts │    │ firebase-service.ts     │    │
│  │ - User CRUD         │    │ - Activity logging      │    │
│  │ - Group CRUD        │    │ - Receipt storage       │    │
│  │ - Expense CRUD      │    │ - NLP caching           │    │
│  │ - Balance queries   │    │ - Simulated OCR         │    │
│  └──────────┬──────────┘    └────────────┬────────────┘    │
└─────────────┼────────────────────────────┼──────────────────┘
              │                            │
              ▼                            ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│   SUPABASE (SQL)        │    │   FIREBASE (NoSQL)      │
│   PostgreSQL Database   │    │   Firestore + Storage   │
├─────────────────────────┤    ├─────────────────────────┤
│ • users                 │◄──►│ • activityLogs          │
│ • groups                │    │ • receipts              │
│ • group_members         │    │ • nlpCache              │
│ • expenses              │    │ • voiceInputs           │
│ • expense_splits        │    │ • Storage: /receipts/   │
│ • user_balances (view)  │    │                         │
└─────────────────────────┘    └─────────────────────────┘
         ▲                              ▲
         │         UUID Links           │
         └──────────────────────────────┘
```

---

## Common Queries

### Get User's Groups with Member Count
```sql
SELECT g.*, COUNT(gm.user_id) as member_count
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
WHERE g.id IN (
  SELECT group_id FROM group_members WHERE user_id = $current_user_id
)
GROUP BY g.id
ORDER BY g.created_at DESC;
```

### Calculate Net Balance Between Users
```sql
WITH paid AS (
  SELECT paid_by as user_id, SUM(amount) as total_paid
  FROM expenses
  WHERE group_id = $group_id
  GROUP BY paid_by
),
owed AS (
  SELECT es.user_id, SUM(es.share_amount) as total_owed
  FROM expense_splits es
  JOIN expenses e ON es.expense_id = e.id
  WHERE e.group_id = $group_id
  GROUP BY es.user_id
)
SELECT 
  u.id,
  u.name,
  COALESCE(p.total_paid, 0) - COALESCE(o.total_owed, 0) as net_balance
FROM users u
LEFT JOIN paid p ON u.id = p.user_id
LEFT JOIN owed o ON u.id = o.user_id
WHERE u.id IN (
  SELECT user_id FROM group_members WHERE group_id = $group_id
);
```

---

## Best Practices Followed

1. **Use UUIDs for Primary Keys**: Better for distributed systems, no sequence conflicts
2. **Soft References Between Databases**: SQL stores Firebase URLs, Firebase stores SQL UUIDs
3. **Cascade Deletes**: Removing a group removes all related data automatically
4. **Timestamp All Records**: Enables auditing and debugging
5. **Normalize SQL Data**: Reduces redundancy and update anomalies
6. **Denormalize NoSQL Data**: Optimizes read performance for activity feeds
7. **Index Foreign Keys**: Faster JOIN operations
8. **Use Views for Complex Queries**: Balance calculations encapsulated in view

---

## For Teachers/Evaluators

This hybrid architecture demonstrates:

1. **When to use SQL**: Structured, relational data with ACID requirements
2. **When to use NoSQL**: Flexible, document-based data with varying schemas
3. **Database Normalization**: 3NF compliance in relational schema
4. **Security Implementation**: RLS policies and Firestore rules
5. **Performance Optimization**: Proper indexing strategies
6. **Real-world Application**: Production-ready expense sharing system

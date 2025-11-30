# Database Management System (DBMS) Documentation
## Expense Tracking Application

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Database Architecture](#2-database-architecture)
3. [Entity-Relationship Diagram](#3-entity-relationship-diagram)
4. [Database Schema](#4-database-schema)
5. [Normalization](#5-normalization)
6. [SQL vs NoSQL Comparison](#6-sql-vs-nosql-comparison)
7. [ACID Properties](#7-acid-properties)
8. [Indexing Strategy](#8-indexing-strategy)
9. [Security Implementation](#9-security-implementation)
10. [Query Examples](#10-query-examples)

---

## 1. Introduction

This expense tracking application demonstrates key DBMS concepts using **Firebase Firestore** as the database backend. While Firestore is a NoSQL document database, we apply relational database principles and normalization techniques to maintain data integrity.

### Technology Stack
- **Database**: Firebase Firestore (Document-oriented NoSQL)
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Cloud Storage (for receipts)
- **Frontend**: React with TypeScript

---

## 2. Database Architecture

### Why Firebase Firestore?

Firestore provides:
1. **Real-time synchronization** - Data updates instantly across all clients
2. **Offline support** - Works without internet connection
3. **Automatic scaling** - Handles growth without manual intervention
4. **Security rules** - Row-level security similar to PostgreSQL RLS

### Collections (equivalent to Tables)

```
├── users/                    # User profiles
├── groups/                   # Expense groups
│   └── {groupId}/members/    # Group membership (junction table)
├── expenses/                 # Expense records
│   └── {expenseId}/splits/   # Expense splits per user
├── activities/               # Activity logs
├── receipts/                 # Receipt metadata
└── nlp_cache/                # NLP parsing cache
```

---

## 3. Entity-Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   USERS     │       │  GROUP_MEMBERS  │       │   GROUPS    │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │───┐   │ group_id (FK)   │   ┌───│ id (PK)     │
│ email       │   └──>│ user_id (FK)    │<──┘   │ name        │
│ name        │       │ joined_at       │       │ created_by  │
│ created_at  │       │ role            │       │ created_at  │
└─────────────┘       └─────────────────┘       └─────────────┘
      │                                                │
      │                                                │
      ▼                                                ▼
┌─────────────────────────────────────────────────────────────┐
│                         EXPENSES                             │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ group_id (FK) ─────────────────────────────────────────────>│
│ description                                                  │
│ amount                                                       │
│ category                                                     │
│ date                                                         │
│ paid_by (FK) ──────────────────────────────────────────────>│
│ receipt_url                                                  │
│ input_method                                                 │
│ created_at                                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌─────────────────────┐
                  │   EXPENSE_SPLITS    │
                  ├─────────────────────┤
                  │ expense_id (FK, PK) │
                  │ user_id (FK, PK)    │
                  │ share_amount        │
                  │ is_settled          │
                  └─────────────────────┘
```

### Relationship Types

| Relationship | Type | Description |
|-------------|------|-------------|
| Users ↔ Groups | Many-to-Many | Via GROUP_MEMBERS junction table |
| Groups → Expenses | One-to-Many | A group has many expenses |
| Expenses → Splits | One-to-Many | An expense has many splits |
| Users → Splits | One-to-Many | A user can have many splits |
| Users → Expenses | One-to-Many | A user can pay for many expenses |

---

## 4. Database Schema

### Users Collection
```javascript
// Document ID: Firebase Auth UID (ensures uniqueness)
{
  email: "user@example.com",      // Unique, indexed
  name: "John Doe",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

**Constraints:**
- `id` (document ID): Primary Key
- `email`: Unique constraint (enforced via Auth)

### Groups Collection
```javascript
{
  name: "Roommates",
  created_by: "user_id_123",      // Foreign Key → Users
  created_at: Timestamp,
  updated_at: Timestamp
}
```

**Subcollection: members/**
```javascript
// Document ID: user_id (composite key with parent group_id)
{
  user_id: "user_id_123",
  joined_at: Timestamp,
  role: "admin" | "member"
}
```

### Expenses Collection
```javascript
{
  group_id: "group_id_123",       // Foreign Key → Groups
  description: "Groceries",
  amount: 1500.00,
  category: "Shopping",           // ENUM: Food, Travel, etc.
  date: "2024-01-15",
  paid_by: "user_id_123",         // Foreign Key → Users
  receipt_url: "https://...",
  input_method: "manual",         // ENUM: manual, nlp, receipt
  created_at: Timestamp
}
```

**Subcollection: splits/**
```javascript
// Document ID: user_id
{
  user_id: "user_id_456",
  share_amount: 750.00,
  is_settled: false
}
```

---

## 5. Normalization

### First Normal Form (1NF)
**Rule:** Each column contains atomic (indivisible) values; no repeating groups.

**Implementation:**
- ❌ Wrong: `splits: [{user: "A", amount: 100}, {user: "B", amount: 100}]`
- ✅ Correct: Separate `expense_splits` subcollection with one document per user

### Second Normal Form (2NF)
**Rule:** Must be in 1NF + all non-key attributes fully depend on the primary key.

**Implementation:**
- User details (name, email) are stored in `users` collection
- Expenses only reference `user_id`, not duplicated user data
- No partial dependencies

### Third Normal Form (3NF)
**Rule:** Must be in 2NF + no transitive dependencies.

**Implementation:**
- Group name is NOT stored in each expense
- We only store `group_id` and fetch group details when needed
- Category names are stored directly (acceptable as they're immutable)

### Boyce-Codd Normal Form (BCNF)
**Rule:** Every determinant must be a candidate key.

**Implementation:**
- `expense_splits`: Composite key (expense_id + user_id)
- `group_members`: Composite key (group_id + user_id)
- No non-key attributes determine other non-key attributes

---

## 6. SQL vs NoSQL Comparison

### When to Use SQL (Relational)

| Use Case | Why SQL? |
|----------|----------|
| Structured data with fixed schema | Schema enforcement, data validation |
| Complex relationships (JOINs) | Efficient query optimizer |
| ACID transactions | Financial data, inventory |
| Strong consistency requirements | Banking, e-commerce |

### When to Use NoSQL (Document)

| Use Case | Why NoSQL? |
|----------|------------|
| Flexible/evolving schema | Activity logs, user preferences |
| High write throughput | Logging, analytics, IoT |
| Horizontal scalability | Social media, gaming |
| Semi-structured data | JSON APIs, nested objects |

### Our Hybrid Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    FIRESTORE (NoSQL)                        │
├─────────────────────────────────────────────────────────────┤
│  SQL-like Patterns          │  NoSQL-native Patterns        │
│  ─────────────────          │  ────────────────────         │
│  • users (normalized)       │  • activities (denormalized)  │
│  • groups (normalized)      │  • receipts (blob metadata)   │
│  • expenses (normalized)    │  • nlp_cache (key-value)      │
│  • expense_splits           │                               │
│  • group_members            │                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. ACID Properties

### Atomicity
**Definition:** All operations in a transaction complete successfully, or none do.

**Implementation:**
```typescript
// Creating a group with creator as admin - ATOMIC
const groupId = await runTransaction(db, async (transaction) => {
  // Operation 1: Create group
  transaction.set(groupRef, groupData);
  
  // Operation 2: Add creator as member
  transaction.set(memberRef, memberData);
  
  // Both succeed or both fail
  return groupRef.id;
});
```

### Consistency
**Definition:** Database moves from one valid state to another.

**Implementation:**
- Firestore validates document structure
- Security rules enforce business logic
- Application-level validation before writes

### Isolation
**Definition:** Concurrent transactions don't interfere.

**Implementation:**
- Firestore transactions use optimistic locking
- If data changes during transaction, it retries
- Maximum 5 retries before failure

### Durability
**Definition:** Committed data survives system failures.

**Implementation:**
- Firestore replicates data across multiple data centers
- Data persists even if servers fail
- 99.999% durability guarantee

---

## 8. Indexing Strategy

### Automatic Indexes (Single-field)
Firestore automatically creates indexes for:
- Every field in a document
- Enables simple equality and range queries

### Composite Indexes (Multi-field)
Required for complex queries:

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "expenses",
      "fields": [
        { "fieldPath": "group_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Query using this index:**
```typescript
// Get expenses for a group, newest first
query(
  collection(db, 'expenses'),
  where('group_id', '==', 'group123'),
  orderBy('created_at', 'desc')
)
```

### Index Performance

| Query Type | Without Index | With Index |
|-----------|---------------|------------|
| Single field equality | O(1) | O(1) |
| Range query | O(n) | O(log n) |
| Composite query | Not possible | O(log n) |

---

## 9. Security Implementation

### Row-Level Security (RLS)

Similar to PostgreSQL RLS, we use Firestore Security Rules:

```javascript
// Users can only read/write their own data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Group members can read group data
match /groups/{groupId} {
  allow read: if isMember(groupId);
  allow write: if isGroupAdmin(groupId);
}
```

### Authentication Flow

```
┌─────────┐     ┌──────────────┐     ┌───────────────┐
│  User   │────>│ Firebase Auth│────>│ Auth Token    │
└─────────┘     └──────────────┘     │ (JWT)         │
                                      └───────┬───────┘
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │ Security Rules│
                                      │ Evaluation    │
                                      └───────┬───────┘
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │   Firestore   │
                                      │   Database    │
                                      └───────────────┘
```

---

## 10. Query Examples

### SQL Equivalent Queries

#### Get User by ID
```sql
-- SQL
SELECT * FROM users WHERE id = 'user123';

-- Firestore
const userRef = doc(db, 'users', 'user123');
const userSnap = await getDoc(userRef);
```

#### Get Group Expenses with JOIN
```sql
-- SQL
SELECT e.*, u.name as payer_name 
FROM expenses e
LEFT JOIN users u ON e.paid_by = u.id
WHERE e.group_id = 'group123'
ORDER BY e.created_at DESC;

-- Firestore (requires multiple queries)
const expensesQuery = query(
  collection(db, 'expenses'),
  where('group_id', '==', 'group123'),
  orderBy('created_at', 'desc')
);
const expenses = await getDocs(expensesQuery);

// Then fetch payer details for each
for (const expense of expenses) {
  const payer = await getDoc(doc(db, 'users', expense.paid_by));
}
```

#### Aggregate: Calculate Balances
```sql
-- SQL
SELECT 
  es.user_id as debtor,
  e.paid_by as creditor,
  SUM(es.share_amount) as total_owed
FROM expenses e
JOIN expense_splits es ON e.id = es.expense_id
WHERE e.group_id = 'group123' 
  AND es.user_id != e.paid_by
GROUP BY es.user_id, e.paid_by;

-- Firestore (calculated in application)
const expenses = await getGroupExpenses(groupId);
const balanceMap = new Map();

for (const expense of expenses) {
  for (const split of expense.splits) {
    if (split.user_id !== expense.paid_by) {
      // Aggregate in memory
      const key = `${split.user_id}:${expense.paid_by}`;
      balanceMap.set(key, (balanceMap.get(key) || 0) + split.share_amount);
    }
  }
}
```

---

## Summary

This expense tracking application demonstrates:

1. ✅ **Normalized database design** following 1NF, 2NF, 3NF, BCNF
2. ✅ **Entity-Relationship modeling** with proper cardinality
3. ✅ **ACID transactions** for data consistency
4. ✅ **Indexing strategies** for query optimization
5. ✅ **Security rules** for data protection
6. ✅ **SQL vs NoSQL** trade-offs and when to use each
7. ✅ **Referential integrity** through application logic
8. ✅ **Cascading deletes** for maintaining data consistency

---

*Documentation prepared for DBMS Project Presentation*

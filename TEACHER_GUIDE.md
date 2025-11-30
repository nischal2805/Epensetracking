# Teacher's Guide - Smart Expense Sharing System

## Project Overview for Academic Evaluation

This document provides guidance for teachers/evaluators on how to understand, evaluate, and grade the Smart Expense Sharing System project, which demonstrates a modern **hybrid database architecture** combining SQL and NoSQL databases.

---

## Table of Contents

1. [Project Summary](#project-summary)
2. [Learning Objectives Demonstrated](#learning-objectives-demonstrated)
3. [Database Concepts Covered](#database-concepts-covered)
4. [Evaluation Criteria](#evaluation-criteria)
5. [Demo Guide](#demo-guide)
6. [Viva Questions & Expected Answers](#viva-questions--expected-answers)
7. [Technical Setup](#technical-setup)
8. [Grading Rubric](#grading-rubric)

---

## Project Summary

### What is this project?

A **mobile-first expense sharing application** (similar to Splitwise) that allows users to:
- Create groups for sharing expenses
- Add expenses with multiple input methods (manual, NLP text, receipt scanning)
- Track who owes whom with automatic balance calculations
- View activity history

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + TypeScript | User interface |
| Styling | Tailwind CSS | Mobile-first responsive design |
| SQL Database | Supabase (PostgreSQL) | Structured financial data |
| NoSQL Database | Firebase (Firestore) | Activity logs, file storage |
| Authentication | Supabase Auth | User login/signup |
| File Storage | Firebase Storage | Receipt images |

### Key Statistics

- **Lines of Code**: ~2,800
- **React Components**: 15
- **SQL Tables**: 5 + 1 View
- **NoSQL Collections**: 4

---

## Learning Objectives Demonstrated

This project successfully demonstrates understanding of:

### 1. Database Design & Normalization
- ✅ Entity-Relationship modeling
- ✅ Third Normal Form (3NF) compliance
- ✅ Primary and Foreign key relationships
- ✅ Junction tables for many-to-many relationships
- ✅ Database views for complex calculations

### 2. SQL Concepts
- ✅ Table creation with constraints
- ✅ JOINs (INNER, LEFT)
- ✅ Aggregate functions (SUM, COUNT)
- ✅ GROUP BY and ORDER BY
- ✅ Views for encapsulating complex queries
- ✅ Indexes for performance optimization

### 3. NoSQL Concepts
- ✅ Document-based data modeling
- ✅ Collection structure design
- ✅ Flexible schema for varying data
- ✅ Real-time data capabilities
- ✅ Blob storage integration

### 4. Hybrid Database Architecture
- ✅ Understanding when to use SQL vs NoSQL
- ✅ Cross-database referencing using UUIDs
- ✅ Data synchronization strategies
- ✅ Trade-off analysis (consistency vs flexibility)

### 5. Security
- ✅ Row Level Security (RLS) policies
- ✅ Firebase Security Rules
- ✅ Authentication and authorization separation

---

## Database Concepts Covered

### SQL (Relational) Concepts

| Concept | Where Demonstrated |
|---------|-------------------|
| Primary Keys | All tables use UUID primary keys |
| Foreign Keys | expenses.paid_by → users.id |
| Composite Keys | group_members(group_id, user_id) |
| Referential Integrity | ON DELETE CASCADE |
| Check Constraints | amount > 0, share_amount >= 0 |
| Views | user_balances view |
| Indexes | All foreign keys indexed |
| Aggregation | SUM() for balance calculations |
| JOINs | Expense queries with payer info |

### NoSQL (Document) Concepts

| Concept | Where Demonstrated |
|---------|-------------------|
| Collections | activityLogs, receipts, nlpCache |
| Documents | Each activity log entry |
| Flexible Schema | Activity details vary by action |
| Nested Objects | metadata in receipts |
| Timestamps | Firestore Timestamp type |
| Composite Indexes | userId + timestamp queries |

### Database Normalization

The SQL schema follows **Third Normal Form (3NF)**:

1. **1NF**: Atomic values, unique rows
2. **2NF**: No partial dependencies
3. **3NF**: No transitive dependencies

**Example of Normalization Decision:**
- Instead of storing member names in expenses table → Reference user_id and JOIN
- Instead of storing group details in every expense → Reference group_id

---

## Evaluation Criteria

### What to Look For

#### Database Design (40%)
- [ ] Clear ER diagram or schema documentation
- [ ] Proper normalization (at least 3NF)
- [ ] Appropriate use of constraints
- [ ] Well-designed views or stored procedures
- [ ] Proper indexing strategy

#### Hybrid Architecture (30%)
- [ ] Clear justification for SQL vs NoSQL choice
- [ ] Proper data separation between databases
- [ ] Cross-reference mechanism (UUIDs)
- [ ] Understanding of trade-offs

#### Security (15%)
- [ ] RLS policies implemented
- [ ] Firebase rules configured
- [ ] No SQL injection vulnerabilities
- [ ] Proper access control

#### Code Quality (15%)
- [ ] TypeScript type safety
- [ ] Clean code structure
- [ ] Error handling
- [ ] Comments and documentation

---

## Demo Guide

### Recommended Demo Flow (10 minutes)

#### 1. Show Database Schema (2 min)
- Open `DATABASE_DOCUMENTATION.md`
- Explain ER diagram
- Highlight normalization

#### 2. Create Account & Login (1 min)
- Sign up with email/password
- Show user record created in Supabase

#### 3. Create a Group (1 min)
- Create "Demo Trip" group
- Show group_members junction table

#### 4. Add Expense - Manual Method (2 min)
- Add ₹500 dinner expense
- Show expense record in SQL
- Show activity log in Firebase

#### 5. Add Expense - NLP Method (2 min)
- Type "I paid 300 for movie tickets"
- Show NLP parsing result
- Explain categorization logic

#### 6. View Balances (1 min)
- Show balance calculation
- Explain the SQL view
- Show positive/negative amounts

#### 7. Check Firebase Console (1 min)
- Show activityLogs collection
- Show document structure

---

## Viva Questions & Expected Answers

### Basic Questions

**Q1: Why did you use two databases instead of one?**
> A: We use SQL (Supabase) for structured financial data that requires ACID compliance and complex joins. We use NoSQL (Firebase) for flexible data like activity logs where the schema varies, and for file storage. This hybrid approach leverages the strengths of each database type.

**Q2: Explain your database normalization.**
> A: Our SQL schema is in Third Normal Form (3NF). For example, instead of storing user names in the expenses table, we store user_id and join with the users table. This prevents update anomalies - if a user changes their name, we only update one row.

**Q3: What is a junction table? Give an example from your project.**
> A: A junction table resolves many-to-many relationships. Our `group_members` table connects users and groups - one user can be in many groups, and one group can have many users. The composite primary key (group_id, user_id) ensures no duplicate memberships.

### Intermediate Questions

**Q4: How do you calculate balances? Show the SQL query.**
> A: We use a SQL view called `user_balances` that joins expenses with expense_splits, groups by payer and payee, and calculates the SUM of amounts. The app then computes net balances by subtracting what you owe from what you're owed.

**Q5: How do SQL and NoSQL databases communicate in your app?**
> A: They communicate through UUIDs. When an expense is created in SQL, we log activity to Firebase using the same user_id and expense_id. When viewing activity, we can link back to SQL records using these UUIDs.

**Q6: Explain Row Level Security (RLS).**
> A: RLS ensures users can only access their own data. For example, our policy on expenses table checks if the current user is a member of the expense's group. Even if someone tries to query all expenses, they only see their groups' expenses.

### Advanced Questions

**Q7: When would you NOT use normalization?**
> A: Denormalization is useful for read-heavy scenarios. In Firebase, we store activity details directly in each log document instead of referencing separate tables. This avoids multiple reads and is faster for displaying activity feeds.

**Q8: How would you handle the system crashing between SQL and Firebase writes?**
> A: This is the challenge of distributed transactions. In production, we could use saga patterns or eventual consistency. Currently, the primary expense data in SQL is the source of truth, and Firebase is supplementary - losing an activity log doesn't affect financial accuracy.

**Q9: Why use Firebase Storage instead of Supabase Storage?**
> A: Firebase Storage integrates well with Firestore for metadata. Since we're already using Firebase for NoSQL, using its storage keeps the ecosystem simple. Both options are valid - this demonstrates understanding of service architecture.

---

## Technical Setup

### For Evaluation Without Credentials

If you don't have Supabase/Firebase accounts:

1. **View the code structure**: All database operations are in `src/services/`
2. **Read migrations**: SQL schemas are in `supabase/migrations/`
3. **Check documentation**: `DATABASE_DOCUMENTATION.md` has full schema
4. **Review types**: TypeScript types in `src/types/` mirror database structure

### For Live Demo

1. Create a Supabase project (free tier)
2. Run the SQL migrations
3. Create a Firebase project (free tier)
4. Update `.env` with credentials
5. Run `npm install && npm run dev`

See `FIREBASE_SETUP.md` and `QUICKSTART.md` for detailed instructions.

---

## Grading Rubric

### A Grade (90-100%)
- Complete hybrid database implementation
- Proper 3NF normalization with justification
- Working RLS and security rules
- Clear documentation
- Can answer all viva questions confidently
- Code is clean and well-organized

### B Grade (80-89%)
- Functional database implementation
- Basic normalization applied
- Some security implemented
- Adequate documentation
- Can answer most viva questions
- Minor code issues

### C Grade (70-79%)
- Database works but has design issues
- Normalization not complete
- Minimal security
- Limited documentation
- Struggles with some viva questions
- Code needs refactoring

### D Grade (60-69%)
- Database barely functional
- Poor normalization
- No security implementation
- Missing documentation
- Cannot explain design decisions
- Disorganized code

### F Grade (<60%)
- Non-functional or missing database
- No understanding of concepts
- Cannot explain the project

---

## Additional Resources for Students

### Recommended Reading
1. "Database System Concepts" by Silberschatz
2. Firebase Documentation: https://firebase.google.com/docs
3. Supabase Documentation: https://supabase.com/docs
4. SQL Normalization: https://www.guru99.com/database-normalization.html

### Practice Areas
1. Write more complex SQL queries
2. Implement additional RLS policies
3. Add real-time subscriptions
4. Optimize query performance

---

## Contact for Questions

If evaluators have questions about the project implementation:
1. Review `PROJECT_SUMMARY.md` for complete technical overview
2. Check `KNOWN_ISSUES.md` for acknowledged limitations
3. Examine inline code comments for implementation details

---

*This guide was created to facilitate academic evaluation of the Smart Expense Sharing System project, demonstrating modern full-stack development with hybrid database architecture.*

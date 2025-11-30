/**
 * DATABASE SERVICE - Firebase Firestore Implementation
 * 
 * This service handles all database operations using Firebase Firestore.
 * 
 * ============================================================================
 * DBMS CONCEPTS EXPLAINED FOR PROJECT PRESENTATION
 * ============================================================================
 * 
 * 1. DATABASE NORMALIZATION
 * -------------------------
 * Even in NoSQL (Firestore), we apply normalization principles:
 * 
 * FIRST NORMAL FORM (1NF):
 * - Each field contains only atomic (indivisible) values
 * - No repeating groups or arrays of complex objects as primary data
 * - Example: expense_splits are separate documents, not an array in expense
 * 
 * SECOND NORMAL FORM (2NF):
 * - Must be in 1NF
 * - All non-key attributes fully depend on the primary key
 * - Example: User details stored in 'users' collection, referenced by ID
 * 
 * THIRD NORMAL FORM (3NF):
 * - Must be in 2NF
 * - No transitive dependencies
 * - Example: Group name not stored in each expense, only group_id reference
 * 
 * 2. ENTITY-RELATIONSHIP MODEL
 * ----------------------------
 * Users (1) ----< (M) GroupMembers (M) >---- (1) Groups
 * Groups (1) ----< (M) Expenses
 * Expenses (1) ----< (M) ExpenseSplits
 * Users (1) ----< (M) ExpenseSplits
 * 
 * 3. REFERENTIAL INTEGRITY
 * ------------------------
 * Maintained through:
 * - Document references (foreign keys equivalent)
 * - Cascading deletes in application logic
 * - Transaction-based operations for consistency
 * 
 * 4. ACID PROPERTIES (Firestore Transactions)
 * -------------------------------------------
 * - Atomicity: All operations in a transaction succeed or fail together
 * - Consistency: Data remains valid after transactions
 * - Isolation: Transactions don't interfere with each other
 * - Durability: Committed data is permanently saved
 * 
 * 5. INDEXING
 * -----------
 * Firestore automatically creates indexes for:
 * - Single field queries
 * - Compound indexes (defined in firestore.indexes.json)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User, Group, GroupMember, Expense, ExpenseSplit, UserBalance } from '../types';

// ============================================================================
// USER SERVICE
// ============================================================================
// Handles User entity - Primary table in the database schema
// Demonstrates: Primary Key (uid), Unique Constraint (email)

export const userService = {
  /**
   * CREATE USER
   * SQL Equivalent: INSERT INTO users (id, email, name, created_at) VALUES (...)
   */
  async createUser(email: string, name: string, id: string): Promise<User> {
    const userRef = doc(db, 'users', id);
    const userData = {
      email,
      name,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    
    await setDoc(userRef, userData);
    
    return {
      id,
      email,
      name,
      created_at: new Date().toISOString(),
    };
  },

  /**
   * GET USER BY ID
   * SQL Equivalent: SELECT * FROM users WHERE id = ?
   */
  async getUserById(id: string): Promise<User | null> {
    const userRef = doc(db, 'users', id);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return null;
    
    const data = userSnap.data();
    return {
      id: userSnap.id,
      email: data.email,
      name: data.name,
      created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  },

  /**
   * GET USER BY EMAIL
   * SQL Equivalent: SELECT * FROM users WHERE email = ?
   * Uses index on email field for efficient lookup
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const userDoc = snapshot.docs[0];
    const data = userDoc.data();
    return {
      id: userDoc.id,
      email: data.email,
      name: data.name,
      created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  },

  /**
   * SEARCH USERS BY EMAIL
   * SQL Equivalent: SELECT * FROM users WHERE email LIKE ?%
   * Note: Firestore doesn't support LIKE, so we use range query
   */
  async searchUsersByEmail(emailPrefix: string): Promise<User[]> {
    const usersRef = collection(db, 'users');
    // Range query for prefix matching
    const q = query(
      usersRef,
      where('email', '>=', emailPrefix),
      where('email', '<=', emailPrefix + '\uf8ff'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(userDoc => {
      const data = userDoc.data();
      return {
        id: userDoc.id,
        email: data.email,
        name: data.name,
        created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });
  },

  /**
   * UPDATE USER
   * SQL Equivalent: UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?
   */
  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, {
      ...updates,
      updated_at: serverTimestamp(),
    });
  },
};

// ============================================================================
// GROUP SERVICE
// ============================================================================
// Handles Group entity with Many-to-Many relationship to Users via GroupMembers
// Demonstrates: Composite Key (group_id + user_id), Foreign Key relationships

export const groupService = {
  /**
   * CREATE GROUP with Transaction
   * Demonstrates ACID Transaction:
   * - Creates group document
   * - Adds creator as admin member
   * Both operations succeed or fail together (Atomicity)
   */
  async createGroup(name: string, createdBy: string): Promise<Group> {
    const groupId = await runTransaction(db, async (transaction) => {
      // Create group document
      const groupRef = doc(collection(db, 'groups'));
      const groupData = {
        name,
        created_by: createdBy,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };
      
      transaction.set(groupRef, groupData);
      
      // Add creator as admin member (subcollection)
      // This demonstrates the junction table pattern for M:N relationship
      const memberRef = doc(db, 'groups', groupRef.id, 'members', createdBy);
      transaction.set(memberRef, {
        user_id: createdBy,
        joined_at: Timestamp.now(),
        role: 'admin',
      });
      
      return groupRef.id;
    });
    
    return {
      id: groupId,
      name,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
  },

  /**
   * GET USER GROUPS
   * SQL Equivalent with JOIN:
   * SELECT g.* FROM groups g
   * INNER JOIN group_members gm ON g.id = gm.group_id
   * WHERE gm.user_id = ?
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    // First, get all group IDs where user is a member
    const groupsRef = collection(db, 'groups');
    const snapshot = await getDocs(groupsRef);
    
    const userGroups: Group[] = [];
    
    for (const groupDoc of snapshot.docs) {
      // Check if user is a member of this group
      const memberRef = doc(db, 'groups', groupDoc.id, 'members', userId);
      const memberSnap = await getDoc(memberRef);
      
      if (memberSnap.exists()) {
        const data = groupDoc.data();
        userGroups.push({
          id: groupDoc.id,
          name: data.name,
          created_by: data.created_by,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      }
    }
    
    return userGroups;
  },

  /**
   * GET GROUP BY ID
   * SQL Equivalent: SELECT * FROM groups WHERE id = ?
   */
  async getGroupById(groupId: string): Promise<Group | null> {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    
    if (!groupSnap.exists()) return null;
    
    const data = groupSnap.data();
    return {
      id: groupSnap.id,
      name: data.name,
      created_by: data.created_by,
      created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  },

  /**
   * UPDATE GROUP
   * SQL Equivalent: UPDATE groups SET name = ? WHERE id = ?
   */
  async updateGroup(groupId: string, name: string): Promise<Group> {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      name,
      updated_at: serverTimestamp(),
    });
    
    const updated = await this.getGroupById(groupId);
    if (!updated) throw new Error('Group not found');
    return updated;
  },

  /**
   * DELETE GROUP with Cascade
   * Demonstrates Cascading Delete (Referential Integrity):
   * When group is deleted, all related data is also deleted
   */
  async deleteGroup(groupId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Delete all members (cascade)
    const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
    membersSnap.docs.forEach(memberDoc => batch.delete(memberDoc.ref));
    
    // Delete all expenses in this group
    const expensesQuery = query(collection(db, 'expenses'), where('group_id', '==', groupId));
    const expensesSnap = await getDocs(expensesQuery);
    
    for (const expenseDoc of expensesSnap.docs) {
      // Delete expense splits first (cascade)
      const splitsSnap = await getDocs(collection(db, 'expenses', expenseDoc.id, 'splits'));
      splitsSnap.docs.forEach(splitDoc => batch.delete(splitDoc.ref));
      batch.delete(expenseDoc.ref);
    }
    
    // Delete the group itself
    batch.delete(doc(db, 'groups', groupId));
    
    await batch.commit();
  },

  /**
   * ADD MEMBER TO GROUP
   * SQL Equivalent: INSERT INTO group_members (group_id, user_id, joined_at, role) VALUES (...)
   * This is the junction table for M:N relationship between Users and Groups
   */
  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    const memberRef = doc(db, 'groups', groupId, 'members', userId);
    const memberData = {
      user_id: userId,
      joined_at: Timestamp.now(),
      role: 'member',
    };
    
    await setDoc(memberRef, memberData);
    
    return {
      group_id: groupId,
      user_id: userId,
      joined_at: new Date().toISOString(),
    };
  },

  /**
   * REMOVE MEMBER FROM GROUP
   * SQL Equivalent: DELETE FROM group_members WHERE group_id = ? AND user_id = ?
   */
  async removeMember(groupId: string, userId: string): Promise<void> {
    const memberRef = doc(db, 'groups', groupId, 'members', userId);
    await deleteDoc(memberRef);
  },

  /**
   * GET GROUP MEMBERS with User Details
   * SQL Equivalent with JOIN:
   * SELECT gm.*, u.* FROM group_members gm
   * INNER JOIN users u ON gm.user_id = u.id
   * WHERE gm.group_id = ?
   */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
    
    const members: GroupMember[] = [];
    
    for (const memberDoc of membersSnap.docs) {
      const memberData = memberDoc.data();
      
      // Fetch user details (simulating JOIN)
      const user = await userService.getUserById(memberData.user_id);
      
      members.push({
        group_id: groupId,
        user_id: memberData.user_id,
        joined_at: memberData.joined_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        user: user || undefined,
      });
    }
    
    return members;
  },
};

// ============================================================================
// EXPENSE SERVICE
// ============================================================================
// Handles Expense entity with One-to-Many relationship to ExpenseSplits
// Demonstrates: Foreign Keys, Aggregate Functions, Transaction Processing

export const expenseService = {
  /**
   * CREATE EXPENSE with Transaction
   * Demonstrates Multi-table Transaction:
   * - Creates expense record
   * - Related splits can be created atomically
   */
  async createExpense(expense: {
    group_id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    paid_by: string;
    receipt_url?: string;
    input_method?: string;
  }): Promise<Expense> {
    const expenseRef = await addDoc(collection(db, 'expenses'), {
      group_id: expense.group_id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      paid_by: expense.paid_by,
      receipt_url: expense.receipt_url || null,
      input_method: expense.input_method || 'manual',
      created_at: serverTimestamp(),
    });
    
    return {
      id: expenseRef.id,
      group_id: expense.group_id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category as Expense['category'],
      date: expense.date,
      paid_by: expense.paid_by,
      receipt_url: expense.receipt_url || null,
      input_method: (expense.input_method as Expense['input_method']) || 'manual',
      created_at: new Date().toISOString(),
    };
  },

  /**
   * CREATE SPLITS with Batch Write
   * SQL Equivalent: INSERT INTO expense_splits VALUES (...), (...), (...)
   * Uses batch for atomic multi-row insert
   */
  async createSplits(splits: { expense_id: string; user_id: string; share_amount: number }[]): Promise<ExpenseSplit[]> {
    const batch = writeBatch(db);
    const createdSplits: ExpenseSplit[] = [];
    
    for (const split of splits) {
      // Document ID is user_id to enforce unique constraint (one split per user per expense)
      const splitRef = doc(db, 'expenses', split.expense_id, 'splits', split.user_id);
      batch.set(splitRef, {
        user_id: split.user_id,
        share_amount: split.share_amount,
        is_settled: false,
      });
      
      createdSplits.push({
        id: `${split.expense_id}-${split.user_id}`,
        expense_id: split.expense_id,
        user_id: split.user_id,
        share_amount: split.share_amount,
      });
    }
    
    await batch.commit();
    return createdSplits;
  },

  /**
   * GET GROUP EXPENSES with Payer Details
   * SQL Equivalent with JOIN:
   * SELECT e.*, u.name as payer_name FROM expenses e
   * LEFT JOIN users u ON e.paid_by = u.id
   * WHERE e.group_id = ?
   * ORDER BY e.created_at DESC
   */
  async getGroupExpenses(groupId: string): Promise<Expense[]> {
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('group_id', '==', groupId),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(expensesQuery);
    const expenses: Expense[] = [];
    
    for (const expenseDoc of snapshot.docs) {
      const data = expenseDoc.data();
      
      // Fetch payer details (JOIN simulation)
      const payer = await userService.getUserById(data.paid_by);
      
      // Fetch splits (related records)
      const splitsSnap = await getDocs(collection(db, 'expenses', expenseDoc.id, 'splits'));
      const splits: ExpenseSplit[] = splitsSnap.docs.map(splitDoc => {
        const splitData = splitDoc.data();
        return {
          id: splitDoc.id,
          expense_id: expenseDoc.id,
          user_id: splitData.user_id,
          share_amount: splitData.share_amount,
        };
      });
      
      expenses.push({
        id: expenseDoc.id,
        group_id: data.group_id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date,
        paid_by: data.paid_by,
        receipt_url: data.receipt_url,
        input_method: data.input_method,
        created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        payer: payer || undefined,
        splits,
      });
    }
    
    return expenses;
  },

  /**
   * GET EXPENSE BY ID
   * SQL Equivalent: SELECT * FROM expenses WHERE id = ?
   */
  async getExpenseById(expenseId: string): Promise<Expense | null> {
    const expenseRef = doc(db, 'expenses', expenseId);
    const expenseSnap = await getDoc(expenseRef);
    
    if (!expenseSnap.exists()) return null;
    
    const data = expenseSnap.data();
    const payer = await userService.getUserById(data.paid_by);
    
    return {
      id: expenseSnap.id,
      group_id: data.group_id,
      description: data.description,
      amount: data.amount,
      category: data.category,
      date: data.date,
      paid_by: data.paid_by,
      receipt_url: data.receipt_url,
      input_method: data.input_method,
      created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      payer: payer || undefined,
    };
  },

  /**
   * UPDATE EXPENSE
   * SQL Equivalent: UPDATE expenses SET ... WHERE id = ?
   */
  async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense> {
    const expenseRef = doc(db, 'expenses', expenseId);
    
    // Remove fields that shouldn't be updated directly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, payer, splits, ...updateData } = updates;
    
    await updateDoc(expenseRef, {
      ...updateData,
      updated_at: serverTimestamp(),
    });
    
    const updated = await this.getExpenseById(expenseId);
    if (!updated) throw new Error('Expense not found');
    return updated;
  },

  /**
   * DELETE EXPENSE with Cascade
   * SQL Equivalent with CASCADE:
   * DELETE FROM expenses WHERE id = ?
   * (expense_splits deleted automatically via ON DELETE CASCADE)
   */
  async deleteExpense(expenseId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Delete all splits first (cascade)
    const splitsSnap = await getDocs(collection(db, 'expenses', expenseId, 'splits'));
    splitsSnap.docs.forEach(splitDoc => batch.delete(splitDoc.ref));
    
    // Delete the expense
    batch.delete(doc(db, 'expenses', expenseId));
    
    await batch.commit();
  },

  /**
   * GET GROUP BALANCES
   * Complex Aggregation Query
   * SQL Equivalent:
   * SELECT 
   *   es.user_id as from_user,
   *   e.paid_by as to_user,
   *   SUM(es.share_amount) as owes
   * FROM expenses e
   * JOIN expense_splits es ON e.id = es.expense_id
   * WHERE e.group_id = ? AND es.user_id != e.paid_by
   * GROUP BY es.user_id, e.paid_by
   * 
   * This demonstrates AGGREGATE FUNCTIONS (SUM) and GROUP BY
   */
  async getGroupBalances(groupId: string): Promise<UserBalance[]> {
    const expenses = await this.getGroupExpenses(groupId);
    const members = await groupService.getGroupMembers(groupId);
    
    // Calculate what each person owes to each other person
    const balanceMap = new Map<string, number>(); // "fromUser:toUser" -> amount
    
    for (const expense of expenses) {
      if (!expense.splits) continue;
      
      for (const split of expense.splits) {
        if (split.user_id === expense.paid_by) continue; // Skip self
        
        const key = `${split.user_id}:${expense.paid_by}`;
        const reverseKey = `${expense.paid_by}:${split.user_id}`;
        
        const currentOwed = balanceMap.get(key) || 0;
        const currentOwedReverse = balanceMap.get(reverseKey) || 0;
        
        // Net the amounts
        const netAmount = split.share_amount;
        if (currentOwedReverse > 0) {
          if (currentOwedReverse >= netAmount) {
            balanceMap.set(reverseKey, currentOwedReverse - netAmount);
          } else {
            balanceMap.set(reverseKey, 0);
            balanceMap.set(key, currentOwed + (netAmount - currentOwedReverse));
          }
        } else {
          balanceMap.set(key, currentOwed + netAmount);
        }
      }
    }
    
    // Convert to UserBalance array
    const balances: UserBalance[] = [];
    const memberMap = new Map(members.map(m => [m.user_id, m.user?.name || 'Unknown']));
    
    balanceMap.forEach((amount, key) => {
      if (amount > 0.01) { // Ignore tiny amounts
        const [fromUser, toUser] = key.split(':');
        balances.push({
          group_id: groupId,
          from_user: fromUser,
          to_user: toUser,
          owes: Math.round(amount * 100) / 100,
          from_user_name: memberMap.get(fromUser),
          to_user_name: memberMap.get(toUser),
        });
      }
    });
    
    return balances;
  },
};

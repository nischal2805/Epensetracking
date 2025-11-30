/**
 * Firebase Configuration and Initialization
 * 
 * This file sets up Firebase services for the Expense Tracking application.
 * 
 * DBMS CONCEPTS DEMONSTRATED:
 * ===========================
 * 
 * 1. FIREBASE AS A BACKEND-AS-A-SERVICE (BaaS)
 *    - Firebase combines SQL-like (Firestore) and NoSQL capabilities
 *    - Provides Authentication, Database, Storage, and more
 * 
 * 2. FIRESTORE DATABASE
 *    - Document-oriented NoSQL database
 *    - Organizes data in Collections (like tables) and Documents (like rows)
 *    - Supports real-time synchronization
 *    - Automatic indexing for queries
 * 
 * 3. SQL vs NoSQL COMPARISON (FOR DBMS PROJECT):
 *    
 *    SQL Approach (Traditional RDBMS):
 *    ---------------------------------
 *    - Tables: users, groups, group_members, expenses, expense_splits
 *    - Foreign Keys: expense.group_id → groups.id
 *    - JOINs required for related data
 *    - Strict schema enforcement
 *    - ACID transactions
 *    
 *    NoSQL Approach (Firestore - What we use):
 *    -----------------------------------------
 *    - Collections: users, groups, expenses, activities
 *    - Document references instead of foreign keys
 *    - Denormalization for read performance
 *    - Flexible schema
 *    - Eventual consistency with transaction support
 * 
 * 4. NORMALIZATION IN THIS PROJECT:
 *    We apply normalization principles even in NoSQL:
 *    
 *    1NF (First Normal Form):
 *    - All fields contain atomic values
 *    - No repeating groups (splits are separate documents)
 *    
 *    2NF (Second Normal Form):
 *    - All non-key attributes depend on primary key
 *    - User data not duplicated in expenses (only user_id reference)
 *    
 *    3NF (Third Normal Form):
 *    - No transitive dependencies
 *    - Group info not stored in expenses (only group_id)
 *    
 *    BCNF (Boyce-Codd Normal Form):
 *    - Every determinant is a candidate key
 *    - Applied in expense_splits (expense_id + user_id is composite key)
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration - Replace with your own config from Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

/**
 * DATABASE SCHEMA DESIGN (Firestore Collections)
 * ===============================================
 * 
 * COLLECTION: users
 * -----------------
 * Document ID: Firebase Auth UID
 * Fields:
 *   - email: string (indexed, unique)
 *   - name: string
 *   - created_at: timestamp
 *   - updated_at: timestamp
 * 
 * COLLECTION: groups
 * ------------------
 * Document ID: auto-generated
 * Fields:
 *   - name: string
 *   - created_by: string (user ID reference)
 *   - created_at: timestamp
 *   - updated_at: timestamp
 * 
 * SUB-COLLECTION: groups/{groupId}/members
 * ----------------------------------------
 * Document ID: user ID
 * Fields:
 *   - user_id: string
 *   - joined_at: timestamp
 *   - role: string ('admin' | 'member')
 * 
 * COLLECTION: expenses
 * --------------------
 * Document ID: auto-generated
 * Fields:
 *   - group_id: string (group reference)
 *   - description: string
 *   - amount: number
 *   - category: string
 *   - date: string (YYYY-MM-DD)
 *   - paid_by: string (user ID reference)
 *   - receipt_url: string | null
 *   - input_method: string ('manual' | 'nlp' | 'receipt')
 *   - created_at: timestamp
 *   - created_by: string (user ID reference)
 * 
 * SUB-COLLECTION: expenses/{expenseId}/splits
 * -------------------------------------------
 * Document ID: user ID
 * Fields:
 *   - user_id: string
 *   - share_amount: number
 *   - is_settled: boolean
 * 
 * COLLECTION: activities (Activity Log - NoSQL Optimized)
 * -------------------------------------------------------
 * Document ID: auto-generated
 * Fields:
 *   - user_id: string
 *   - group_id: string
 *   - action: string
 *   - details: map (flexible schema for different action types)
 *   - timestamp: timestamp
 * 
 * COLLECTION: receipts (NoSQL Document Store)
 * -------------------------------------------
 * Document ID: auto-generated
 * Fields:
 *   - expense_id: string
 *   - user_id: string
 *   - image_url: string
 *   - uploaded_at: timestamp
 *   - metadata: map
 *     - size: number
 *     - type: string
 *     - extracted_data: map
 *       - amount: number
 *       - merchant: string
 *       - date: string
 * 
 * INDEXES (Composite - for complex queries):
 * ------------------------------------------
 * 1. expenses: (group_id ASC, created_at DESC)
 * 2. activities: (user_id ASC, timestamp DESC)
 * 3. activities: (group_id ASC, timestamp DESC)
 * 
 * SECURITY RULES:
 * ---------------
 * - Users can only read/write their own user document
 * - Group members can read group data
 * - Only group admins can delete groups
 * - Expense creators or payers can edit expenses
 */

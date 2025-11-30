/**
 * NoSQL SERVICE - Firebase Firestore Implementation for Document-Oriented Data
 * 
 * This service handles data that benefits from NoSQL document storage:
 * - Activity Logs (flexible schema, append-heavy)
 * - Receipts (binary data with metadata)
 * - NLP Cache (key-value pattern)
 * 
 * ============================================================================
 * DBMS CONCEPTS: SQL vs NoSQL - WHEN TO USE EACH
 * ============================================================================
 * 
 * SQL (Relational) - Used for:
 * - Structured data with fixed schema (users, groups, expenses)
 * - Complex relationships requiring JOINs
 * - ACID transactions across multiple tables
 * - Data integrity with foreign key constraints
 * 
 * NoSQL (Document) - Used for:
 * - Semi-structured data (activity logs with varying details)
 * - High write throughput (logging)
 * - Flexible schema (different activity types)
 * - Horizontal scalability
 * 
 * In this project, we use Firestore for BOTH, but conceptually:
 * - users, groups, expenses → SQL-like structured collections
 * - activities, receipts, cache → NoSQL document collections
 * 
 * ============================================================================
 * WHY SEPARATE SERVICES?
 * ============================================================================
 * 
 * 1. SEPARATION OF CONCERNS
 *    - database-service.ts: Core business entities (normalized)
 *    - nosql-service.ts: Auxiliary data (denormalized for performance)
 * 
 * 2. DIFFERENT ACCESS PATTERNS
 *    - Core data: CRUD with relationships, transactions
 *    - Logs: Append-only, time-series queries
 *    - Cache: Key-value lookups
 * 
 * 3. OPTIMIZATION
 *    - Activities are denormalized (include user name) for read performance
 *    - Core data is normalized to prevent update anomalies
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import type { Receipt, ActivityLog, NLPCache, NLPParsedResult } from '../types';

// ============================================================================
// RECEIPT SERVICE
// ============================================================================
// Handles binary data (images) with metadata
// Demonstrates: BLOB storage pattern, Document with nested objects

export const receiptService = {
  /**
   * UPLOAD RECEIPT
   * Stores image in Firebase Storage and metadata in Firestore
   * 
   * Storage Pattern:
   * - Binary data (image) → Firebase Storage (blob storage)
   * - Metadata → Firestore document (structured data)
   * 
   * This separation follows best practices:
   * - Databases for structured data
   * - Object storage for binary files
   */
  async uploadReceipt(
    file: File,
    expenseId: string,
    userId: string,
    extractedData: { amount: number; merchant: string; date: string }
  ): Promise<Receipt> {
    // Upload image to Firebase Storage
    const storageRef = ref(storage, `receipts/${userId}/${Date.now()}_${file.name}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(uploadResult.ref);
    
    // Store metadata in Firestore
    await addDoc(collection(db, 'receipts'), {
      expense_id: expenseId,
      user_id: userId,
      image_url: imageUrl,
      uploaded_at: serverTimestamp(),
      metadata: {
        size: file.size,
        type: file.type,
        extracted_data: extractedData,
      },
    });
    
    return {
      expenseId,
      userId,
      imageUrl,
      uploadedAt: new Date(),
      metadata: {
        size: file.size,
        type: file.type,
        extractedData,
      },
    };
  },

  /**
   * GET RECEIPTS BY EXPENSE
   * SQL Equivalent: SELECT * FROM receipts WHERE expense_id = ?
   */
  async getReceiptsByExpense(expenseId: string): Promise<Receipt[]> {
    const q = query(
      collection(db, 'receipts'),
      where('expense_id', '==', expenseId)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        expenseId: data.expense_id,
        userId: data.user_id,
        imageUrl: data.image_url,
        uploadedAt: data.uploaded_at?.toDate() || new Date(),
        metadata: {
          size: data.metadata?.size || 0,
          type: data.metadata?.type || '',
          extractedData: data.metadata?.extracted_data || { amount: 0, merchant: '', date: '' },
        },
      };
    });
  },
};

// ============================================================================
// ACTIVITY SERVICE
// ============================================================================
// Handles activity logs - perfect use case for NoSQL
// Demonstrates: Time-series data, Denormalization, Flexible schema

export const activityService = {
  /**
   * LOG ACTIVITY
   * 
   * NoSQL Design Pattern: Event Sourcing
   * - Each activity is an immutable event
   * - Stored with timestamp for chronological queries
   * - Details field is flexible (different structure per action type)
   * 
   * DENORMALIZATION EXAMPLE:
   * We could store just user_id and look up the name later (normalized).
   * Instead, we might include user_name in details for faster reads.
   * This is a conscious trade-off: read speed vs. data consistency.
   */
  async logActivity(
    userId: string,
    groupId: string,
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await addDoc(collection(db, 'activities'), {
      user_id: userId,
      group_id: groupId,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  },

  /**
   * GET GROUP ACTIVITY
   * SQL Equivalent:
   * SELECT * FROM activities 
   * WHERE group_id = ? 
   * ORDER BY timestamp DESC 
   * LIMIT ?
   * 
   * This query benefits from composite index: (group_id, timestamp)
   */
  async getGroupActivity(groupId: string, limitCount: number = 50): Promise<ActivityLog[]> {
    const q = query(
      collection(db, 'activities'),
      where('group_id', '==', groupId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.user_id,
        groupId: data.group_id,
        action: data.action,
        details: data.details || {},
        timestamp: data.timestamp?.toDate() || new Date(),
      };
    });
  },

  /**
   * GET USER ACTIVITY
   * SQL Equivalent:
   * SELECT * FROM activities 
   * WHERE user_id = ? 
   * ORDER BY timestamp DESC 
   * LIMIT ?
   * 
   * This query benefits from composite index: (user_id, timestamp)
   */
  async getUserActivity(userId: string, limitCount: number = 50): Promise<ActivityLog[]> {
    const q = query(
      collection(db, 'activities'),
      where('user_id', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.user_id,
        groupId: data.group_id,
        action: data.action,
        details: data.details || {},
        timestamp: data.timestamp?.toDate() || new Date(),
      };
    });
  },
};

// ============================================================================
// NLP CACHE SERVICE
// ============================================================================
// Handles caching of NLP parsing results
// Demonstrates: Key-Value pattern, TTL concepts, Memoization

export const nlpCacheService = {
  /**
   * CACHE NLP RESULT
   * 
   * Key-Value Pattern:
   * - Key: Hash of input text
   * - Value: Parsed result with confidence score
   * 
   * This is similar to Redis caching pattern but using Firestore.
   * Benefits:
   * - Avoid re-parsing same input
   * - Learn from successful parses
   * - Improve accuracy over time
   */
  async cacheNLPResult(
    inputText: string,
    parsedResult: NLPParsedResult,
    confidence: number
  ): Promise<void> {
    // Create a simple hash for the input text
    const hash = await this.hashText(inputText.toLowerCase().trim());
    
    const cacheRef = doc(db, 'nlp_cache', hash);
    await setDoc(cacheRef, {
      input_text: inputText,
      parsed_result: parsedResult,
      confidence,
      timestamp: serverTimestamp(),
      hit_count: 1,
    }, { merge: true });
  },

  /**
   * GET CACHED RESULT
   * O(1) lookup by document ID (hash)
   */
  async getCachedResult(inputText: string): Promise<NLPCache | null> {
    const hash = await this.hashText(inputText.toLowerCase().trim());
    const cacheRef = doc(db, 'nlp_cache', hash);
    const cacheSnap = await getDoc(cacheRef);
    
    if (!cacheSnap.exists()) return null;
    
    const data = cacheSnap.data();
    return {
      inputText: data.input_text,
      parsedResult: data.parsed_result,
      confidence: data.confidence,
      timestamp: data.timestamp?.toDate() || new Date(),
    };
  },

  /**
   * Simple hash function for cache keys
   * In production, use a proper hashing library
   */
  async hashText(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 20);
  },
};

// ============================================================================
// OCR SIMULATION SERVICE
// ============================================================================
// Simulates OCR for receipt scanning
// In production, this would call Google Cloud Vision, AWS Textract, etc.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const simulateOCR = async (_file: File): Promise<{ amount: number; merchant: string; date: string }> => {
  // Simulate processing delay (real OCR takes time)
  // In production, _file would be sent to OCR API like Google Cloud Vision
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Indian merchants for realistic demo data
  const indianMerchants = [
    'Swiggy', 'Zomato', 'Big Bazaar', 'DMart', 'Reliance Fresh',
    'More Supermarket', 'Spencer\'s', 'Café Coffee Day', 'Domino\'s Pizza',
    'McDonald\'s', 'KFC', 'Burger King', 'Haldiram\'s', 'Bikanervala',
    'Peter England', 'Westside', 'Pantaloons', 'Shoppers Stop'
  ];

  // Generate realistic random data
  const randomAmount = Math.floor(Math.random() * 4990) + 10;
  const randomMerchant = indianMerchants[Math.floor(Math.random() * indianMerchants.length)];

  const today = new Date();
  const daysAgo = Math.floor(Math.random() * 7);
  const receiptDate = new Date(today);
  receiptDate.setDate(today.getDate() - daysAgo);

  return {
    amount: randomAmount,
    merchant: randomMerchant,
    date: receiptDate.toISOString().split('T')[0]
  };
};

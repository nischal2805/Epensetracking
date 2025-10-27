import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import type { Receipt, ActivityLog, NLPCache } from '../types';

export const receiptService = {
  async uploadReceipt(
    file: File,
    expenseId: string,
    userId: string,
    extractedData: { amount: number; merchant: string; date: string }
  ): Promise<Receipt> {
    const timestamp = Date.now();
    const storageRef = ref(storage, `receipts/${userId}/${timestamp}_${file.name}`);

    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);

    const receipt: Receipt = {
      expenseId,
      userId,
      imageUrl,
      uploadedAt: new Date(),
      metadata: {
        size: file.size,
        type: file.type,
        extractedData
      }
    };

    await addDoc(collection(db, 'receipts'), {
      ...receipt,
      uploadedAt: Timestamp.fromDate(receipt.uploadedAt)
    });

    return receipt;
  },

  async getReceiptsByExpense(expenseId: string): Promise<Receipt[]> {
    const q = query(
      collection(db, 'receipts'),
      where('expenseId', '==', expenseId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        uploadedAt: data.uploadedAt.toDate()
      } as Receipt;
    });
  }
};

export const activityService = {
  async logActivity(
    userId: string,
    groupId: string,
    action: string,
    details: object
  ): Promise<void> {
    await addDoc(collection(db, 'activityLogs'), {
      userId,
      groupId,
      action,
      details,
      timestamp: Timestamp.now()
    });
  },

  async getGroupActivity(groupId: string, limitCount: number = 50): Promise<ActivityLog[]> {
    const q = query(
      collection(db, 'activityLogs'),
      where('groupId', '==', groupId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as ActivityLog;
    });
  },

  async getUserActivity(userId: string, limitCount: number = 50): Promise<ActivityLog[]> {
    const q = query(
      collection(db, 'activityLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as ActivityLog;
    });
  }
};

export const nlpCacheService = {
  async cacheNLPResult(
    inputText: string,
    parsedResult: any,
    confidence: number
  ): Promise<void> {
    await addDoc(collection(db, 'nlpCache'), {
      inputText: inputText.toLowerCase().trim(),
      parsedResult,
      confidence,
      timestamp: Timestamp.now()
    });
  },

  async getCachedResult(inputText: string): Promise<NLPCache | null> {
    const normalizedInput = inputText.toLowerCase().trim();
    const q = query(
      collection(db, 'nlpCache'),
      where('inputText', '==', normalizedInput),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const data = snapshot.docs[0].data();
    return {
      ...data,
      timestamp: data.timestamp.toDate()
    } as NLPCache;
  }
};

export const simulateOCR = async (file: File): Promise<{ amount: number; merchant: string; date: string }> => {
  await new Promise(resolve => setTimeout(resolve, 2000));

  const indianMerchants = [
    'Swiggy', 'Zomato', 'Big Bazaar', 'DMart', 'Reliance Fresh',
    'More Supermarket', 'Spencer\'s', 'Café Coffee Day', 'Domino\'s Pizza',
    'McDonald\'s', 'KFC', 'Burger King', 'Haldiram\'s', 'Bikanervala',
    'Peter England', 'Westside', 'Pantaloons', 'Shoppers Stop'
  ];

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

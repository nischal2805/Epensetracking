export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
  user?: User;
}

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paid_by: string;
  receipt_url: string | null;
  input_method: InputMethod;
  created_at: string;
  payer?: User;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  share_amount: number;
  user?: User;
}

export interface UserBalance {
  group_id: string;
  from_user: string;
  to_user: string;
  owes: number;
  from_user_name?: string;
  to_user_name?: string;
}

export interface SimplifiedBalance {
  user_id: string;
  user_name: string;
  net_amount: number;
}

export type ExpenseCategory =
  | 'Food'
  | 'Entertainment'
  | 'Travel'
  | 'Shopping'
  | 'Bills'
  | 'Other';

export type InputMethod = 'manual' | 'nlp' | 'receipt';

export interface Receipt {
  expenseId: string;
  userId: string;
  imageUrl: string;
  uploadedAt: Date;
  metadata: {
    size: number;
    type: string;
    extractedData: {
      amount: number;
      merchant: string;
      date: string;
    };
  };
}

export interface VoiceInput {
  expenseId: string;
  userId: string;
  audioUrl: string;
  transcription: string;
  parsedData: object;
  processedAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  groupId: string;
  action: string;
  details: object;
  timestamp: Date;
}

export interface NLPCache {
  inputText: string;
  parsedResult: NLPParsedResult;
  confidence: number;
  timestamp: Date;
}

export interface NLPParsedResult {
  amount: number;
  description: string;
  category: ExpenseCategory;
  payer?: string;
  participants?: string[];
  date?: string;
}

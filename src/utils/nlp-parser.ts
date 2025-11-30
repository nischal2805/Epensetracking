import type { ExpenseCategory, NLPParsedResult } from '../types';
import { parseNaturalDate } from './date';

const categoryKeywords: Record<string, ExpenseCategory> = {
  'breakfast': 'Food',
  'lunch': 'Food',
  'dinner': 'Food',
  'food': 'Food',
  'meal': 'Food',
  'restaurant': 'Food',
  'cafe': 'Food',
  'coffee': 'Food',
  'tea': 'Food',
  'snack': 'Food',
  'swiggy': 'Food',
  'zomato': 'Food',
  'movie': 'Entertainment',
  'cinema': 'Entertainment',
  'concert': 'Entertainment',
  'show': 'Entertainment',
  'game': 'Entertainment',
  'entertainment': 'Entertainment',
  'ticket': 'Entertainment',
  'uber': 'Travel',
  'ola': 'Travel',
  'taxi': 'Travel',
  'cab': 'Travel',
  'bus': 'Travel',
  'train': 'Travel',
  'flight': 'Travel',
  'metro': 'Travel',
  'auto': 'Travel',
  'rickshaw': 'Travel',
  'petrol': 'Travel',
  'diesel': 'Travel',
  'gas': 'Travel',
  'travel': 'Travel',
  'grocery': 'Shopping',
  'shopping': 'Shopping',
  'clothes': 'Shopping',
  'mall': 'Shopping',
  'shop': 'Shopping',
  'store': 'Shopping',
  'market': 'Shopping',
  'rent': 'Bills',
  'electricity': 'Bills',
  'water': 'Bills',
  'wifi': 'Bills',
  'internet': 'Bills',
  'mobile': 'Bills',
  'phone': 'Bills',
  'bill': 'Bills',
  'utility': 'Bills',
};

function extractAmount(text: string): number | null {
  const currencyPatterns = [
    /(?:rs\.?|₹|inr)\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
    /(\d+(?:,\d+)*(?:\.\d{1,2})?)\s*(?:rs\.?|₹|rupees?|inr)/i,
    /(\d+(?:,\d+)*(?:\.\d{1,2})?)/,
  ];

  for (const pattern of currencyPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      return parseFloat(amount);
    }
  }

  return null;
}

function categorizeExpense(text: string): ExpenseCategory {
  const lowerText = text.toLowerCase();

  for (const [keyword, category] of Object.entries(categoryKeywords)) {
    if (lowerText.includes(keyword)) {
      return category;
    }
  }

  return 'Other';
}

function extractDate(text: string): string {
  const datePatterns = [
    /(?:on|dated?)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(yesterday|today|last\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsedDate = parseNaturalDate(match[1]);
      return parsedDate.toISOString().split('T')[0];
    }
  }

  return new Date().toISOString().split('T')[0];
}

function extractDescription(text: string): string {
  const forPattern = /(?:paid|spent|spend|for)\s+(?:rs\.?|₹)?\s*\d+(?:,\d+)*(?:\.\d{1,2})?\s+(?:rs\.?|₹|rupees?)?\s*(?:for|on)\s+(.+?)(?:\s+(?:with|among|between|yesterday|today|last|on|dated?)|\s*$)/i;
  const match = text.match(forPattern);

  if (match) {
    return match[1].trim();
  }

  const simplePattern = /(?:for|on)\s+(.+?)(?:\s+(?:with|among|between|yesterday|today|last|on|dated?)|\s*$)/i;
  const simpleMatch = text.match(simplePattern);

  if (simpleMatch) {
    return simpleMatch[1].trim();
  }

  return 'Expense';
}

function extractPayer(text: string, currentUserId?: string): string | undefined {
  const payerPatterns = [
    /^(\w+)\s+paid/i,
    /^i\s+paid/i,
  ];

  for (const pattern of payerPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].toLowerCase().startsWith('i ')) {
        return currentUserId;
      }
      return match[1];
    }
  }

  return currentUserId;
}

function extractParticipants(text: string): string[] {
  const participantPatterns = [
    /(?:with|among|between)\s+([\w\s,and]+?)(?:\s+(?:yesterday|today|last|on|dated?)|\s*$)/i,
  ];

  for (const pattern of participantPatterns) {
    const match = text.match(pattern);
    if (match) {
      const names = match[1]
        .split(/,|\s+and\s+/)
        .map(name => name.trim())
        .filter(name => name && name.length > 0);
      return names;
    }
  }

  return [];
}

export function parseNLPInput(text: string, currentUserId?: string): NLPParsedResult {
  const amount = extractAmount(text);
  const description = extractDescription(text);
  const category = categorizeExpense(text);
  const date = extractDate(text);
  const payer = extractPayer(text, currentUserId);
  const participants = extractParticipants(text);

  return {
    amount: amount || 0,
    description: description || 'Expense',
    category,
    date,
    payer,
    participants: participants.length > 0 ? participants : undefined,
  };
}

export function calculateConfidence(parsed: NLPParsedResult): number {
  let confidence = 0;

  if (parsed.amount > 0) confidence += 40;
  if (parsed.description && parsed.description !== 'Expense') confidence += 30;
  if (parsed.category !== 'Other') confidence += 15;
  if (parsed.date) confidence += 10;
  if (parsed.payer) confidence += 5;

  return Math.min(confidence, 100);
}

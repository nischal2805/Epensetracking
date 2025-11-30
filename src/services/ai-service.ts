/**
 * AI Service - Smart Expense Features
 * 
 * This module provides AI-powered features for the expense tracking system:
 * 1. Smart Categorization - Auto-categorizes expenses based on descriptions
 * 2. Spending Insights - Provides analytics and recommendations
 * 3. Pattern Recognition - Identifies spending patterns and trends
 * 
 * Note: This uses built-in heuristics. For production, consider integrating
 * with OpenAI, Google Cloud AI, or similar services.
 */

import type { Expense, ExpenseCategory } from '../types';

// ============================================
// SMART CATEGORIZATION
// ============================================

interface CategoryRule {
  keywords: string[];
  category: ExpenseCategory;
  priority: number;
}

const categoryRules: CategoryRule[] = [
  // Food & Dining
  {
    keywords: ['breakfast', 'lunch', 'dinner', 'food', 'restaurant', 'cafe', 'coffee', 
               'tea', 'snack', 'swiggy', 'zomato', 'dominos', 'pizza', 'burger', 
               'biryani', 'thali', 'meal', 'eat', 'dine', 'kitchen', 'cook', 
               'grocery', 'vegetables', 'fruits', 'milk', 'bread', 'mcdonalds', 
               'kfc', 'starbucks', 'chai', 'samosa', 'vada pav', 'dosa'],
    category: 'Food',
    priority: 1
  },
  // Entertainment
  {
    keywords: ['movie', 'cinema', 'concert', 'show', 'game', 'entertainment', 
               'ticket', 'netflix', 'prime', 'spotify', 'bookmyshow', 'pvr', 
               'inox', 'theatre', 'party', 'club', 'pub', 'bar', 'dance', 
               'music', 'event', 'festival', 'hotstar', 'youtube'],
    category: 'Entertainment',
    priority: 2
  },
  // Travel
  {
    keywords: ['uber', 'ola', 'taxi', 'cab', 'bus', 'train', 'flight', 'metro', 
               'auto', 'rickshaw', 'petrol', 'diesel', 'gas', 'travel', 'trip', 
               'journey', 'commute', 'transport', 'parking', 'toll', 'rapido', 
               'irctc', 'makemytrip', 'goibibo', 'redbus', 'airport', 'station',
               'fuel', 'highway', 'road'],
    category: 'Travel',
    priority: 2
  },
  // Shopping
  {
    keywords: ['shopping', 'clothes', 'mall', 'shop', 'store', 'market', 'amazon', 
               'flipkart', 'myntra', 'shoes', 'dress', 'shirt', 'pant', 'fashion', 
               'electronics', 'mobile', 'laptop', 'furniture', 'appliance', 
               'purchase', 'buy', 'order', 'delivery', 'dmart', 'big bazaar',
               'reliance', 'more', 'spencer'],
    category: 'Shopping',
    priority: 2
  },
  // Bills & Utilities
  {
    keywords: ['rent', 'electricity', 'water', 'wifi', 'internet', 'mobile', 
               'phone', 'bill', 'utility', 'recharge', 'subscription', 'emi', 
               'insurance', 'maintenance', 'society', 'gas cylinder', 'lpg', 
               'broadband', 'jio', 'airtel', 'vi', 'bsnl', 'paytm', 'gpay'],
    category: 'Bills',
    priority: 3
  }
];

/**
 * Smart categorization using weighted keyword matching
 */
export function smartCategorize(description: string): {
  category: ExpenseCategory;
  confidence: number;
  matchedKeywords: string[];
} {
  const lowerDesc = description.toLowerCase();
  const words = lowerDesc.split(/\s+/);
  
  let bestMatch = {
    category: 'Other' as ExpenseCategory,
    score: 0,
    matchedKeywords: [] as string[]
  };
  
  for (const rule of categoryRules) {
    let score = 0;
    const matches: string[] = [];
    
    for (const keyword of rule.keywords) {
      // Exact word match
      if (words.includes(keyword)) {
        score += 2;
        matches.push(keyword);
      }
      // Partial match
      else if (lowerDesc.includes(keyword)) {
        score += 1;
        matches.push(keyword);
      }
    }
    
    // Apply priority bonus
    score = score * (1 + (rule.priority * 0.1));
    
    if (score > bestMatch.score) {
      bestMatch = {
        category: rule.category,
        score,
        matchedKeywords: matches
      };
    }
  }
  
  // Calculate confidence (0-100)
  const confidence = Math.min(100, Math.round((bestMatch.score / 10) * 100));
  
  return {
    category: bestMatch.category,
    confidence,
    matchedKeywords: bestMatch.matchedKeywords
  };
}

// ============================================
// SPENDING INSIGHTS
// ============================================

export interface SpendingInsight {
  type: 'info' | 'warning' | 'success' | 'tip';
  title: string;
  description: string;
  icon: string;
}

export interface SpendingAnalytics {
  totalSpent: number;
  averageExpense: number;
  largestExpense: {
    amount: number;
    description: string;
    date: string;
  } | null;
  categoryBreakdown: {
    category: ExpenseCategory;
    amount: number;
    percentage: number;
    count: number;
  }[];
  dailyAverage: number;
  weeklyTrend: 'increasing' | 'decreasing' | 'stable';
  insights: SpendingInsight[];
}

/**
 * Generate spending analytics and AI-powered insights
 */
export function generateSpendingInsights(expenses: Expense[]): SpendingAnalytics {
  if (expenses.length === 0) {
    return {
      totalSpent: 0,
      averageExpense: 0,
      largestExpense: null,
      categoryBreakdown: [],
      dailyAverage: 0,
      weeklyTrend: 'stable',
      insights: [{
        type: 'info',
        title: 'No Expenses Yet',
        description: 'Start adding expenses to see spending insights and recommendations.',
        icon: '📊'
      }]
    };
  }
  
  // Basic calculations
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const averageExpense = totalSpent / expenses.length;
  
  // Find largest expense
  const largest = expenses.reduce((max, e) => e.amount > max.amount ? e : max, expenses[0]);
  
  // Category breakdown
  const categoryMap = new Map<ExpenseCategory, { amount: number; count: number }>();
  expenses.forEach(e => {
    const current = categoryMap.get(e.category) || { amount: 0, count: 0 };
    categoryMap.set(e.category, {
      amount: current.amount + e.amount,
      count: current.count + 1
    });
  });
  
  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    amount: data.amount,
    percentage: Math.round((data.amount / totalSpent) * 100),
    count: data.count
  })).sort((a, b) => b.amount - a.amount);
  
  // Calculate date range and daily average
  const dates = expenses.map(e => new Date(e.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const daysDiff = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
  const dailyAverage = totalSpent / daysDiff;
  
  // Weekly trend (compare first half to second half)
  const midpoint = expenses.length / 2;
  const firstHalf = expenses.slice(0, midpoint);
  const secondHalf = expenses.slice(midpoint);
  const firstHalfTotal = firstHalf.reduce((sum, e) => sum + e.amount, 0);
  const secondHalfTotal = secondHalf.reduce((sum, e) => sum + e.amount, 0);
  const trendDiff = secondHalfTotal - firstHalfTotal;
  const weeklyTrend: 'increasing' | 'decreasing' | 'stable' = 
    trendDiff > totalSpent * 0.1 ? 'increasing' :
    trendDiff < -totalSpent * 0.1 ? 'decreasing' : 'stable';
  
  // Generate insights
  const insights: SpendingInsight[] = [];
  
  // Insight: Top spending category
  if (categoryBreakdown.length > 0) {
    const topCategory = categoryBreakdown[0];
    if (topCategory.percentage > 50) {
      insights.push({
        type: 'warning',
        title: `${topCategory.category} Dominates Spending`,
        description: `${topCategory.percentage}% of your expenses are on ${topCategory.category}. Consider diversifying or budgeting.`,
        icon: '⚠️'
      });
    } else {
      insights.push({
        type: 'info',
        title: `Top Category: ${topCategory.category}`,
        description: `${topCategory.category} accounts for ${topCategory.percentage}% of your spending.`,
        icon: '📈'
      });
    }
  }
  
  // Insight: Large expense alert
  if (largest.amount > averageExpense * 3) {
    insights.push({
      type: 'warning',
      title: 'Large Expense Detected',
      description: `"${largest.description}" at ₹${largest.amount.toLocaleString('en-IN')} is 3x your average expense.`,
      icon: '💰'
    });
  }
  
  // Insight: Spending trend
  if (weeklyTrend === 'increasing') {
    insights.push({
      type: 'warning',
      title: 'Spending is Increasing',
      description: 'Your recent expenses are higher than before. Review your budget.',
      icon: '📈'
    });
  } else if (weeklyTrend === 'decreasing') {
    insights.push({
      type: 'success',
      title: 'Great Job Saving!',
      description: 'Your spending has decreased recently. Keep up the good work!',
      icon: '🎉'
    });
  }
  
  // Insight: Frequent small expenses
  const smallExpenses = expenses.filter(e => e.amount < averageExpense * 0.3);
  if (smallExpenses.length > expenses.length * 0.5) {
    insights.push({
      type: 'tip',
      title: 'Many Small Expenses',
      description: 'Small purchases add up! Consider tracking or consolidating them.',
      icon: '💡'
    });
  }
  
  // Insight: Food spending
  const foodSpending = categoryBreakdown.find(c => c.category === 'Food');
  if (foodSpending && foodSpending.percentage > 30) {
    insights.push({
      type: 'tip',
      title: 'Food for Thought',
      description: `You spend ${foodSpending.percentage}% on food. Meal planning could help save money.`,
      icon: '🍕'
    });
  }
  
  // Insight: Weekend spending pattern
  const weekendExpenses = expenses.filter(e => {
    const day = new Date(e.date).getDay();
    return day === 0 || day === 6;
  });
  const weekendTotal = weekendExpenses.reduce((sum, e) => sum + e.amount, 0);
  if (weekendTotal > totalSpent * 0.4 && weekendExpenses.length > 0) {
    insights.push({
      type: 'info',
      title: 'Weekend Spender',
      description: `${Math.round((weekendTotal / totalSpent) * 100)}% of spending happens on weekends.`,
      icon: '📅'
    });
  }
  
  return {
    totalSpent,
    averageExpense,
    largestExpense: {
      amount: largest.amount,
      description: largest.description,
      date: largest.date
    },
    categoryBreakdown,
    dailyAverage,
    weeklyTrend,
    insights
  };
}

// ============================================
// SMART SUGGESTIONS
// ============================================

/**
 * Generate smart expense description suggestions based on category
 */
export function getSuggestions(partialInput: string, category?: ExpenseCategory): string[] {
  const suggestions: Record<ExpenseCategory, string[]> = {
    Food: [
      'Dinner at restaurant',
      'Lunch with colleagues',
      'Breakfast',
      'Groceries from DMart',
      'Swiggy order',
      'Zomato delivery',
      'Coffee at Starbucks',
      'Office snacks'
    ],
    Entertainment: [
      'Movie tickets',
      'Netflix subscription',
      'Concert tickets',
      'Gaming',
      'Party expenses',
      'Books'
    ],
    Travel: [
      'Uber to office',
      'Metro recharge',
      'Petrol',
      'Ola cab',
      'Train tickets',
      'Bus fare',
      'Parking charges'
    ],
    Shopping: [
      'Amazon order',
      'Clothes shopping',
      'Electronics',
      'Household items',
      'Gifts',
      'Flipkart purchase'
    ],
    Bills: [
      'Electricity bill',
      'Water bill',
      'WiFi recharge',
      'Mobile recharge',
      'Rent payment',
      'Insurance premium',
      'EMI payment'
    ],
    Other: [
      'Medical expenses',
      'Gym membership',
      'Salon visit',
      'Donation',
      'Miscellaneous'
    ]
  };
  
  if (category) {
    return suggestions[category].filter(s => 
      s.toLowerCase().includes(partialInput.toLowerCase())
    );
  }
  
  // Return all matching suggestions across categories
  return Object.values(suggestions)
    .flat()
    .filter(s => s.toLowerCase().includes(partialInput.toLowerCase()))
    .slice(0, 5);
}

// ============================================
// BUDGET RECOMMENDATIONS
// ============================================

/**
 * Generate budget recommendations based on spending patterns
 */
export function getBudgetRecommendations(
  analytics: SpendingAnalytics,
  monthlyIncome?: number
): string[] {
  const recommendations: string[] = [];
  
  if (monthlyIncome) {
    const savingsRate = (monthlyIncome - analytics.totalSpent) / monthlyIncome;
    
    if (savingsRate < 0.2) {
      recommendations.push(
        'Try to save at least 20% of your income. Consider the 50-30-20 rule: 50% needs, 30% wants, 20% savings.'
      );
    }
  }
  
  // Category-specific recommendations
  analytics.categoryBreakdown.forEach(cat => {
    if (cat.category === 'Food' && cat.percentage > 35) {
      recommendations.push(
        `Food spending is ${cat.percentage}% of total. Try cooking at home more or using lunch boxes.`
      );
    }
    if (cat.category === 'Entertainment' && cat.percentage > 20) {
      recommendations.push(
        `Entertainment is ${cat.percentage}% of spending. Look for free alternatives or group discounts.`
      );
    }
    if (cat.category === 'Shopping' && cat.percentage > 25) {
      recommendations.push(
        `Shopping at ${cat.percentage}%. Use a 24-hour rule before purchases to avoid impulse buying.`
      );
    }
  });
  
  if (analytics.weeklyTrend === 'increasing') {
    recommendations.push(
      'Your spending is trending upward. Review recent expenses and identify areas to cut back.'
    );
  }
  
  return recommendations;
}

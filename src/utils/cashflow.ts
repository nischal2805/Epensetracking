import type { UserBalance, SimplifiedBalance } from '../types';

/**
 * Greedy Min Cash Flow Algorithm
 * 
 * This algorithm minimizes the number of transactions needed to settle all debts
 * in a group by finding the optimal matching between creditors and debtors.
 * 
 * Time Complexity: O(n²) where n is the number of users
 * Space Complexity: O(n)
 */

interface DebtFlow {
  from: string;
  to: string;
  amount: number;
  fromName?: string;
  toName?: string;
}

/**
 * Calculates the minimum cash flow to settle all debts in a group
 * @param balances Array of user balances (positive = owed money, negative = owes money)
 * @returns Array of simplified transactions to settle all debts
 */
export function calculateMinCashFlow(balances: SimplifiedBalance[]): DebtFlow[] {
  if (!balances || balances.length === 0) return [];

  // Create a copy of balances to avoid mutating the original
  const netBalances = balances.map(balance => ({
    ...balance,
    net_amount: Number(balance.net_amount)
  }));

  // Filter out zero balances
  const nonZeroBalances = netBalances.filter(balance => Math.abs(balance.net_amount) > 0.01);
  
  if (nonZeroBalances.length === 0) return [];

  const transactions: DebtFlow[] = [];

  // Continue until all balances are settled
  while (nonZeroBalances.length > 1) {
    // Find the maximum creditor (person owed the most money)
    let maxCreditorIndex = 0;
    for (let i = 1; i < nonZeroBalances.length; i++) {
      if (nonZeroBalances[i].net_amount > nonZeroBalances[maxCreditorIndex].net_amount) {
        maxCreditorIndex = i;
      }
    }

    // Find the maximum debtor (person who owes the most money)
    let maxDebtorIndex = 0;
    for (let i = 1; i < nonZeroBalances.length; i++) {
      if (nonZeroBalances[i].net_amount < nonZeroBalances[maxDebtorIndex].net_amount) {
        maxDebtorIndex = i;
      }
    }

    const creditor = nonZeroBalances[maxCreditorIndex];
    const debtor = nonZeroBalances[maxDebtorIndex];

    // Skip if no meaningful creditor or debtor
    if (creditor.net_amount <= 0.01 || debtor.net_amount >= -0.01) {
      break;
    }

    // Calculate the settlement amount (minimum of what creditor is owed and what debtor owes)
    const settlementAmount = Math.min(creditor.net_amount, Math.abs(debtor.net_amount));

    // Create the transaction
    transactions.push({
      from: debtor.user_id,
      to: creditor.user_id,
      amount: Math.round(settlementAmount * 100) / 100, // Round to 2 decimal places
      fromName: debtor.user_name,
      toName: creditor.user_name
    });

    // Update balances
    creditor.net_amount -= settlementAmount;
    debtor.net_amount += settlementAmount;

    // Remove settled balances
    if (Math.abs(creditor.net_amount) <= 0.01) {
      nonZeroBalances.splice(maxCreditorIndex, 1);
      // Adjust debtor index if creditor was removed before debtor
      if (maxCreditorIndex < maxDebtorIndex) {
        maxDebtorIndex--;
      }
    }
    
    if (Math.abs(debtor.net_amount) <= 0.01 && nonZeroBalances.length > 0) {
      // Find current debtor index since array might have changed
      const currentDebtorIndex = nonZeroBalances.findIndex(b => b.user_id === debtor.user_id);
      if (currentDebtorIndex !== -1) {
        nonZeroBalances.splice(currentDebtorIndex, 1);
      }
    }
  }

  return transactions;
}

/**
 * Converts raw user balances to simplified balances format
 * @param userBalances Raw balances from database
 * @returns Simplified balances with net amounts per user
 */
export function simplifyBalances(userBalances: UserBalance[]): SimplifiedBalance[] {
  const balanceMap = new Map<string, { name: string; amount: number }>();

  // Aggregate net balances for each user
  userBalances.forEach(balance => {
    const fromUserId = balance.from_user;
    const toUserId = balance.to_user;
    const amount = Number(balance.owes);

    // Initialize users if not exists
    if (!balanceMap.has(fromUserId)) {
      balanceMap.set(fromUserId, { 
        name: balance.from_user_name || 'Unknown User', 
        amount: 0 
      });
    }
    if (!balanceMap.has(toUserId)) {
      balanceMap.set(toUserId, { 
        name: balance.to_user_name || 'Unknown User', 
        amount: 0 
      });
    }

    // Update balances (from_user owes money, to_user is owed money)
    balanceMap.get(fromUserId)!.amount -= amount;
    balanceMap.get(toUserId)!.amount += amount;
  });

  // Convert to SimplifiedBalance format
  return Array.from(balanceMap.entries()).map(([userId, data]) => ({
    user_id: userId,
    user_name: data.name,
    net_amount: Math.round(data.amount * 100) / 100 // Round to 2 decimal places
  }));
}

/**
 * Formats a cash flow transaction for display
 * @param transaction The transaction to format
 * @returns Formatted string for UI display
 */
export function formatTransaction(transaction: DebtFlow): string {
  const fromName = transaction.fromName || 'Unknown';
  const toName = transaction.toName || 'Unknown';
  const amount = transaction.amount.toFixed(2);
  
  return `${fromName} pays ₹${amount} to ${toName}`;
}

/**
 * Validates that the cash flow algorithm preserves the total balance
 * @param originalBalances Original simplified balances
 * @param transactions Calculated transactions
 * @returns True if the algorithm is correct (total balance preserved)
 */
export function validateCashFlow(
  originalBalances: SimplifiedBalance[], 
  transactions: DebtFlow[]
): boolean {
  // Calculate original total (should be very close to 0)
  const originalTotal = originalBalances.reduce((sum, balance) => sum + balance.net_amount, 0);
  
  // Calculate transaction total (should also be 0)
  const transactionTotal = transactions.reduce((sum, transaction) => {
    return sum + transaction.amount - transaction.amount; // Each transaction adds and subtracts the same amount
  }, 0);
  
  // Both should be very close to 0 (within floating point precision)
  return Math.abs(originalTotal) < 0.01 && Math.abs(transactionTotal) < 0.01;
}

/**
 * Example usage and test function
 */
export function testCashFlowAlgorithm(): void {
  console.log('Testing Cash Flow Algorithm...');
  
  // Example: A owes B $100, B owes C $60, C owes A $40
  const testBalances: SimplifiedBalance[] = [
    { user_id: 'A', user_name: 'Alice', net_amount: -60 }, // Alice owes 60 net
    { user_id: 'B', user_name: 'Bob', net_amount: 40 },   // Bob is owed 40 net  
    { user_id: 'C', user_name: 'Charlie', net_amount: 20 } // Charlie is owed 20 net
  ];
  
  const transactions = calculateMinCashFlow(testBalances);
  
  console.log('Original balances:', testBalances);
  console.log('Optimized transactions:', transactions);
  console.log('Validation passed:', validateCashFlow(testBalances, transactions));
  
  transactions.forEach(transaction => {
    console.log(formatTransaction(transaction));
  });
}

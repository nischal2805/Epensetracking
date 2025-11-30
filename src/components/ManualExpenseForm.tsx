import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { groupService, expenseService } from '../services/database-service';
import { activityService } from '../services/nosql-service';
import type { GroupMember, ExpenseCategory } from '../types';

interface ManualExpenseFormProps {
  groupId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ManualExpenseForm({ groupId, onSuccess, onCancel }: ManualExpenseFormProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<{ [userId: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories: ExpenseCategory[] = ['Food', 'Entertainment', 'Travel', 'Shopping', 'Bills', 'Other'];

  useEffect(() => {
    if (groupId && user) {
      loadMembers();
      setPaidBy(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, user]);

  const loadMembers = async () => {
    if (!groupId) return;
    try {
      const data = await groupService.getGroupMembers(groupId);
      setMembers(data);

      const initialSplits: { [userId: string]: string } = {};
      data.forEach(m => {
        initialSplits[m.user_id] = '0';
      });
      setCustomSplits(initialSplits);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !user) return;

    setError('');
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const expense = await expenseService.createExpense({
        group_id: groupId,
        description,
        amount: amountNum,
        category,
        date,
        paid_by: paidBy,
        input_method: 'manual',
      });

      let splits;
      if (splitType === 'equal') {
        const splitAmount = amountNum / members.length;
        splits = members.map(m => ({
          expense_id: expense.id,
          user_id: m.user_id,
          share_amount: Math.round(splitAmount * 100) / 100,
        }));
      } else {
        const totalCustom = Object.values(customSplits).reduce((sum, val) => sum + parseFloat(val || '0'), 0);
        if (Math.abs(totalCustom - amountNum) > 0.01) {
          setError('Split amounts must equal total expense');
          setLoading(false);
          return;
        }
        splits = Object.entries(customSplits).map(([userId, splitAmount]) => ({
          expense_id: expense.id,
          user_id: userId,
          share_amount: parseFloat(splitAmount),
        }));
      }

      await expenseService.createSplits(splits);

      const payer = members.find(m => m.user_id === paidBy);
      await activityService.logActivity(
        user.id,
        groupId,
        'expense_added',
        {
          expenseId: expense.id,
          description,
          amount: amountNum,
          payer: payer?.user?.name || user.name,
        }
      );

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder="e.g., Dinner at Swiggy"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Paid By</label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {members.map(member => (
            <option key={member.user_id} value={member.user_id}>
              {member.user?.name || 'Unknown'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Split Type</label>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setSplitType('equal')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              splitType === 'equal'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Equal
          </button>
          <button
            type="button"
            onClick={() => setSplitType('custom')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              splitType === 'custom'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {splitType === 'custom' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Custom Splits</label>
          {members.map(member => (
            <div key={member.user_id} className="flex items-center space-x-2">
              <span className="flex-1 text-sm text-gray-700">{member.user?.name}</span>
              <input
                type="number"
                step="0.01"
                value={customSplits[member.user_id] || '0'}
                onChange={(e) => setCustomSplits({ ...customSplits, [member.user_id]: e.target.value })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-right"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Expense'}
        </button>
      </div>
    </form>
  );
}

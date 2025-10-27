import { useState, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { groupService, expenseService } from '../services/supabase-service';
import { activityService, nlpCacheService } from '../services/firebase-service';
import { parseNLPInput, calculateConfidence } from '../utils/nlp-parser';
import type { GroupMember, NLPParsedResult } from '../types';
import { formatIndianCurrency } from '../utils/currency';

interface NLPExpenseFormProps {
  groupId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function NLPExpenseForm({ groupId, onSuccess, onCancel }: NLPExpenseFormProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [inputText, setInputText] = useState('');
  const [parsed, setParsed] = useState<NLPParsedResult | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (groupId) {
      loadMembers();
    }
  }, [groupId]);

  const loadMembers = async () => {
    if (!groupId) return;
    try {
      const data = await groupService.getGroupMembers(groupId);
      setMembers(data);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleParse = async () => {
    if (!inputText.trim() || !user) return;

    const parsedResult = parseNLPInput(inputText, user.id);
    const conf = calculateConfidence(parsedResult);

    setParsed(parsedResult);
    setConfidence(conf);

    await nlpCacheService.cacheNLPResult(inputText, parsedResult, conf);
  };

  const handleSubmit = async () => {
    if (!groupId || !user || !parsed) return;

    setError('');
    setLoading(true);

    try {
      const expense = await expenseService.createExpense({
        group_id: groupId,
        description: parsed.description,
        amount: parsed.amount,
        category: parsed.category,
        date: parsed.date || new Date().toISOString().split('T')[0],
        paid_by: parsed.payer || user.id,
        input_method: 'nlp',
      });

      const splitAmount = parsed.amount / members.length;
      const splits = members.map(m => ({
        expense_id: expense.id,
        user_id: m.user_id,
        share_amount: Math.round(splitAmount * 100) / 100,
      }));

      await expenseService.createSplits(splits);

      await activityService.logActivity(
        user.id,
        groupId,
        'expense_added',
        {
          expenseId: expense.id,
          description: parsed.description,
          amount: parsed.amount,
          inputMethod: 'nlp',
        }
      );

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    'I paid 500 for dinner at Swiggy',
    'Spent 1200 on movie tickets yesterday',
    'Paid ₹350 for cab to airport',
    'Split 2000 for grocery shopping',
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your expense naturally
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g., I paid 500 for dinner with friends"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>

        <button
          type="button"
          onClick={handleParse}
          disabled={!inputText.trim()}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <Sparkles className="w-5 h-5" />
          <span>Parse with AI</span>
        </button>

        <div className="pt-2">
          <p className="text-xs font-medium text-gray-500 mb-2">Examples:</p>
          <div className="space-y-1">
            {examples.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInputText(example)}
                className="block w-full text-left text-sm text-gray-600 hover:text-emerald-500 hover:bg-emerald-50 px-3 py-2 rounded transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {parsed && (
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Parsed Result</h3>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                confidence >= 80 ? 'bg-green-500' :
                confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">{confidence}% confidence</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-gray-600">Amount:</span>
              <span className="font-semibold text-gray-900">{formatIndianCurrency(parsed.amount)}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-gray-600">Description:</span>
              <span className="font-semibold text-gray-900">{parsed.description}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-gray-600">Category:</span>
              <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                {parsed.category}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-gray-600">Date:</span>
              <span className="font-semibold text-gray-900">{parsed.date}</span>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || parsed.amount <= 0}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Confirm & Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

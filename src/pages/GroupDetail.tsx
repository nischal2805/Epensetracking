import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { groupService, expenseService } from '../services/database-service';
import type { Group, Expense, GroupMember, UserBalance, SimplifiedBalance } from '../types';
import { formatIndianCurrency } from '../utils/currency';
import { formatIndianDate } from '../utils/date';

interface GroupDetailProps {
  groupId: string;
  onBack: () => void;
  onAddExpense: (groupId: string) => void;
}

export default function GroupDetail({ groupId, onBack, onAddExpense }: GroupDetailProps) {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<SimplifiedBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');

  useEffect(() => {
    loadGroupData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      const [groupData, membersData, expensesData, balancesData] = await Promise.all([
        groupService.getGroupById(groupId),
        groupService.getGroupMembers(groupId),
        expenseService.getGroupExpenses(groupId),
        expenseService.getGroupBalances(groupId),
      ]);

      setGroup(groupData);
      setMembers(membersData);
      setExpenses(expensesData);
      setBalances(calculateSimplifiedBalances(balancesData, membersData, user!.id));
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSimplifiedBalances = (
    rawBalances: UserBalance[],
    members: GroupMember[],
    currentUserId: string
  ): SimplifiedBalance[] => {
    const userBalances = new Map<string, number>();

    members.forEach(m => {
      if (m.user_id !== currentUserId) {
        userBalances.set(m.user_id, 0);
      }
    });

    rawBalances.forEach(balance => {
      if (balance.from_user === currentUserId) {
        const current = userBalances.get(balance.to_user) || 0;
        userBalances.set(balance.to_user, current + balance.owes);
      } else if (balance.to_user === currentUserId) {
        const current = userBalances.get(balance.from_user) || 0;
        userBalances.set(balance.from_user, current - balance.owes);
      }
    });

    return Array.from(userBalances.entries())
      .map(([userId, amount]) => {
        const member = members.find(m => m.user_id === userId);
        return {
          user_id: userId,
          user_name: member?.user?.name || 'Unknown',
          net_amount: amount,
        };
      })
      .filter(b => Math.abs(b.net_amount) > 0.01);
  };

  if (loading || !group) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 px-4 py-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <Users className="w-6 h-6" />
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
        <p className="text-emerald-100">{members.length} members</p>
      </div>

      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-4 text-center font-semibold transition-colors ${
              activeTab === 'expenses'
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-gray-500'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`flex-1 py-4 text-center font-semibold transition-colors ${
              activeTab === 'balances'
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-gray-500'
            }`}
          >
            Balances
          </button>
        </div>
      </div>

      {activeTab === 'expenses' ? (
        <div className="p-4 space-y-3">
          {expenses.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No expenses yet</p>
              <button
                onClick={() => onAddExpense(groupId)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Add First Expense
              </button>
            </div>
          ) : (
            expenses.map((expense) => (
              <div key={expense.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                    <p className="text-sm text-gray-500">
                      Paid by {expense.payer?.name || 'Unknown'} • {formatIndianDate(expense.date)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-lg text-gray-900">
                      {formatIndianCurrency(expense.amount)}
                    </p>
                    <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                      {expense.category}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {balances.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">All settled up!</p>
            </div>
          ) : (
            balances.map((balance) => (
              <div key={balance.user_id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      balance.net_amount > 0 ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {balance.net_amount > 0 ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{balance.user_name}</p>
                      <p className="text-sm text-gray-500">
                        {balance.net_amount > 0 ? 'owes you' : 'you owe'}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold text-lg ${
                    balance.net_amount > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {formatIndianCurrency(Math.abs(balance.net_amount))}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <button
        onClick={() => onAddExpense(groupId)}
        className="fixed bottom-24 right-4 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-lg transition-all active:scale-95 z-40"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

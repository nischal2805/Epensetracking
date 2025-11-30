import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, PieChart, Lightbulb } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { groupService, expenseService } from '../services/supabase-service';
import { generateSpendingInsights, SpendingAnalytics } from '../services/ai-service';
import type { Expense, Group } from '../types';
import { formatIndianCurrency } from '../utils/currency';

export default function Insights() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [analytics, setAnalytics] = useState<SpendingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const groupsData = await groupService.getUserGroups(user.id);
      setGroups(groupsData);
      
      // Load expenses from all groups or selected group
      let allExpenses: Expense[] = [];
      if (selectedGroup === 'all') {
        for (const group of groupsData) {
          const groupExpenses = await expenseService.getGroupExpenses(group.id);
          allExpenses = [...allExpenses, ...groupExpenses];
        }
      } else {
        allExpenses = await expenseService.getGroupExpenses(selectedGroup);
      }
      
      setExpenses(allExpenses);
      setAnalytics(generateSpendingInsights(allExpenses));
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedGroup]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-5 h-5 text-red-500" />;
      case 'decreasing': return <TrendingDown className="w-5 h-5 text-green-500" />;
      default: return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getInsightBg = (type: 'info' | 'warning' | 'success' | 'tip') => {
    switch (type) {
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'success': return 'bg-green-50 border-green-200';
      case 'tip': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Smart spending analytics powered by AI</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Group Filter */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Analyze spending for:
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Groups</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>

        {analytics && expenses.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatIndianCurrency(analytics.totalSpent)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Average</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatIndianCurrency(analytics.averageExpense)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Daily Average</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatIndianCurrency(analytics.dailyAverage)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Trend</p>
                  {getTrendIcon(analytics.weeklyTrend)}
                </div>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {analytics.weeklyTrend}
                </p>
              </div>
            </div>

            {/* Largest Expense */}
            {analytics.largestExpense && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Largest Expense</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatIndianCurrency(analytics.largestExpense.amount)}
                </p>
                <p className="text-sm text-gray-600">{analytics.largestExpense.description}</p>
                <p className="text-xs text-gray-400 mt-1">{analytics.largestExpense.date}</p>
              </div>
            )}

            {/* Category Breakdown */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <PieChart className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-gray-900">Spending by Category</h3>
              </div>
              <div className="space-y-3">
                {analytics.categoryBreakdown.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                      <span className="text-sm text-gray-500">
                        {formatIndianCurrency(cat.amount)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${cat.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{cat.count} expense{cat.count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-gray-900">AI Recommendations</h3>
              </div>
              <div className="space-y-3">
                {analytics.insights.map((insight, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border ${getInsightBg(insight.type)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-xl">{insight.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{insight.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PieChart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-gray-600">
              Add some expenses to see AI-powered spending insights and recommendations.
            </p>
          </div>
        )}

        {/* AI Features Info */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
          <h4 className="font-semibold text-emerald-900 mb-2">🤖 AI-Powered Features</h4>
          <ul className="text-sm text-emerald-700 space-y-1">
            <li>• Smart expense categorization using NLP</li>
            <li>• Spending pattern recognition</li>
            <li>• Personalized savings recommendations</li>
            <li>• Trend analysis and alerts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

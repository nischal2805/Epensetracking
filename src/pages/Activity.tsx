import { useState, useEffect, useCallback } from 'react';
import { Activity as ActivityIcon, TrendingUp, UserPlus, Receipt } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { activityService } from '../services/firebase-service';
import type { ActivityLog } from '../types';
import { formatRelativeTime } from '../utils/date';
import { formatIndianCurrency } from '../utils/currency';

interface ActivityDetails {
  description?: string;
  amount?: number;
  groupName?: string;
}

export default function Activity() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await activityService.getUserActivity(user.id, 50);
      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user, loadActivities]);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'expense_added':
        return Receipt;
      case 'group_created':
        return UserPlus;
      default:
        return TrendingUp;
    }
  };

  const getActivityMessage = (activity: ActivityLog) => {
    const details = activity.details as ActivityDetails;

    switch (activity.action) {
      case 'expense_added':
        return (
          <>
            Added expense <strong>{details.description}</strong> for{' '}
            <strong>{formatIndianCurrency(details.amount || 0)}</strong>
          </>
        );
      case 'group_created':
        return (
          <>
            Created group <strong>{details.groupName}</strong>
          </>
        );
      default:
        return 'Activity';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
        <p className="text-sm text-gray-500 mt-1">Recent actions across all groups</p>
      </div>

      <div className="p-4">
        {activities.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <ActivityIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Activity Yet</h2>
            <p className="text-gray-600">
              Your recent actions will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.action);

              return (
                <div key={activity.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {getActivityMessage(activity)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

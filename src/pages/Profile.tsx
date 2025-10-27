import { User, Mail, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatIndianDate } from '../utils/date';

export default function Profile() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-8">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <User className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-1">{user.name}</h1>
          <p className="text-emerald-100">{user.email}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Account Information</h2>
          </div>

          <div className="divide-y divide-gray-200">
            <div className="px-4 py-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">{user.name}</p>
              </div>
            </div>

            <div className="px-4 py-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>

            <div className="px-4 py-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium text-gray-900">{formatIndianDate(user.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">About</h2>
          </div>
          <div className="px-4 py-4 space-y-2 text-sm text-gray-600">
            <p>
              <strong>Smart Expense Sharing System</strong> helps you track and split expenses
              with friends and family seamlessly.
            </p>
            <p>Features hybrid database architecture with:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Supabase PostgreSQL for structured data</li>
              <li>Firebase Firestore for activity logs</li>
              <li>Firebase Storage for receipts</li>
              <li>NLP-powered text input parsing</li>
              <li>Simulated OCR receipt scanning</li>
            </ul>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

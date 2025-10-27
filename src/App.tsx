import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import AddExpense from './pages/AddExpense';
import Activity from './pages/Activity';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';
import CreateGroupModal from './components/CreateGroupModal';

function AppContent() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [addExpenseGroupId, setAddExpenseGroupId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <Login onSwitchToSignup={() => setAuthMode('signup')} />
    ) : (
      <Signup onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  if (addExpenseGroupId || (activeTab === 'add' && selectedGroupId)) {
    return (
      <AddExpense
        groupId={addExpenseGroupId || selectedGroupId}
        onBack={() => {
          setAddExpenseGroupId(null);
          if (activeTab === 'add') {
            setActiveTab('groups');
          }
        }}
        onSuccess={() => {
          setAddExpenseGroupId(null);
          if (selectedGroupId) {
            setActiveTab('groups');
          } else {
            setActiveTab('groups');
          }
        }}
      />
    );
  }

  if (selectedGroupId) {
    return (
      <GroupDetail
        groupId={selectedGroupId}
        onBack={() => setSelectedGroupId(null)}
        onAddExpense={(groupId) => setAddExpenseGroupId(groupId)}
      />
    );
  }

  return (
    <>
      {activeTab === 'groups' && (
        <Groups
          onSelectGroup={setSelectedGroupId}
          onCreateGroup={() => setShowCreateGroup(true)}
        />
      )}
      {activeTab === 'add' && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20 px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Expense</h2>
            <p className="text-gray-600 mb-6">Please select a group first to add an expense</p>
            <button
              onClick={() => setActiveTab('groups')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go to Groups
            </button>
          </div>
        </div>
      )}
      {activeTab === 'activity' && <Activity />}
      {activeTab === 'profile' && <Profile />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onSuccess={() => {
            setShowCreateGroup(false);
            setActiveTab('groups');
          }}
        />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

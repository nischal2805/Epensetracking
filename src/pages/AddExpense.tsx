import { useState } from 'react';
import { ArrowLeft, Edit3, MessageSquare, Camera } from 'lucide-react';
import ManualExpenseForm from '../components/ManualExpenseForm';
import NLPExpenseForm from '../components/NLPExpenseForm';
import ReceiptUploadForm from '../components/ReceiptUploadForm';

interface AddExpenseProps {
  groupId: string | null;
  onBack: () => void;
  onSuccess: () => void;
}

type InputMethod = 'manual' | 'nlp' | 'receipt';

export default function AddExpense({ groupId, onBack, onSuccess }: AddExpenseProps) {
  const [inputMethod, setInputMethod] = useState<InputMethod>('manual');

  const methods = [
    { id: 'manual' as InputMethod, label: 'Manual', icon: Edit3 },
    { id: 'nlp' as InputMethod, label: 'Text', icon: MessageSquare },
    { id: 'receipt' as InputMethod, label: 'Receipt', icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Add Expense</h1>
          <div className="w-10"></div>
        </div>

        <div className="flex space-x-2">
          {methods.map((method) => {
            const Icon = method.icon;
            const isActive = inputMethod === method.id;

            return (
              <button
                key={method.id}
                onClick={() => setInputMethod(method.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-sm font-medium">{method.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {inputMethod === 'manual' && (
          <ManualExpenseForm groupId={groupId} onSuccess={onSuccess} onCancel={onBack} />
        )}
        {inputMethod === 'nlp' && (
          <NLPExpenseForm groupId={groupId} onSuccess={onSuccess} onCancel={onBack} />
        )}
        {inputMethod === 'receipt' && (
          <ReceiptUploadForm groupId={groupId} onSuccess={onSuccess} onCancel={onBack} />
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Loader2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { groupService, expenseService } from '../services/supabase-service';
import { activityService, receiptService, simulateOCR } from '../services/firebase-service';
import type { GroupMember, ExpenseCategory } from '../types';
import { formatIndianCurrency } from '../utils/currency';

interface ReceiptUploadFormProps {
  groupId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ReceiptUploadForm({ groupId, onSuccess, onCancel }: ReceiptUploadFormProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    amount: number;
    merchant: string;
    date: string;
  } | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: ExpenseCategory[] = ['Food', 'Entertainment', 'Travel', 'Shopping', 'Bills', 'Other'];

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);

    setProcessing(true);
    try {
      const data = await simulateOCR(selectedFile);
      setExtractedData(data);
    } catch (err) {
      setError('Failed to process receipt');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!groupId || !user || !file || !extractedData) return;

    setError('');
    setLoading(true);

    try {
      const receipt = await receiptService.uploadReceipt(
        file,
        'temp',
        user.id,
        extractedData
      );

      const expense = await expenseService.createExpense({
        group_id: groupId,
        description: `Receipt from ${extractedData.merchant}`,
        amount: extractedData.amount,
        category,
        date: extractedData.date,
        paid_by: user.id,
        receipt_url: receipt.imageUrl,
        input_method: 'receipt',
      });

      const splitAmount = extractedData.amount / members.length;
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
          description: `Receipt from ${extractedData.merchant}`,
          amount: extractedData.amount,
          inputMethod: 'receipt',
        }
      );

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        {!file ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Upload or take a photo of your receipt</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center space-x-2"
              >
                <Upload className="w-5 h-5" />
                <span>Choose File</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {preview && (
              <div className="mb-4">
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full rounded-lg border border-gray-200"
                />
              </div>
            )}

            {processing && (
              <div className="flex items-center justify-center space-x-3 py-8">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                <span className="text-gray-600">Processing receipt...</span>
              </div>
            )}

            {extractedData && !processing && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Check className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-900">Receipt Processed</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Merchant:</span>
                      <span className="font-semibold text-gray-900">{extractedData.merchant}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold text-gray-900">
                        {formatIndianCurrency(extractedData.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-semibold text-gray-900">{extractedData.date}</span>
                    </div>
                  </div>
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

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      setExtractedData(null);
                      setError('');
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Expense'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Receipt scanning uses simulated OCR for demo purposes.
          In production, this would integrate with real OCR services like Google Cloud Vision or AWS Textract.
        </p>
      </div>
    </div>
  );
}

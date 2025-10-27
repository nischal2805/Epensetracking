# Quick Start Guide

Get your Smart Expense Sharing System up and running in 5 minutes!

## Prerequisites

- Node.js 18 or higher installed
- Supabase account (already configured ✓)
- Firebase project (see FIREBASE_SETUP.md)

## 1. Install Dependencies

```bash
npm install
```

## 2. Verify Environment Variables

Check `.env` file contains:

```env
# Supabase (Already configured ✓)
VITE_SUPABASE_URL=https://zbwpqojxejlhosmdokkx.supabase.co
VITE_SUPABASE_ANON_KEY=your_key

# Firebase (Update with your project values)
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser (mobile view recommended)

## 4. Test the Application

### Sign Up
1. Click "Sign Up"
2. Enter name: `Rahul Sharma`
3. Enter email: `rahul@example.com`
4. Enter password: `password123`
5. Click "Sign Up"

### Create First Group
1. Click "+" button on Groups screen
2. Enter group name: `Mumbai Trip`
3. Click "Create Group"

### Add Expense - Manual Method
1. Select "Mumbai Trip" group
2. Click "+" floating button
3. Select "Manual" tab
4. Fill in:
   - Description: `Hotel booking`
   - Amount: `3500`
   - Category: `Travel`
   - Date: Today
   - Paid by: Select yourself
   - Split type: Equal
5. Click "Add Expense"

### Add Expense - NLP Method
1. Click "+" button or bottom "Add" tab
2. Select "Text" tab
3. Type: `I paid 450 for dinner at Swiggy`
4. Click "Parse with AI"
5. Review parsed data
6. Click "Confirm & Add"

### Add Expense - Receipt Method
1. Click "+" button
2. Select "Receipt" tab
3. Click "Choose File" and upload any image
4. Wait 2 seconds for simulated OCR
5. Review extracted data
6. Select category
7. Click "Add Expense"

### View Balances
1. In group detail, switch to "Balances" tab
2. See who owes you and who you owe

### Check Activity
1. Tap "Activity" in bottom navigation
2. See all your recent actions

## 5. Mobile Testing

For best experience, test in mobile view:

### Chrome DevTools
1. Press F12
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select iPhone 12 Pro or similar (390px width)
4. Refresh page

### Physical Device
1. Find your local IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
2. Start dev server: `npm run dev -- --host`
3. Open `http://YOUR_IP:5173` on mobile device

## Database Features to Test

### Supabase (SQL)
- User profile creation
- Group creation and member management
- Expense CRUD operations
- Balance calculations with user_balances view
- Row Level Security (try accessing other users' data - it should fail!)

### Firebase (NoSQL)
- Activity logs (check Firebase Console → Firestore → activityLogs)
- Receipt storage (check Firebase Console → Storage → receipts)
- NLP cache (check Firestore → nlpCache)

## Common Issues

### "Cannot connect to Supabase"
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct
- Check internet connection
- Supabase project should be active

### "Firebase is not configured"
- Update Firebase credentials in .env
- See FIREBASE_SETUP.md for detailed setup
- For testing, demo credentials work but won't persist data

### "NLP parsing gives wrong results"
- NLP parser uses pattern matching, not AI
- Try examples from the UI
- Supported patterns:
  - "I paid X for Y"
  - "Spent X on Y"
  - "Paid ₹X for Y"

### "Receipt upload fails"
- Firebase Storage must be configured
- Check FIREBASE_SETUP.md for security rules
- OCR is simulated (2-second delay, random data)

## Development Commands

```bash
# Start dev server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```

## Next Steps

1. **Add More Members**: In group settings, add members by email
2. **Test Split Types**: Try custom splits with different amounts
3. **Explore Categories**: Add expenses in different categories
4. **Check Balances**: See automatic debt simplification
5. **View Activity**: Monitor all actions in Activity feed

## Mobile Gestures

- **Pull to refresh**: On Groups list
- **Swipe to delete**: (Coming soon) On expense items
- **Long press**: (Coming soon) On group for options

## Pro Tips

### Indian Rupee Formatting
- Enter amounts like: `1000`, `1500.50`
- Display shows: `₹1,000.00`, `₹1,500.50`
- Large amounts use lakhs/crores notation

### NLP Examples That Work Well
- "I paid 500 for lunch"
- "Spent 1200 on movie yesterday"
- "Paid ₹350 for cab"
- "Split 2000 for grocery"

### Categories Auto-Detection
- "dinner", "lunch" → Food
- "movie", "concert" → Entertainment
- "taxi", "uber" → Travel
- "grocery", "shopping" → Shopping
- "rent", "electricity" → Bills

## Need Help?

1. Check README.md for full documentation
2. Review FIREBASE_SETUP.md for Firebase configuration
3. Inspect browser console for errors
4. Check Supabase logs in dashboard
5. Verify Firebase Console for data

## What's Next?

Try building:
- Settlement tracking
- Group chat
- Budget limits
- Recurring expenses
- Export to PDF
- Multi-currency support

Happy expense tracking! 🎉

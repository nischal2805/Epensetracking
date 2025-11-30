# Smart Expense Sharing System

A mobile-first expense sharing application built with **hybrid database architecture** combining SQL (Supabase) and NoSQL (Firebase) for optimal performance and flexibility.

## 🚀 Features

### Core Functionality
- **Group Management**: Create and manage expense sharing groups
- **Three Expense Entry Methods**:
  - Manual Entry: Traditional form-based input
  - NLP Text Input: Natural language parsing (e.g., "I paid 500 for dinner")
  - Receipt Upload: Simulated OCR extraction from images
- **Smart Balance Calculation**: Automatic debt simplification
- **Activity Feed**: Real-time logging of all actions
- **Indian Localization**: Rupee formatting with lakhs/crores notation

### 🤖 AI-Powered Features
- **Smart Categorization**: AI-powered expense categorization using NLP
- **Spending Insights**: Intelligent spending pattern recognition
- **Personalized Recommendations**: AI-generated savings tips
- **Trend Analysis**: Automatic detection of spending trends

### Technical Highlights
- **Hybrid Database Architecture**:
  - Supabase PostgreSQL for structured data (users, groups, expenses, splits)
  - Firebase Firestore for activity logs and NLP cache
  - Firebase Storage for receipt images
- **Mobile-First Design**: Optimized for 375px-428px viewports
- **Bottom Navigation**: Native app-like experience
- **Row Level Security**: Supabase RLS for data protection
- **TypeScript**: Full type safety across the stack

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md) | Complete database schema, normalization analysis, and ER diagrams |
| [TEACHER_GUIDE.md](TEACHER_GUIDE.md) | Evaluation criteria, demo guide, and viva questions |
| [FIREBASE_SETUP.md](FIREBASE_SETUP.md) | Step-by-step Firebase configuration |
| [QUICKSTART.md](QUICKSTART.md) | Quick start guide for testing |
| [.env.example](.env.example) | Environment variables template |

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **SQL Database**: Supabase (PostgreSQL)
- **NoSQL Database**: Firebase (Firestore + Storage)
- **Authentication**: Supabase Auth

## 📊 Database Schema

### Supabase (SQL)
```sql
users (id, email, name, created_at)
groups (id, name, created_by, created_at)
group_members (group_id, user_id, joined_at)
expenses (id, group_id, description, amount, category, date, paid_by, receipt_url, input_method, created_at)
expense_splits (id, expense_id, user_id, share_amount)
user_balances (view for calculating net balances)
```

### Firebase (NoSQL)
```javascript
receipts: { expenseId, userId, imageUrl, metadata }
activityLogs: { userId, groupId, action, details, timestamp }
nlpCache: { inputText, parsedResult, confidence, timestamp }
```

See [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md) for complete schema details and normalization analysis.

## ⚡ Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account
- Firebase account

### Installation

1. Clone and install dependencies:
```bash
git clone <repository-url>
cd Epensetracking
npm install
```

2. Copy environment template and configure:
```bash
cp .env.example .env
# Edit .env with your Supabase and Firebase credentials
```

3. See [.env.example](.env.example) for all required environment variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
```

4. Start development server:
```bash
npm run dev
```
```

## Usage Guide

### 1. Authentication
- Sign up with email and password
- User profile automatically created in Supabase

### 2. Create a Group
- Tap "+" button on Groups tab
- Enter group name (e.g., "Goa Trip", "Roommates")
- Add members by email

### 3. Add Expenses

#### Manual Entry
- Fill form with description, amount, category, date
- Select payer from group members
- Choose equal or custom split

#### NLP Text Input
- Type naturally: "I paid 500 for dinner at Swiggy"
- AI parses amount, description, category, date
- Preview and confirm

#### Receipt Upload
- Upload/capture receipt image
- Simulated OCR extracts amount, merchant, date
- Edit category and confirm

### 4. View Balances
- Switch to "Balances" tab in group
- See who owes you (green) and who you owe (red)
- Net amounts calculated automatically

### 5. Activity Feed
- View all actions across groups
- See expense additions, group creations
- Timestamps in relative format

## NLP Parsing Patterns

The system understands natural language inputs:
- `"I paid 500 for dinner"`
- `"Spent 1200 on movie tickets yesterday"`
- `"Paid ₹350 for cab to airport"`
- `"Split 2000 for grocery shopping"`

### Auto-Categorization
- breakfast/lunch/dinner → Food
- movie/concert → Entertainment
- uber/taxi/bus → Travel
- grocery/shopping → Shopping
- rent/electricity → Bills

## Indian Localization

- Currency: ₹ (Rupees) with paisa precision
- Number format: Lakhs and Crores (₹1,00,000 not ₹100,000)
- Date format: DD/MM/YYYY
- Merchant names: Swiggy, Zomato, Big Bazaar, DMart, etc.

## Mobile Optimizations

- Touch targets: Minimum 48px
- Bottom sheet modals
- Pull-to-refresh on lists
- Swipe gestures (future)
- Loading skeletons
- Native animations
- Safe area insets

## Architecture Benefits

### Why Hybrid Database?

**Supabase (SQL) for:**
- Structured data with relationships
- ACID transactions for financial data
- Complex queries and joins
- Row Level Security

**Firebase (NoSQL) for:**
- Unstructured activity logs
- File storage (receipts)
- Flexible schema (NLP cache)
- Real-time updates (future)

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth)
├── lib/                # Database clients (Supabase, Firebase)
├── pages/              # Main screens
├── services/           # API service layers
├── types/              # TypeScript definitions
└── utils/              # Helper functions (currency, date, NLP)
```

## Future Enhancements

- [ ] Real OCR integration (Google Cloud Vision)
- [ ] Voice input parsing
- [ ] Push notifications
- [ ] Group chat
- [ ] Settlement payment tracking
- [ ] Export to Excel/PDF
- [ ] Multi-currency support
- [ ] Recurring expenses
- [ ] Budget limits

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build

# Preview production build
npm run preview
```

## License

MIT

## Credits

Built with modern web technologies and hybrid database architecture for optimal performance and scalability.

# Firebase Setup Guide

This application uses Firebase for NoSQL storage (Firestore) and file storage (Firebase Storage). Follow these steps to set up your Firebase project.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `expense-sharing` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Register Web App

1. In your Firebase project, click the web icon (</>) to add a web app
2. Enter app nickname: `Expense Sharing Web`
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object

## Step 3: Enable Firestore Database

1. In Firebase Console, go to "Build" → "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" (we'll add security rules)
4. Select a Cloud Firestore location (choose closest to India, e.g., `asia-south1`)
5. Click "Enable"

## Step 4: Configure Security Rules

In Firestore Database → Rules, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Activity Logs - authenticated users can read their own and write new
    match /activityLogs/{logId} {
      allow read: if request.auth != null &&
                  (resource.data.userId == request.auth.uid ||
                   resource.data.groupId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.groups);
      allow create: if request.auth != null &&
                    request.resource.data.userId == request.auth.uid;
    }

    // Receipts - users can read/write their own receipts
    match /receipts/{receiptId} {
      allow read: if request.auth != null &&
                  resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
                    request.resource.data.userId == request.auth.uid;
    }

    // NLP Cache - readable by all authenticated users
    match /nlpCache/{cacheId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }

    // Voice Inputs - users can read/write their own
    match /voiceInputs/{inputId} {
      allow read: if request.auth != null &&
                  resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
                    request.resource.data.userId == request.auth.uid;
    }
  }
}
```

## Step 5: Enable Firebase Storage

1. Go to "Build" → "Storage"
2. Click "Get started"
3. Start in production mode
4. Choose same location as Firestore
5. Click "Done"

## Step 6: Configure Storage Rules

In Storage → Rules, paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Receipts - users can upload their own receipts
    match /receipts/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                   request.auth.uid == userId;
    }

    // Voice files - users can upload their own
    match /voice/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                   request.auth.uid == userId;
    }
  }
}
```

## Step 7: Update Environment Variables

Copy your Firebase config values to `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Step 8: Create Firestore Indexes (Optional but Recommended)

For better query performance, create these composite indexes:

### activityLogs
- Collection: `activityLogs`
- Fields: `userId` (Ascending), `timestamp` (Descending)

### activityLogs (by group)
- Collection: `activityLogs`
- Fields: `groupId` (Ascending), `timestamp` (Descending)

### nlpCache
- Collection: `nlpCache`
- Fields: `inputText` (Ascending), `timestamp` (Descending)

To create indexes:
1. Go to Firestore Database → Indexes
2. Click "Add index"
3. Enter collection name and fields
4. Click "Create"

## Verification

Test your setup:

1. Sign up in the application
2. Create a group
3. Add an expense with receipt upload
4. Check Firebase Console:
   - Firestore → Data: See `activityLogs` collection
   - Storage → Files: See receipt image in `receipts/` folder

## Authentication Note

This app uses **Supabase Auth** (not Firebase Auth). Firebase is only used for:
- Firestore (activity logs, NLP cache)
- Storage (receipt images)

The Firebase authentication is **not enabled** and **not needed**.

## Troubleshooting

### CORS Errors
If you see CORS errors when uploading files:
1. Install `gsutil` from Google Cloud SDK
2. Create `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST"],
    "maxAgeSeconds": 3600
  }
]
```
3. Run: `gsutil cors set cors.json gs://your-bucket-name`

### Security Rules Not Working
- Make sure you're using Supabase Auth tokens (the app handles this)
- Check Firebase Console → Authentication is NOT enabled
- Verify rules are published (click "Publish" in Rules editor)

### Storage Upload Fails
- Check storage rules allow upload to `/receipts/{userId}/` path
- Verify file size is under 5MB
- Ensure user is authenticated

## Production Checklist

- [ ] Firebase project created
- [ ] Firestore enabled with security rules
- [ ] Storage enabled with security rules
- [ ] Composite indexes created
- [ ] Environment variables updated
- [ ] Test file upload works
- [ ] Test activity logging works
- [ ] Monitor Firebase usage in Console

## Cost Considerations

Firebase Free Tier (Spark Plan):
- Firestore: 50,000 reads/day, 20,000 writes/day
- Storage: 5GB stored, 1GB downloaded/day
- Functions: Not used in this app

This should be sufficient for development and small-scale production use.

For production, consider upgrading to Blaze (Pay as you go) plan.

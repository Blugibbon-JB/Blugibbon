# Firebase Setup Guide

Follow these steps to connect your Availability Calendar 2.0 to Firebase.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Project name: `blugibbon-calendar` (or your preferred name)
4. Click **"Continue"** through the setup wizard
5. Accept analytics settings and complete project creation

## Step 2: Register Your App

1. In Firebase Console, click the **Web icon** (</>) to add a web app
2. App name: `availability-calendar-2.0`
3. Click **"Register app"**
4. Copy the Firebase config object (you'll need this in step 4)

## Step 3: Enable Google Authentication

1. Go to **Authentication** in Firebase Console
2. Click **"Get Started"** or **"Sign-in method"**
3. Click **Google**
4. Enable it and set a support email
5. Click **"Save"**

## Step 4: Create Firestore Database

1. Go to **Firestore Database** in Firebase Console
2. Click **"Create Database"**
3. Choose **"Start in test mode"** (for development)
   - For production, use **"Production mode"** and set security rules
4. Select your preferred location (closer to your users)
5. Click **"Create Database"**

## Step 5: Get Your Firebase Configuration

In your Firebase Console:
1. Click the **Settings icon** (gear) → **Project Settings**
2. Scroll down to find your Firebase config
3. Copy the config object:

```javascript
{
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

## Step 6: Configure Environment Variables

1. In the `calendar-2.0` folder, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the values from your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=YOUR_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
   VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
   VITE_FIREBASE_APP_ID=YOUR_APP_ID
   ```

## Step 7: Test It Out

1. Start development server:
   ```bash
   npm run dev
   ```

2. Click **"Sign in with Google"**
3. Select your Google account
4. You should now be able to add doctors and manage availability!

## Step 8 (Production): Set Security Rules

When deploying to production, secure your Firestore:

1. Go to **Firestore Database** → **Rules**
2. Replace with:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth.uid == userId;
       }
     }
   }
   ```
3. Click **"Publish"**

This ensures:
- Users can only access their own data
- Data is completely private
- No cross-user data leaks

## Troubleshooting

### "Firebase is not defined"
- Check `.env` file has correct values
- Run `npm install` to ensure Firebase is installed
- Clear browser cache and reload

### "Authentication failed" / "Sign-in not working"
- Verify Google auth is enabled in Firebase Console
- Check OAuth consent screen is configured
- Try a different browser

### "Permission denied" errors
- Check Firestore Rules are set correctly (Step 8)
- Verify user is signed in (check browser console)
- Ensure Firestore database exists and is active

### Data not syncing
- Check browser console for errors (DevTools)
- Verify internet connection
- Try refreshing the page
- Check that Firestore database quota isn't exceeded

## Support

For help:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

## Next Steps

After Firebase is set up:

1. **Deploy to production**
   - Set Firestore security rules (Step 8)
   - Update `.env` with production values
   - Deploy to Vercel, Firebase Hosting, or your preferred host

2. **Share with your team**
   - Each team member signs in with their Google account
   - They'll see only their own data
   - All data syncs in real-time

3. **Backup and restore**
   - Use "Export Backup" to download JSON files
   - Use "Import Backup" to restore from backups
   - Backups are compatible with version 1.0!

# Cloud Storage Setup Guide for BLUGIBBON Calendar

## Overview

The availability calendar now supports cloud storage to prevent data loss due to browser storage limitations. Data is synced across devices and backed up to the cloud.

## Features

- ☁️ **Cloud Sync**: Real-time sync to Firebase Firestore
- 🔐 **Google Sign-in**: Secure authentication
- 💾 **Auto Backup**: Automatic periodic backups
- 📥 **Import/Export**: Download and import JSON backups
- 🔄 **Offline Support**: Works offline, syncs when online
- 🌐 **Cross-Device**: Access from any browser after signing in

## Setup Instructions

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a new project"** or select an existing project
3. Project name: `blugibbon-calendar`
4. Accept the terms and create

### Step 2: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Copy your Firebase config object that looks like this:
   ```javascript
   {
     apiKey: "AIzaSy...",
     authDomain: "blugibbon-calendar.firebaseapp.com",
     projectId: "blugibbon-calendar",
     storageBucket: "blugibbon-calendar.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   }
   ```

### Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get Started"**
3. Enable **Google** sign-in provider
4. Set project support email and save

### Step 4: Create Firestore Database

1. Go to **Firestore Database**
2. Click **"Create Database"**
3. Choose **"Start in test mode"** (or production with proper rules)
4. Select location close to your users
5. Create the database

### Step 5: Update Configuration in HTML

1. Open `availability.html`
2. Find the `CloudStorage.init()` function around line 610
3. Replace the `firebaseConfig` object with your actual config from Step 2

**Example:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDEMO",  // ← Replace with your actual key
  authDomain: "blugibbon-calendar.firebaseapp.com",
  projectId: "blugibbon-calendar",
  storageBucket: "blugibbon-calendar.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 6: Test Cloud Storage

1. Open the calendar page
2. Click the **☁️ Cloud** button in the top bar
3. Click **"Sign In (Google)"**
4. After signing in, try adding/editing a doctor
5. Click **"Sync Now"** to manually sync to cloud
6. Data should now appear in Firebase Firestore

## User Guide

### For Team Members

#### Signing In
1. Click the **☁️ Cloud** button
2. Click **"Sign In (Google)"**
3. Select your Google account
4. You're now synced!

#### Adding Doctors
- Add doctors normally - they'll automatically sync to cloud
- No need to manually save

#### Exporting Data
- Click **"Export"** to download a JSON backup to your computer
- Save it somewhere safe as a backup

#### Importing Data
- Click **"Import"** to load a previously exported backup
- Select your `.json` file to restore

#### Manual Sync
- Click **"Sync Now"** to force immediate sync
- Useful if you suspect connection issues

### Data Privacy

- Each user has their own private data in the cloud
- Data is stored in your Firebase project
- You control who has access
- Data is encrypted in transit (HTTPS)

## Firestore Security Rules (Production)

For production use, add security rules to restrict access:

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

3. Click **Publish**

This ensures:
- Users can only read/write their own data
- Data is fully private

## Troubleshooting

### "Firebase is not defined"
- Ensure Firebase SDK links are loaded (check browser console)
- Clear browser cache and reload

### "Authentication failed"
- Check Firebase Console → Authentication → Google provider is enabled
- Verify OAuth consent screen is configured

### "Sync failed"
- Check Firestore Database is created and active
- Check Firebase config is correct
- Check browser console for errors
- Verify internet connection

### Data not syncing
- Click "Sync Now" to force sync
- Check that user is signed in
- Check Firestore is active in Firebase Console
- Look for errors in browser DevTools Console

## Alternative: No Firebase Setup (Simple Backup)

If you don't want to use Firebase:

1. The calendar still uses **localStorage** by default
2. You can still **Export** and **Import** JSON backups
3. Share backups via email/Google Drive manually
4. This prevents loss but requires manual backup management

To use this approach:
- Skip the Firebase setup steps
- Users can still click "Export" to backup data
- Share the exported JSON file for backup
- Click "Import" to restore from backups

## Limitations

- Firebase free tier has limits (50K reads/writes per day)
- For heavy usage, upgrade to Firebase paid plan
- LocalStorage limit still applies (~5-10MB per browser)
- Cloud sync only works when online

## Support

For issues:
1. Check browser console (DevTools) for error messages
2. Check Firebase Console logs
3. Verify Firebase config is correct
4. Test with a simple document in Firestore

## Future Enhancements

Potential additions:
- Real-time collaboration (see others' changes live)
- Data version history/restore points
- Scheduled automatic exports
- Team member access control
- Data encryption at rest

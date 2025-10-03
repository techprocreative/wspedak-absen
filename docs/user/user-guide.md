# User Guide

Welcome to the Attendance System User Guide! This comprehensive guide will help you understand and use all the features of our attendance management system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Marking Attendance](#marking-attendance)
4. [Face Recognition Setup](#face-recognition-setup)
5. [Viewing Attendance History](#viewing-attendance-history)
6. [Profile Management](#profile-management)
7. [Offline Mode](#offline-mode)
8. [Mobile App Usage](#mobile-app-usage)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

## Getting Started

### System Requirements

- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS 14+, Android 10+
- **Internet**: Required for initial setup and synchronization
- **Camera**: Required for face recognition feature
- **Storage**: At least 100MB available space

### First Time Login

1. Open your web browser and navigate to the system URL
2. Enter your email and password provided by your administrator
3. Click "Sign In"
4. Complete the initial setup wizard

![Login Screen](../images/screenshots/login-screen.png)

### Initial Setup Wizard

The first time you log in, you'll be guided through:

1. **Profile Setup**: Verify your personal information
2. **Face Recognition**: Set up facial recognition for quick check-ins
3. **Preferences**: Configure notification and display settings
4. **Tutorial**: Interactive tour of the main features

## Dashboard Overview

The dashboard is your main hub for attendance management. Here's what you'll see:

### Main Dashboard Areas

```
┌─────────────────────────────────────────────────────────────────┐
│  Attendance System                    [Profile] [Notifications] │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Quick Check   │  │   Today's       │  │   Weekly        │  │
│  │   In/Out        │  │   Status        │  │   Summary       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Recent        │  │   Attendance    │  │   Quick         │  │
│  │   Activity      │  │   Calendar      │  │   Actions       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Sync Status   │  │   Notifications │  │   Help          │  │
│  │   Indicator     │  │   Panel         │  │   & Support     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Dashboard Elements

1. **Quick Check In/Out**: Fast attendance marking with face recognition
2. **Today's Status**: Current day's attendance information
3. **Weekly Summary**: Overview of your week's attendance
4. **Recent Activity**: Latest attendance records and changes
5. **Attendance Calendar**: Visual calendar with attendance status
6. **Sync Status**: Shows online/offline status and synchronization progress
7. **Notifications**: Important alerts and system messages

## Marking Attendance

### Quick Check In/Out

The fastest way to mark your attendance:

1. **Click "Check In"** on the dashboard
2. **Choose Method**:
   - Face Recognition (recommended)
   - Manual Check In
3. **Confirm** your attendance

![Quick Check In](../images/screenshots/quick-checkin.png)

### Face Recognition Check In

1. Click "Check In with Face"
2. Position your face in the camera frame
3. Wait for the green confirmation checkmark
4. Your attendance is automatically recorded

![Face Recognition](../images/screenshots/face-recognition.png)

**Tips for Best Face Recognition:**
- Ensure good lighting
- Face the camera directly
- Remove glasses or hats if possible
- Keep a neutral expression

### Manual Check In/Out

1. Click "Manual Check In/Out"
2. Select the current time
3. Add location (optional)
4. Add notes (optional)
5. Click "Confirm"

### Editing Attendance Records

If you need to correct a mistake:

1. Go to "Attendance History"
2. Find the record you want to edit
3. Click the edit icon
4. Make your changes
5. Add a reason for the edit
6. Save the changes

**Note**: Some edits may require administrator approval.

## Face Recognition Setup

### Initial Face Enrollment

1. Navigate to "Profile" → "Face Recognition"
2. Click "Enroll New Face"
3. Allow camera access when prompted
4. Follow the on-screen instructions:
   - Position your face in the oval guide
   - Move slowly to capture different angles
   - Wait for the enrollment confirmation

### Face Recognition Best Practices

**For Successful Recognition:**
- Use consistent lighting conditions
- Maintain the same distance from camera
- Face the camera directly
- Remove accessories that obscure your face

**If Recognition Fails:**
- Try again with better lighting
- Remove glasses or hats
- Ensure your face is clearly visible
- Re-enroll your face if problems persist

### Managing Face Data

You can:
- **Add multiple face profiles** (different glasses, hairstyles)
- **Delete old face data**
- **Update face recognition** when your appearance changes
- **Test recognition** before using it for attendance

## Viewing Attendance History

### Attendance Calendar

The calendar view provides a visual overview:

- **Green**: Present days
- **Red**: Absent days
- **Yellow**: Late arrivals
- **Blue**: Holidays/Weekends

Click any date to see detailed information.

### Detailed Records View

1. Navigate to "Attendance History"
2. Use filters to find specific records:
   - Date range
   - Status (present, absent, late)
   - Location
3. Click on any record for details

![Attendance History](../images/screenshots/attendance-history.png)

### Exporting Attendance Data

1. Go to "Attendance History"
2. Apply your desired filters
3. Click "Export"
4. Choose format:
   - PDF (for reports)
   - Excel (for analysis)
   - CSV (for data import)

### Attendance Statistics

View your attendance statistics:
- **Total days worked**
- **Attendance percentage**
- **Average check-in time**
- **Late arrivals count**
- **Absent days count**

## Profile Management

### Personal Information

Update your personal details:

1. Go to "Profile" → "Personal Information"
2. Edit your details:
   - Name
   - Email
   - Phone number
   - Department
3. Save changes

### Notification Preferences

Control how you receive notifications:

1. Go to "Profile" → "Notifications"
2. Configure settings:
   - Email notifications
   - Browser notifications
   - Mobile push notifications
   - Daily summary emails

### Security Settings

Manage your account security:

1. Go to "Profile" → "Security"
2. You can:
   - Change password
   - Enable two-factor authentication
   - View login history
   - Manage active sessions

### Display Preferences

Customize your experience:

1. Go to "Profile" → "Preferences"
2. Configure:
   - Theme (light/dark)
   - Language
   - Time zone
   - Date format

## Offline Mode

The Attendance System works offline! Here's how:

### Automatic Offline Detection

The system automatically detects when you're offline and:
- Shows an offline indicator
- Enables offline functionality
- Queues your changes for later sync

### What Works Offline

✅ **Available Offline:**
- Check in/out
- View attendance history
- Edit profile information
- Face recognition (if previously enrolled)

❌ **Not Available Offline:**
- Real-time notifications
- New face enrollment
- Administrator functions

### Syncing When Back Online

1. When you reconnect to the internet
2. The system automatically syncs your changes
3. You'll see a "Syncing..." message
4. Once complete, all data is updated

### Manual Sync

If automatic sync doesn't work:

1. Click the sync status indicator
2. Select "Sync Now"
3. Wait for the sync to complete

## Mobile App Usage

### Installing the Mobile App

1. Open the system URL on your mobile browser
2. Tap "Add to Home Screen" (iOS) or "Install App" (Android)
3. Follow the installation prompts

### Mobile-Specific Features

- **Location-based check-ins**
- **Push notifications**
- **Offline mode with automatic sync**
- **Touch/Face ID for quick access**

### Mobile Navigation

The mobile app has a simplified interface:
- Bottom navigation bar for main features
- Swipe gestures for navigation
- Optimized for one-handed use

## Troubleshooting

### Common Issues and Solutions

#### Face Recognition Not Working

**Problem**: Face recognition fails repeatedly

**Solutions**:
1. Check camera permissions in browser settings
2. Ensure good lighting conditions
3. Remove glasses or hats
4. Re-enroll your face data
5. Try manual check-in as alternative

#### Cannot Check In/Out

**Problem**: Check in/out buttons are disabled

**Solutions**:
1. Verify you're within allowed check-in times
2. Check if you've already checked in/out for today
3. Ensure your account is active
4. Contact administrator if issue persists

#### Sync Issues

**Problem**: Changes not syncing to server

**Solutions**:
1. Check internet connection
2. Try manual sync
3. Clear browser cache and reload
4. Check if sync queue is full
5. Restart the application

#### Login Problems

**Problem**: Cannot log into the system

**Solutions**:
1. Verify correct email and password
2. Check if Caps Lock is on
3. Reset password if forgotten
4. Clear browser cookies
5. Try a different browser

#### Performance Issues

**Problem**: System is slow or unresponsive

**Solutions**:
1. Check internet connection speed
2. Clear browser cache
3. Close unnecessary browser tabs
4. Update browser to latest version
5. Restart your device

### Error Messages Explained

| Error Message | What It Means | What to Do |
|---------------|---------------|------------|
| "Face not recognized" | Face recognition failed | Try again or use manual check-in |
| "Outside check-in hours" | Current time is outside allowed hours | Contact administrator |
| "Sync failed" | Data couldn't be synchronized | Check connection and try manual sync |
| "Account inactive" | Your account is disabled | Contact administrator |
| "Storage quota exceeded" | Local storage is full | Clear browser data |

### Getting Help

If you need additional help:

1. **In-App Help**: Click the help icon (?) in the top right
2. **User Guide**: Access this guide from the help menu
3. **Contact Support**: Email support@yourcompany.com
4. **Administrator**: Contact your system administrator

## FAQ

### General Questions

**Q: Can I use the system on multiple devices?**
A: Yes! Your data syncs across all devices when you're online.

**Q: Is my face data secure?**
A: Yes, face data is encrypted and stored securely. It's never shared with third parties.

**Q: What happens if I forget to check out?**
A: The system will automatically check you out at the standard end time, but you can edit this later.

**Q: Can I edit my attendance records?**
A: Yes, but some edits may require administrator approval.

### Technical Questions

**Q: Does the system work offline?**
A: Yes, most features work offline and sync when you're back online.

**Q: What browsers are supported?**
A: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

**Q: Is there a mobile app?**
A: Yes, you can install the PWA on your mobile device for app-like experience.

### Privacy Questions

**Q: Who can see my attendance data?**
A: Only you and authorized administrators can view your attendance records.

**Q: Is my location tracked?**
A: Location is only recorded if you manually add it during check-in.

**Q: How long is my data stored?**
A: Attendance data is retained according to your company's data retention policy.

### Troubleshooting Questions

**Q: Why isn't face recognition working?**
A: Check lighting, camera permissions, and consider re-enrolling your face.

**Q: What if I lose internet connection?**
A: Continue using the system offline - it will sync when reconnected.

**Q: How do I reset my password?**
A: Click "Forgot Password" on the login page and follow the instructions.

---

## Keyboard Shortcuts

For power users, here are helpful keyboard shortcuts:

| Shortcut | Function |
|----------|----------|
| Ctrl + I | Quick Check In |
| Ctrl + O | Quick Check Out |
| Ctrl + H | Go to History |
| Ctrl + P | Go to Profile |
| Ctrl + S | Sync Now |
| Ctrl + ? | Show Help |

## Tips for Efficient Usage

1. **Set up face recognition** for fastest check-ins
2. **Enable notifications** to stay updated
3. **Check sync status** regularly when working offline
4. **Review attendance weekly** to catch any errors
5. **Keep profile updated** for accurate records

## Contact Information

- **Technical Support**: support@yourcompany.com
- **System Administrator**: admin@yourcompany.com
- **HR Department**: hr@yourcompany.com
- **Emergency IT Help**: +1-555-0123

---

Thank you for using the Attendance System! We're constantly working to improve your experience. If you have suggestions or feedback, please let us know.
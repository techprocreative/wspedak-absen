# Troubleshooting Guide

This guide helps you resolve common issues with the Attendance System. Follow these steps before contacting support.

## Table of Contents

1. [Quick Fixes](#quick-fixes)
2. [Login Issues](#login-issues)
3. [Face Recognition Problems](#face-recognition-problems)
4. [Attendance Tracking Issues](#attendance-tracking-issues)
5. [Sync and Offline Problems](#sync-and-offline-problems)
6. [Browser and Device Issues](#browser-and-device-issues)
7. [Mobile App Issues](#mobile-app-issues)
8. [Performance Problems](#performance-problems)
9. [Error Messages](#error-messages)
10. [Getting Additional Help](#getting-additional-help)

## Quick Fixes

Before diving into specific issues, try these universal solutions:

### 1. Refresh the Page
- Press `F5` or `Ctrl+R` (Windows) / `Cmd+R` (Mac)
- Or click the refresh button in your browser

### 2. Check Internet Connection
- Try loading other websites
- If on WiFi, try moving closer to the router
- If possible, try a different network

### 3. Clear Browser Cache
```
Chrome: Settings → Privacy → Clear browsing data
Firefox: Settings → Privacy → Clear Data
Safari: Develop → Empty Caches
Edge: Settings → Privacy → Clear browsing data
```

### 4. Restart Browser
- Close all browser windows
- Wait 10 seconds
- Reopen the browser

### 5. Try a Different Browser
- If using Chrome, try Firefox
- If using Safari, try Chrome
- This helps identify if it's a browser-specific issue

## Login Issues

### Problem: Can't log in with correct credentials

**Symptoms:**
- "Invalid credentials" error despite correct password
- Login page refreshes without error message
- Stuck on loading screen

**Solutions:**

1. **Check Caps Lock**
   - Ensure Caps Lock is off
   - Password is case-sensitive

2. **Clear Browser Data**
   ```
   Chrome: Settings → Privacy → Clear browsing data → Cookies and site data
   Firefox: Settings → Privacy → Clear Data → Cookies
   ```

3. **Try Incognito/Private Mode**
   - Open incognito window
   - Try logging in there
   - If it works, clear browser cache/cookies

4. **Reset Password**
   - Click "Forgot Password"
   - Follow email instructions
   - Create a new password

5. **Check Account Status**
   - Contact administrator
   - Verify account is active
   - Confirm correct email address

### Problem: Login page won't load

**Symptoms:**
- Blank white page
- "Page not found" error
- Loading spinner never stops

**Solutions:**

1. **Check URL**
   - Verify correct system URL
   - Ensure using `https://` if required
   - Check for typos

2. **Check Internet Connection**
   - Try other websites
   - Restart router if needed
   - Try different network

3. **Disable Browser Extensions**
   - Turn off ad blockers
   - Disable security extensions
   - Try again

4. **Check System Status**
   - Contact administrator
   - Check if system is down for maintenance

## Face Recognition Problems

### Problem: Face recognition not working

**Symptoms:**
- "Face not recognized" error
- Camera doesn't turn on
- Low confidence score

**Solutions:**

1. **Check Camera Permissions**
   ```
   Chrome: Settings → Privacy → Camera → Allow site access
   Firefox: Preferences → Privacy & Security → Camera
   Safari: Preferences → Websites → Camera
   ```

2. **Improve Lighting Conditions**
   - Ensure even, bright lighting
   - Avoid backlighting
   - Reduce shadows on face

3. **Position Face Correctly**
   - Face camera directly
   - Maintain proper distance (arm's length)
   - Keep face in the oval guide

4. **Remove Obstructions**
   - Take off glasses
   - Remove hats or headwear
   - Pull back hair from face

5. **Re-enroll Face**
   - Go to Profile → Face Recognition
   - Delete existing face data
   - Enroll new face data

6. **Check Camera Hardware**
   - Test camera with other applications
   - Ensure camera is not damaged
   - Try external camera if available

### Problem: Camera access denied

**Symptoms:**
- "Camera access denied" message
- No camera feed visible
- Browser blocks camera

**Solutions:**

1. **Grant Camera Permission**
   - Click camera icon in address bar
   - Select "Allow"
   - Refresh page

2. **Check Browser Settings**
   - Go to browser privacy settings
   - Ensure camera is enabled
   - Check site-specific permissions

3. **Restart Browser**
   - Close all browser windows
   - Reopen browser
   - Try again

4. **Try Different Browser**
   - Some browsers have stricter camera policies
   - Try Chrome or Firefox

## Attendance Tracking Issues

### Problem: Can't check in/out

**Symptoms:**
- Check in/out buttons disabled
- "Outside check-in hours" error
- No response when clicking buttons

**Solutions:**

1. **Check Time Restrictions**
   - Verify current time is within allowed hours
   - Contact administrator about time policies
   - Check if it's a holiday

2. **Verify Account Status**
   - Ensure account is active
   - Check if you're already checked in/out
   - Verify employment status

3. **Check Internet Connection**
   - Some features require internet
   - Try manual check-in if offline
   - Wait for sync if connectivity issues

4. **Clear Browser Cache**
   - Old data can cause issues
   - Clear cache and cookies
   - Restart browser

5. **Try Manual Entry**
   - Use manual check-in/out option
   - Add notes explaining the issue
   - Contact administrator if needed

### Problem: Attendance records incorrect

**Symptoms:**
- Wrong check-in/out times
- Missing records
- Incorrect status

**Solutions:**

1. **Edit the Record**
   - Go to Attendance History
   - Find the incorrect record
   - Click edit and correct

2. **Check for Sync Issues**
   - Look for sync conflicts
   - Resolve any conflicts
   - Manually sync if needed

3. **Verify Time Zone**
   - Check profile time zone settings
   - Ensure correct local time
   - Contact administrator if wrong

4. **Review Auto-Checkouts**
   - System may auto-checkout at standard time
   - Edit if this is incorrect
   - Add notes explaining

## Sync and Offline Problems

### Problem: Changes not syncing

**Symptoms:**
- "Sync failed" message
- Changes only visible locally
- Sync status shows pending

**Solutions:**

1. **Check Internet Connection**
   - Verify you're online
   - Test other websites
   - Try different network

2. **Manual Sync**
   - Click sync status indicator
   - Select "Sync Now"
   - Wait for completion

3. **Check Sync Queue**
   - Too many pending items can slow sync
   - Wait for queue to process
   - Contact admin if queue is stuck

4. **Clear Browser Data**
   - Corrupted data can prevent sync
   - Clear cache (not cookies)
   - Restart browser

5. **Check Storage Space**
   - Low storage can prevent sync
   - Clear browser storage
   - Free up disk space

### Problem: Stuck in offline mode

**Symptoms:**
- Shows offline when connected
- Won't sync when online
- Offline banner won't disappear

**Solutions:**

1. **Verify Connection**
   - Test other websites
   - Check WiFi/cellular connection
   - Restart router if needed

2. **Refresh Connection Status**
   - Click sync status indicator
   - Select "Check Connection"
   - Wait for status update

3. **Restart Browser**
   - Close all windows
   - Wait 10 seconds
   - Reopen browser

4. **Clear Browser Cache**
   - Old offline data can cause issues
   - Clear cache and cookies
   - Try again

## Browser and Device Issues

### Problem: System running slowly

**Symptoms:**
- Slow page loads
- Delayed button responses
- Laggy animations

**Solutions:**

1. **Close Other Tabs**
   - Too many tabs use memory
   - Close unnecessary tabs
   - Restart browser

2. **Clear Browser Cache**
   - Full cache slows performance
   - Clear browsing data
   - Restart browser

3. **Update Browser**
   - Old versions may be slow
   - Check for updates
   - Install latest version

4. **Check Device Resources**
   - Close other applications
   - Restart device
   - Check available memory

5. **Disable Extensions**
   - Some extensions slow pages
   - Disable temporarily
   - Test performance

### Problem: Display issues

**Symptoms:**
- Overlapping elements
- Missing buttons
- Incorrect layout

**Solutions:**

1. **Check Browser Zoom**
   - Reset zoom to 100%
   - Press `Ctrl+0` (Windows) / `Cmd+0` (Mac)
   - Adjust if needed

2. **Update Browser**
   - Old browsers may have rendering issues
   - Update to latest version
   - Try again

3. **Clear Browser Cache**
   - Old CSS files can cause issues
   - Clear cache and cookies
   - Hard refresh (`Ctrl+F5`)

4. **Try Different Browser**
   - Some browsers have rendering differences
   - Try Chrome or Firefox
   - Compare display

## Mobile App Issues

### Problem: App won't install

**Symptoms:**
- No "Add to Home Screen" option
- Installation fails
- App crashes after install

**Solutions:**

1. **Check Browser Support**
   - Use Safari on iOS
   - Use Chrome on Android
   - Update browser if needed

2. **Clear Browser Data**
   - Old data can prevent installation
   - Clear cache and cookies
   - Try again

3. **Free Storage Space**
   - Ensure enough device storage
   - Remove unused apps
   - Try installation again

4. **Restart Device**
   - Power off device
   - Wait 30 seconds
   - Power on and try again

### Problem: Push notifications not working

**Symptoms:**
- No notifications received
- Notifications disabled
- Permission denied

**Solutions:**

1. **Enable Notifications**
   - Go to device Settings
   - Find the app
   - Enable notifications

2. **Check Browser Settings**
   - Ensure browser allows notifications
   - Check site permissions
   - Re-enable if needed

3. **Reinstall App**
   - Remove from home screen
   - Clear browser data
   - Reinstall app

4. **Check Do Not Disturb**
   - Disable Do Not Disturb mode
   - Check focus modes
   - Ensure sound is on

## Performance Problems

### Problem: High memory usage

**Symptoms:**
- Browser becomes unresponsive
- Device slows down
- Crashes or freezes

**Solutions:**

1. **Close Other Applications**
   - Free up system memory
   - Close unnecessary programs
   - Restart browser

2. **Reduce Browser Tabs**
   - Each tab uses memory
   - Keep only essential tabs open
   - Use bookmarks instead

3. **Clear Browser Data**
   - Accumulated data uses memory
   - Clear cache and cookies
   - Restart browser

4. **Restart Device**
   - Memory leaks can accumulate
   - Restart computer/phone
   - Try again

### Problem: Slow loading times

**Symptoms:**
- Pages take long to load
- Images load slowly
- Network timeouts

**Solutions:**

1. **Check Internet Speed**
   - Test connection speed
   - Try faster network if available
   - Contact ISP if slow

2. **Close Background Downloads**
   - Other downloads can slow connection
   - Pause or stop downloads
   - Try again

3. **Disable VPN/Proxy**
   - These can slow connections
   - Temporarily disable
   - Test performance

4. **Try Different Network**
   - WiFi might be congested
   - Try cellular data
   - Compare performance

## Error Messages

### Authentication Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid credentials" | Wrong password or email | Check spelling, reset password |
| "Account locked" | Too many failed attempts | Contact administrator |
| "Account inactive" | Account disabled | Contact HR or administrator |
| "Session expired" | Logged in too long | Log in again |

### Face Recognition Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Face not recognized" | Poor lighting or angle | Improve conditions, re-enroll |
| "Camera access denied" | Permission blocked | Grant camera permission |
| "No face detected" | Face not visible | Position face correctly |
| "Low confidence" | Poor image quality | Improve lighting, re-enroll |

### Attendance Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Outside check-in hours" | Current time outside allowed range | Check policy, contact admin |
| "Already checked in" | Duplicate check-in | Check current status |
| "Sync failed" | Network or server issue | Check connection, try manual sync |
| "Storage quota exceeded" | Local storage full | Clear browser data |

### System Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Network error" | Connection lost | Check internet, try again |
| "Server error" | System issue | Contact administrator |
| "Maintenance mode" | System updating | Wait for completion |
| "Feature unavailable" | Feature disabled | Contact administrator |

## Getting Additional Help

If you've tried the solutions above and still have issues:

### 1. Collect Information

Before contacting support, gather:
- **Error message** (exact text)
- **Browser and version** (Chrome 95, Firefox 94, etc.)
- **Device and OS** (Windows 10, iOS 15, etc.)
- **Steps to reproduce** the issue
- **Screenshots** if possible

### 2. Check System Status

- Contact your administrator
- Check if others have similar issues
- Verify if system is under maintenance

### 3. Contact Support Channels

**Primary Support:**
- Email: support@yourcompany.com
- Phone: +1-555-0123
- Chat: Available in-app during business hours

**Administrator:**
- Email: admin@yourcompany.com
- Internal help desk system
- Direct message or Slack

**Emergency Support:**
- For urgent issues during business hours
- After-hours emergency line: +1-555-0124

### 4. Provide Detailed Information

When contacting support, include:
- Your name and email
- Description of the problem
- What you've already tried
- When the issue started
- How often it occurs

### 5. Follow Up

- Note your support ticket number
- Follow up if no response within 24 hours
- Provide additional information if requested

## Prevention Tips

To avoid future issues:

1. **Keep Browser Updated**
   - Enable automatic updates
   - Check for updates monthly

2. **Regular Maintenance**
   - Clear browser cache monthly
   - Restart browser weekly
   - Restart device monthly

3. **Good Practices**
   - Use supported browsers
   - Don't ignore error messages
   - Report issues promptly

4. **Backup Data**
   - Export attendance reports regularly
   - Keep personal records
   - Note important dates

---

## Quick Reference

**Most Common Issues:**
1. Can't log in → Clear cache, reset password
2. Face recognition fails → Check lighting, re-enroll
3. Sync issues → Check connection, manual sync
4. Slow performance → Close tabs, clear cache

**Emergency Contacts:**
- IT Support: +1-555-0123
- System Admin: admin@yourcompany.com
- HR Department: hr@yourcompany.com

**Useful Links:**
- [User Guide](user-guide.md)
- [FAQ](faq.md)
- [System Status](https://status.yourcompany.com)

---

Last updated: January 1, 2024
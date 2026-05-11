# 🔓 How to Unlock Your Admin Account

Your admin account is locked due to failed login attempts. Here are **3 easy ways** to unlock it:

## Method 1: Use the Unlock Tool (Easiest) ⭐

1. **Start your dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open the unlock tool** in your browser:
   - Go to: `http://localhost:5173/unlock-admin.html`
   - Or: `http://localhost:3000/unlock-admin.html`
   - (Use whatever port your app is running on)

3. **Click "Unlock Admin Account"** button

4. **Refresh your main app** and login with:
   - Email: `admin@trygc.local`
   - Password: `TryGC@2024!Secure`

## Method 2: Browser Console (Quick)

1. **Open your TryGC Hub Manager** in the browser

2. **Open Developer Tools**:
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Or `Cmd+Option+I` (Mac)

3. **Go to Console tab**

4. **Copy and paste this code**:
   ```javascript
   const data = JSON.parse(localStorage.getItem('trygc_hub_workspace_v5'));
   const admin = data.users.find(u => u.email === 'admin@trygc.local');
   admin.loginAttempts = 0;
   delete admin.lockedUntil;
   localStorage.setItem('trygc_hub_workspace_v5', JSON.stringify(data));
   console.log('✅ Admin unlocked! Refresh the page.');
   ```

5. **Press Enter** to run it

6. **Refresh the page** and login

## Method 3: Clear All Data (Nuclear Option)

⚠️ **Warning**: This will delete ALL your data!

1. **Open Developer Tools** (F12)

2. **Go to Console tab**

3. **Run this command**:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

4. **The app will reset** to default state

5. **Login with**:
   - Email: `admin@trygc.local`
   - Password: `TryGC@2024!Secure`

## Why Did This Happen?

The account locks after **5 failed login attempts** for security. This happens when:
- Wrong password entered 5 times
- Password was recently changed and you used the old one
- You tried the old password `112233` (no longer valid)

## After Unlocking

1. **Login immediately** with the new password: `TryGC@2024!Secure`

2. **Change your password**:
   - Go to Settings → Profile
   - Click "Change Password"
   - Choose a strong, unique password

3. **Save your new password** securely

## Troubleshooting

### "No workspace data found"
- Make sure you're on the correct domain (localhost:5173 or localhost:3000)
- The unlock tool must be on the same domain as your app

### "Admin account not found"
- Your data might be corrupted
- Use Method 3 (Clear All Data) to reset

### Still can't login after unlocking
1. Clear your browser cache
2. Try incognito/private mode
3. Check browser console for errors
4. Make sure you're using the correct password: `TryGC@2024!Secure`

### Wrong password error
- The new password is: `TryGC@2024!Secure` (case-sensitive)
- NOT the old password: `112233`
- Make sure there are no extra spaces

## Prevention

To avoid lockouts in the future:

1. **Save your password** in a password manager
2. **Change the default password** immediately after first login
3. **Don't share your password** with others
4. **Use the "Remember me" checkbox** for convenience
5. **Contact admin** if you forget your password (don't guess)

## Need More Help?

- Check `SECURITY.md` for security documentation
- Check `AUTH_MIGRATION_GUIDE.md` for migration details
- Check `QUICK_START.md` for quick reference

---

**Current Password**: `TryGC@2024!Secure`  
**Email**: `admin@trygc.local`  
**Lockout Duration**: 30 minutes (or use unlock tool)

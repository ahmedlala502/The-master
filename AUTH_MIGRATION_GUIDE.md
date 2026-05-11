# Authentication Migration Guide

## What Changed?

The authentication system has been significantly improved with enhanced security features. Here's what you need to know:

## For Master Admin (admin@trygc.local)

### ⚠️ IMMEDIATE ACTION REQUIRED

**Your default password has been changed for security reasons.**

**Old Password**: `112233` (INSECURE - DO NOT USE)
**New Password**: `TryGC@2024!Secure`

### Steps to Update:

1. **Login with new password**: Use `TryGC@2024!Secure` to login
2. **Change your password immediately**:
   - Go to Settings → Profile
   - Click "Change Password"
   - Enter current password: `TryGC@2024!Secure`
   - Enter a new strong password (follow requirements)
   - Save changes

### Password Requirements:
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*...)

## For All Users

### What's New?

1. **Better Error Messages**
   - You'll now see how many login attempts remain before lockout
   - Clearer messages about account status
   - Lockout duration displayed in minutes

2. **Enhanced Security**
   - Insecure password fallback removed
   - Better password validation
   - Improved audit logging

3. **Password Reset**
   - "Forgot Password" button now shows admin contact
   - Contact `admin@trygc.local` for password reset assistance

### If You Can't Login

**Scenario 1: "Incorrect password" message**
- Check your password carefully (case-sensitive)
- You have 5 attempts before 30-minute lockout
- Error message shows remaining attempts

**Scenario 2: "Account is temporarily locked"**
- Wait for the specified time (shown in minutes)
- Or contact admin to unlock your account

**Scenario 3: "Account has been deactivated"**
- Contact admin to reactivate your account

**Scenario 4: "Access request is still pending"**
- Your signup request hasn't been approved yet
- Contact admin to expedite approval

**Scenario 5: "No approved account found"**
- You may need to request access first
- Use the "Request Access" tab on login page

## For Developers

### Breaking Changes

1. **Password Hashing**
   - Removed insecure fallback hash mechanism
   - `hashPassword()` now throws error if bcrypt fails
   - Legacy hashes (`$legacy$...`) are rejected

2. **Password Verification**
   - Only bcrypt hashes accepted
   - Legacy hashes require password reset
   - Better error logging

### Migration Steps

If you have existing users with legacy password hashes:

1. **Identify affected users**:
```typescript
const legacyUsers = workspace.users.filter(u => 
  u.password?.startsWith('$legacy$')
);
```

2. **Force password reset**:
   - These users cannot login
   - Admin must manually reset their passwords
   - Or users must request new access

3. **Update user passwords**:
```typescript
// Admin can update user password
const newHashedPassword = hashPassword('NewSecurePassword123!');
updateUser(userId, { password: newHashedPassword });
```

### Testing the Changes

1. **Test login flow**:
```bash
# Start the dev server
npm run dev
```

2. **Test master admin login**:
   - Email: `admin@trygc.local`
   - Password: `TryGC@2024!Secure`

3. **Test failed login attempts**:
   - Try wrong password 5 times
   - Verify account locks for 30 minutes
   - Check error messages show remaining attempts

4. **Test password change**:
   - Login as admin
   - Go to Settings → Profile
   - Change password
   - Logout and login with new password

### Environment Variables

Update your `.env` file:

```env
# Old (INSECURE)
VITE_MASTER_ADMIN_PASSWORD=112233

# New (SECURE)
VITE_MASTER_ADMIN_PASSWORD=TryGC@2024!Secure
```

**Note**: This is still not ideal for production. Consider using:
- Environment-specific secrets management
- Vault or AWS Secrets Manager
- Or migrate to Supabase Auth (recommended)

## Rollback Instructions

If you need to rollback these changes:

1. **Restore old .env**:
```env
VITE_MASTER_ADMIN_PASSWORD=112233
```

2. **Revert code changes**:
```bash
git revert HEAD
```

3. **Clear localStorage** (users will need to re-login):
```javascript
localStorage.clear();
```

⚠️ **Warning**: Rolling back removes security improvements. Only do this if absolutely necessary.

## Future Improvements

### Planned Features

1. **Email-based password reset**
   - Send reset link via email
   - Time-limited reset tokens
   - Secure token validation

2. **Multi-factor authentication**
   - TOTP (Google Authenticator)
   - SMS verification
   - Email verification codes

3. **Supabase Auth integration**
   - Server-side authentication
   - Secure session management
   - Built-in password reset

4. **OAuth providers**
   - Google Sign-In
   - Microsoft Azure AD
   - GitHub OAuth

### Contributing

If you'd like to contribute to auth improvements:

1. Read `SECURITY.md` for current architecture
2. Check open issues tagged `auth` or `security`
3. Submit PRs with tests
4. Follow security best practices

## Support

### Getting Help

**For Users**:
- Contact your administrator at `admin@trygc.local`
- Check audit logs for login issues
- Review this guide for common problems

**For Administrators**:
- Review `SECURITY.md` for detailed documentation
- Check audit logs in Settings → Audit Logs
- Export workspace data before making changes

**For Developers**:
- Open an issue on GitHub
- Check existing issues for similar problems
- Include error logs and steps to reproduce

## Frequently Asked Questions

**Q: Why did my password change?**
A: Only the master admin default password changed. Regular user passwords are unchanged.

**Q: Can I use my old password?**
A: Yes, unless you're the master admin. The old default password `112233` is no longer valid for security reasons.

**Q: What if I forgot my password?**
A: Contact your administrator. There's no automated password reset yet.

**Q: Why am I locked out?**
A: After 5 failed login attempts, accounts lock for 30 minutes. Wait or contact admin.

**Q: Is my data safe?**
A: Data is stored locally in your browser. For production use, migrate to server-side auth (see SECURITY.md).

**Q: Can I disable the lockout feature?**
A: Not recommended. This is a critical security feature. Modify `LocalDataContext.tsx` if absolutely necessary.

**Q: How do I export my data before updating?**
A: Go to Settings → Data Management → Export Workspace

---

**Last Updated**: May 11, 2026
**Version**: 2.1

# Security Documentation

## Authentication System Overview

This application uses a **local-first authentication system** with client-side storage. All authentication happens in the browser using localStorage.

### ⚠️ Important Security Considerations

**This is NOT a production-ready authentication system.** The current implementation has several limitations:

1. **Client-Side Only**: All authentication logic runs in the browser
2. **localStorage Storage**: User data and sessions stored in browser localStorage
3. **No Server Validation**: No backend to verify credentials or enforce security policies
4. **XSS Vulnerability**: Session tokens in localStorage are vulnerable to XSS attacks
5. **No Rate Limiting**: Failed login attempts only tracked client-side

### Current Security Features

✅ **Password Hashing**: bcrypt with 12 rounds (strong)
✅ **Account Lockout**: 5 failed attempts = 30-minute lockout
✅ **Session Expiration**: 24-hour session timeout
✅ **Inactivity Lock**: Configurable auto-lock (default 60 minutes)
✅ **Audit Logging**: All auth events logged locally
✅ **Password Requirements**: 
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
   - At least 1 special character

### Master Admin Account

**Email**: `admin@trygc.local`
**Default Password**: `TryGC@2024!Secure` (changed from insecure `112233`)

⚠️ **CRITICAL**: Change this password immediately after first login!

### Recent Security Fixes

1. **Removed Insecure Password Fallback** (v2.1)
   - Previously had a weak fallback hash when bcrypt failed
   - Now throws error instead of creating insecure hash
   - Legacy hashes are rejected and require password reset

2. **Enhanced Login Error Messages** (v2.1)
   - Shows remaining login attempts before lockout
   - Displays lockout duration in minutes
   - Better feedback for account status issues

3. **Improved Input Validation** (v2.1)
   - Validates email and password before processing
   - Checks account status (active/inactive/suspended)
   - Logs failed attempts with detailed reasons

4. **Password Reset Guidance** (v2.1)
   - "Forgot Password" button now shows admin contact info
   - No automated password reset (requires admin intervention)

### Known Limitations & Recommendations

#### For Development/Testing Only
This auth system is suitable for:
- Local development
- Internal tools with trusted users
- Proof-of-concept applications
- Offline-first applications

#### NOT Suitable For
- Public-facing applications
- Applications handling sensitive data
- Multi-tenant SaaS applications
- Compliance-required systems (HIPAA, SOC2, etc.)

#### Migration to Production Auth

To make this production-ready, you should:

1. **Implement Server-Side Auth**
   - Move authentication logic to a backend API
   - Use Supabase Auth (already configured but not used)
   - Or implement JWT-based auth with a Node.js backend

2. **Use Secure Session Storage**
   - Move from localStorage to httpOnly cookies
   - Implement CSRF protection
   - Use secure, sameSite cookie flags

3. **Add Rate Limiting**
   - Server-side rate limiting for login attempts
   - IP-based blocking for brute force attacks
   - CAPTCHA after multiple failed attempts

4. **Implement Password Reset**
   - Email-based password reset flow
   - Secure token generation and validation
   - Time-limited reset links

5. **Add Multi-Factor Authentication**
   - TOTP (Time-based One-Time Password)
   - SMS verification
   - Email verification codes

6. **Security Headers**
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security

### Supabase Integration (Recommended)

The application already has Supabase configured but not integrated. To use Supabase Auth:

1. **Enable Supabase Auth** in your Supabase project
2. **Update `src/lib/supabase.ts`** to use auth methods
3. **Replace LocalDataContext auth** with Supabase auth hooks
4. **Migrate user data** to Supabase database
5. **Implement Row Level Security (RLS)** policies

Example Supabase Auth integration:

```typescript
// Login with Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
});

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Logout
await supabase.auth.signOut();
```

### Audit Logs

All authentication events are logged locally:
- `LOGIN_SUCCESS`: Successful login
- `LOGIN_FAILED`: Failed login attempt with reason
- `SIGNUP_REQUEST`: New access request submitted
- `SIGNUP_APPROVED`: Access request approved
- `SIGNUP_REJECTED`: Access request rejected
- `PASSWORD_CHANGED`: Password updated
- `PROFILE_UPDATE`: User profile modified

Access audit logs through the Settings page (admin only).

### Best Practices for Users

1. **Use Strong Passwords**: Follow the password requirements
2. **Don't Share Credentials**: Each user should have their own account
3. **Lock Your Session**: Use the lock feature when stepping away
4. **Report Suspicious Activity**: Contact admin if you notice unusual behavior
5. **Keep Browser Updated**: Use latest browser version for security patches

### For Administrators

1. **Review Audit Logs Regularly**: Check for suspicious login patterns
2. **Approve Signups Promptly**: Don't leave requests pending indefinitely
3. **Deactivate Unused Accounts**: Remove or suspend inactive users
4. **Backup Data Regularly**: Export workspace data periodically
5. **Monitor Failed Login Attempts**: Investigate repeated failures

### Security Incident Response

If you suspect a security breach:

1. **Lock All Sessions**: Force all users to re-authenticate
2. **Review Audit Logs**: Check for unauthorized access
3. **Reset Passwords**: Require password reset for affected accounts
4. **Export Data**: Backup current state before making changes
5. **Contact Support**: Report the incident if using hosted version

### Changelog

**v2.1 (Current)**
- Removed insecure password hash fallback
- Enhanced login error messages with attempt tracking
- Improved input validation and account status checks
- Changed default master admin password to strong password
- Added password reset guidance (admin contact)
- Improved audit logging with detailed failure reasons

**v2.0**
- Initial local-first authentication system
- bcrypt password hashing
- Account lockout after failed attempts
- Session management with expiration
- Audit logging

---

**Last Updated**: May 11, 2026
**Maintained By**: TryGC Development Team

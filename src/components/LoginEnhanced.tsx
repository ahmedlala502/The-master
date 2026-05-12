import React, { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail, Shield, Sparkles, UserPlus, Check, Loader2, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocalData } from './LocalDataContext';
import { validateEmail, validatePassword, validateName, validateSignupData } from '../lib/authService';
import { cn, getInitials, generateAvatarColor } from '../utils';
import { MASTER_ADMIN_EMAIL } from '../constants';
import { addToast } from '../lib/toast';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  isLocked?: boolean;
}

type AuthTab = 'signin' | 'signup';

export default function LoginEnhanced({ onLogin, isLocked }: LoginProps) {
  const { pendingSignups, users, requestSignup, settings } = useLocalData();
  const [tab, setTab] = useState<AuthTab>('signin');
  const [signinForm, setSigninForm] = useState({ email: '', password: '', rememberMe: false });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    team: settings.teams?.[0] || 'Operations Team',
    office: settings.locations?.[0] || 'Cairo HQ',
    country: 'EG',
  });
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const pendingByEmail = useMemo(() => {
    const map = new Map<string, boolean>();
    pendingSignups.forEach(request => map.set(request.email.toLowerCase(), true));
    return map;
  }, [pendingSignups]);

  const approvedByEmail = useMemo(() => {
    const map = new Map<string, boolean>();
    users.forEach(user => map.set(user.email.toLowerCase(), true));
    return map;
  }, [users]);

  const passwordStrength = useMemo(() => {
    if (!signupForm.password) return { score: 0, label: '', color: 'bg-gray-200' };
  const validation = validatePassword(signupForm.password);
    const score = validation.score ?? 0;
    if (score >= 100) return { score, label: 'Strong', color: 'bg-emerald-500' };
    if (score >= 60) return { score, label: 'Good', color: 'bg-amber-500' };
    return { score: validation.score, label: 'Weak', color: 'bg-red-500' };
  }, [signupForm.password]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidationErrors({});

    const emailValidation = validateEmail(signinForm.email);
    if (!emailValidation.valid) {
      setValidationErrors({ email: emailValidation.errors });
      return;
    }

    if (!signinForm.password.trim()) {
      setValidationErrors({ password: ['Password is required'] });
      return;
    }

    setLoading(true);
    try {
      const result = await onLogin(signinForm.email, signinForm.password);
      if (!result.ok) {
        // Provide specific guidance based on the error
        const errMsg = result.error || '';
        if (errMsg.includes('pending')) {
          setError('Your account is pending approval. An admin will review your request shortly.');
        } else if (errMsg.includes('password') || errMsg.includes('Invalid')) {
          setError('Incorrect email or password. Double-check your credentials and try again.');
        } else if (errMsg.includes('not found') || errMsg.includes('No account')) {
          setError('No account found with this email. Switch to "Request Access" to create one.');
        } else {
          setError(errMsg || 'Sign in failed. Please check your credentials.');
        }
      }
    } catch {
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidationErrors({});

    const validation = validateSignupData(signupForm);
    if (!validation.valid) {
      const errors: Record<string, string[]> = {};
      validation.errors.forEach(err => {
        if (err.toLowerCase().includes('name')) errors.name = [...(errors.name || []), err];
        else if (err.toLowerCase().includes('email')) errors.email = [...(errors.email || []), err];
        else if (err.toLowerCase().includes('password')) errors.password = [...(errors.password || []), err];
      });
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const result = await requestSignup(signupForm);
      if (!result.ok) {
        setError(result.error || 'Request access failed.');
      } else {
        setSuccess('Access request submitted! Your account will remain pending until approved by an admin.');
        setSignupForm({ ...signupForm, name: '', email: '', password: '' });
        setTimeout(() => setTab('signin'), 4000);
      }
    } catch {
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const normalizedSigninEmail = signinForm.email.trim().toLowerCase();
  const isPendingEmail = Boolean(pendingByEmail.get(normalizedSigninEmail) && !approvedByEmail.get(normalizedSigninEmail));

  if (isLocked) {
    return (
      <div className="min-h-screen w-full bg-stone flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="relaxed-title text-2xl text-ink">Session Locked</h2>
          <p className="text-sm text-muted font-medium">Your session has been locked due to inactivity. Please sign in again to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-ink text-white rounded-xl font-semibold hover:bg-ink/90 transition-all"
          >
            Unlock Session
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-stone px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left Panel - Branding */}
        <div className="relative overflow-hidden rounded-[40px] bg-ink px-8 py-10 text-white shadow-2xl lg:px-12 lg:py-14">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-32 -top-32 h-96 w-96 bg-citrus/10 rounded-full blur-3xl" />
            <div className="absolute -left-32 -bottom-32 h-96 w-96 bg-sky/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-citrus/5 rounded-full blur-3xl" />
          </div>

          <div className="relative space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-citrus rounded-2xl flex items-center justify-center shadow-lg shadow-citrus/30">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">TryGC Hub Manager</h1>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Control Center</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl font-black leading-tight">
                Operations Intelligence At Your Fingertips
              </h2>
              <p className="text-white/80 text-lg leading-relaxed">
                Manage tasks, handovers, and team performance with real-time insights and seamless collaboration across all regional hubs.
              </p>
            </div>

            <ul className="space-y-3 pt-8">
              {[
                'Centralized task & handover management',
                'Real-time performance tracking',
                'Team collaboration dashboard',
                'Secure access control with audit trails',
                'AI-powered operational insights',
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-white/90">
                  <CheckCircle2 className="w-5 h-5 text-citrus flex-shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-8 flex items-center gap-4">
              <span className="text-xs text-white/40 font-medium">Version 2.0</span>
              <span className="text-xs text-white/40">•</span>
              <span className="text-xs text-white/40 font-medium">Enterprise Ready</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Auth Form */}
        <div className="flex flex-col justify-center">
          <div className="space-y-6">
            {/* Tab Switcher */}
            <div className="flex gap-2 bg-stone/50 p-1 rounded-xl border border-dawn">
              {(['signin', 'signup'] as const).map(tabName => (
                <button
                  key={tabName}
                  onClick={() => {
                    setTab(tabName);
                    setError('');
                    setSuccess('');
                    setValidationErrors({});
                  }}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2',
                    tab === tabName
                      ? 'bg-white text-ink shadow-sm'
                      : 'text-muted hover:text-ink'
                  )}
                >
                  <Lock className="w-4 h-4" />
                  <span>{tabName === 'signin' ? 'Sign In' : 'Request Access'}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {tab === 'signin' ? (
                <motion.form
                  key="signin"
                  onSubmit={handleSignIn}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                      <input
                        type="email"
                        value={signinForm.email}
                        onChange={(e) => {
                          setSigninForm({ ...signinForm, email: e.target.value });
                          setValidationErrors(prev => ({ ...prev, email: [] }));
                        }}
                        placeholder="name@company.com"
                        className={cn(
                          'w-full pl-11 pr-4 py-3 rounded-xl border transition-all text-sm',
                          validationErrors.email
                            ? 'border-red-300 bg-red-50/50 focus:ring-2 focus:ring-red-200'
                            : 'border-dawn bg-white/50 focus:ring-2 focus:ring-citrus/20 focus:border-citrus'
                        )}
                        disabled={loading}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {validationErrors.email[0]}
                      </p>
                    )}
                    {isPendingEmail && (
                      <p className="mt-1.5 text-sm text-amber-600 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Access request pending approval
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                      <input
                        type={showSigninPassword ? 'text' : 'password'}
                        value={signinForm.password}
                        onChange={(e) => {
                          setSigninForm({ ...signinForm, password: e.target.value });
                          setValidationErrors(prev => ({ ...prev, password: [] }));
                        }}
                        placeholder="Enter your password"
                        className={cn(
                          'w-full pl-11 pr-12 py-3 rounded-xl border transition-all text-sm',
                          validationErrors.password
                            ? 'border-red-300 bg-red-50/50 focus:ring-2 focus:ring-red-200'
                            : 'border-dawn bg-white/50 focus:ring-2 focus:ring-citrus/20 focus:border-citrus'
                        )}
                        disabled={loading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSigninPassword(!showSigninPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showSigninPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {validationErrors.password[0]}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={signinForm.rememberMe}
                        onChange={(e) => setSigninForm({ ...signinForm, rememberMe: e.target.checked })}
                        className="w-4 h-4 accent-citrus rounded"
                      />
                      Remember me for 30 days
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        addToast('Password reset: Please contact your administrator at admin@trygc.local for password reset assistance.', 'info', 8000);
                      }}
                      className="text-sm text-citrus font-semibold hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || isPendingEmail}
                    className="w-full py-3.5 bg-ink text-white rounded-xl font-semibold hover:bg-ink/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-ink/10 active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        <span>Sign In Securely</span>
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  onSubmit={handleSignUp}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-emerald-600 font-medium">{success}</p>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                        <input
                          type="text"
                          value={signupForm.name}
                          onChange={(e) => {
                            setSignupForm({ ...signupForm, name: e.target.value });
                            setValidationErrors(prev => ({ ...prev, name: [] }));
                          }}
                          placeholder="John Doe"
                          className={cn(
                            'w-full pl-11 pr-4 py-3 rounded-xl border transition-all text-sm',
                            validationErrors.name
                              ? 'border-red-300 bg-red-50/50'
                              : 'border-dawn bg-white/50 focus:border-citrus focus:ring-2 focus:ring-citrus/20'
                          )}
                          disabled={loading}
                        />
                      </div>
                      {validationErrors.name && <p className="mt-1 text-sm text-red-600">{validationErrors.name[0]}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                        <input
                          type="email"
                          value={signupForm.email}
                          onChange={(e) => {
                            setSignupForm({ ...signupForm, email: e.target.value });
                            setValidationErrors(prev => ({ ...prev, email: [] }));
                          }}
                          placeholder="name@company.com"
                          className={cn(
                            'w-full pl-11 pr-4 py-3 rounded-xl border transition-all text-sm',
                            validationErrors.email
                              ? 'border-red-300 bg-red-50/50'
                              : 'border-dawn bg-white/50 focus:border-citrus focus:ring-2 focus:ring-citrus/20'
                          )}
                          disabled={loading}
                        />
                      </div>
                      {validationErrors.email && <p className="mt-1 text-sm text-red-600">{validationErrors.email[0]}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupForm.password}
                        onChange={(e) => {
                          setSignupForm({ ...signupForm, password: e.target.value });
                          setValidationErrors(prev => ({ ...prev, password: [] }));
                        }}
                        placeholder="Create a secure password"
                        className={cn(
                          'w-full pl-11 pr-12 py-3 rounded-xl border transition-all text-sm',
                          validationErrors.password
                            ? 'border-red-300 bg-red-50/50'
                            : 'border-dawn bg-white/50 focus:border-citrus focus:ring-2 focus:ring-citrus/20'
                        )}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showSignupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Password strength indicator */}
                    {signupForm.password && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all duration-500', passwordStrength.color)}
                              style={{ width: `${passwordStrength.score}%` }}
                            />
                          </div>
                          <span className={cn('text-xs font-bold uppercase', (passwordStrength.score ?? 0) >= 60 ? 'text-emerald-600' : (passwordStrength.score ?? 0) >= 40 ? 'text-amber-600' : 'text-red-600')}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {[
                            { check: signupForm.password.length >= 8, label: 'Min 8 characters' },
                            { check: /[A-Z]/.test(signupForm.password), label: 'One uppercase' },
                            { check: /[a-z]/.test(signupForm.password), label: 'One lowercase' },
                            { check: /[0-9]/.test(signupForm.password), label: 'One number' },
                            { check: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupForm.password), label: 'One special character' },
                          ].map((rule) => (
                            <li key={rule.label} className={cn('text-xs flex items-center gap-1.5', rule.check ? 'text-emerald-600' : 'text-muted')}>
                              <Check className={cn('w-3 h-3', rule.check ? 'opacity-100' : 'opacity-0')} />
                              {rule.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Team', key: 'team', options: settings.teams || [] },
                      { label: 'Office', key: 'office', options: settings.locations || [] },
                      { label: 'Country', key: 'country', options: Object.keys({ 'KSA': 'Saudi', 'UAE': 'Emirates', 'KW': 'Kuwait', 'EG': 'Egypt', 'BH': 'Bahrain', 'QA': 'Qatar' }) },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="block text-sm font-semibold text-ink mb-2">{field.label}</label>
                        <select
                          value={signupForm[field.key as keyof typeof signupForm]}
                          onChange={(e) => setSignupForm({ ...signupForm, [field.key]: e.target.value })}
                          className="w-full px-3 py-3 rounded-xl border border-dawn bg-white/50 text-sm font-medium focus:border-citrus focus:ring-2 focus:ring-citrus/20 outline-none"
                          disabled={loading}
                        >
                          {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (passwordStrength.score ?? 0) < 60}
                    className="w-full py-3.5 bg-citrus text-white rounded-xl font-semibold hover:bg-citrus/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-citrus/10 active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        <span>Request Access</span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-muted leading-relaxed">
                    By requesting access, you agree to our terms of service and privacy policy. Your request will be reviewed by an admin within 24 hours.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

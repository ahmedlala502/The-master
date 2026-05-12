import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { AuthState, Handover, Member, Office, PendingSignupRequest, Shift, Task, User, WorkspaceUser } from '../types';
import { WorkspaceSettings } from '../lib/localStore';
import { MASTER_ADMIN_EMAIL } from '../constants';
import { AuditEvent, clearAuthState, createId, getAuthState, importWorkspace, loadWorkspace, LocalWorkspace, normalizeTask, resetWorkspace, saveAuthState, saveWorkspace } from '../lib/localStore';
import { AppPage, FeatureKey, filterHandoversByTeam, filterMembersByTeam, filterOfficesByTeam, filterTasksByTeam, getCurrentTeam, resolvePermissionProfile, WidgetKey } from '../lib/accessControl';
import { hashPassword, verifyPassword, generateSessionId, calculateSessionExpiration } from '../lib/authService';
import { addToast } from '../lib/toast';

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface SignupPayload {
  name: string;
  email: string;
  password: string;
  team: string;
  office: string;
  country: string;
}

interface LocalDataContextType extends LocalWorkspace {
  loading: boolean;
  isReady: boolean;
  auth: AuthState;
  sync: { isOnline: boolean; isSyncing: boolean; lastSyncedAt?: string; pendingChanges: number; error?: string };
  login: (email: string, password: string) => Promise<AuthResult>;
  requestSignup: (payload: SignupPayload) => Promise<AuthResult>;
  approveSignup: (id: string) => Promise<void>;
  rejectSignup: (id: string) => Promise<void>;
  logout: () => void;
  lock: () => void;
  currentTeam: string;
  isMasterAdmin: boolean;
  isSuperAdmin: boolean;
  hasAdminAccess: boolean;
  scopedTasks: Task[];
  scopedHandovers: Handover[];
  scopedMembers: Member[];
  scopedOffices: Office[];
  canAccessPage: (page: AppPage) => boolean;
  canUseFeature: (feature: FeatureKey) => boolean;
  isWidgetEnabled: (widget: WidgetKey) => boolean;
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTasks: (ids: string[]) => Promise<void>;
  addHandover: (handover: Partial<Handover>) => Promise<void>;
  updateHandover: (id: string, patch: Partial<Handover>) => Promise<void>;
  deleteHandover: (id: string) => Promise<void>;
  addOffice: (office: Partial<Office>) => Promise<void>;
  updateOffice: (id: string, patch: Partial<Office>) => Promise<void>;
  deleteOffice: (id: string) => Promise<void>;
  addMember: (member: Partial<Member> & { email?: string; password?: string }) => Promise<void>;
  updateMember: (id: string, patch: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  updateSettings: (settings: WorkspaceSettings) => Promise<void>;
  updateUser: (patch: Partial<LocalWorkspace['user']>) => Promise<void>;
  exportWorkspace: () => LocalWorkspace;
  importData: (json: string) => boolean;
  resetData: () => Promise<void>;
  logAction: (action: string, details?: unknown, severity?: 'info' | 'warning' | 'error' | 'critical') => Promise<void>;
  restoreSession: () => boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
}

const LocalDataContext = createContext<LocalDataContextType | undefined>(undefined);

function toSessionUser(account: WorkspaceUser): User {
  return {
    name: account.name,
    role: account.role,
    office: account.office,
    country: account.country,
    email: account.email,
    team: account.team,
    // SECURITY: Never expose password hash in session user context
    password: undefined,
    isSuperAdmin: account.isSuperAdmin,
  };
}

function isMasterAccount(user?: Pick<User, 'email'>) {
  return user?.email?.toLowerCase() === MASTER_ADMIN_EMAIL;
}

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<LocalWorkspace>(() => loadWorkspace());
  const [auth, setAuth] = useState<AuthState>(() => getAuthState());

  const commit = (updater: (current: LocalWorkspace) => LocalWorkspace) => {
    setWorkspace(current => {
      const next = updater(current);
      saveWorkspace(next);
      return next;
    });
  };

  const appendAudit = (current: LocalWorkspace, action: string, details?: unknown, severity: 'info' | 'warning' | 'error' | 'critical' = 'info'): LocalWorkspace => {
    const event: AuditEvent = {
      id: createId('audit'),
      action,
      details: details || {},
      timestamp: new Date().toISOString(),
      userId: current.user.email,
      severity,
    };
    return { ...current, auditLogs: [event, ...current.auditLogs].slice(0, 200) };
  };

  const isMasterAdmin = isMasterAccount(workspace.user);
  const isSuperAdmin = isMasterAdmin || workspace.user.isSuperAdmin === true || workspace.user.role === 'Super Admin';
  const hasAdminAccess = isSuperAdmin || ['super admin', 'admin', 'manager', 'lead', 'head', 'director', 'general'].some(r => workspace.user.role.toLowerCase().includes(r));
  const currentTeam = getCurrentTeam(workspace.user, workspace.members);
  const permissionProfile = resolvePermissionProfile(workspace.user.role, workspace.settings.rolePermissions);
  const allowedTeams = isSuperAdmin ? ['*'] : permissionProfile.teams;
  const teamIsolation = workspace.settings.featureFlags?.teamIsolation !== false;
  const scopedTasks = filterTasksByTeam(workspace.tasks, allowedTeams, teamIsolation);
  const scopedHandovers = filterHandoversByTeam(workspace.handovers, allowedTeams, teamIsolation);
  const scopedMembers = filterMembersByTeam(workspace.members, allowedTeams, teamIsolation);
  const scopedOffices = filterOfficesByTeam(workspace.offices, workspace.tasks, workspace.members, allowedTeams, teamIsolation);

  React.useEffect(() => {
    const needsUserFix = (workspace.user.isSuperAdmin || workspace.user.role === 'Super Admin') && workspace.user.role !== 'Super Admin';
    const needsAccountFix = workspace.users.some(user => user.isSuperAdmin && user.role !== 'Super Admin');

    if (!needsUserFix && !needsAccountFix) return;

    setWorkspace(current => {
      const nextUsers = current.users.map(user => user.isSuperAdmin
        ? { ...user, role: 'Super Admin', status: 'active' as const }
        : user);

      const next = {
        ...current,
        user: current.user.isSuperAdmin
          ? { ...current.user, role: 'Super Admin', isSuperAdmin: true }
          : current.user,
        users: nextUsers,
      };
      saveWorkspace(next);
      return next;
    });
  }, []);

  React.useEffect(() => {
    const handler = () => {
      if (navigator.onLine) {
        addToast('Connection restored', 'success', 3000);
      } else {
        addToast('You are offline. Changes will be saved locally.', 'warning', 5000);
      }
    };
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    };
  }, []);

  const sanitizeUserPatch = (patch: Partial<LocalWorkspace['user']>, currentUser: LocalWorkspace['user']) => {
    if (isMasterAdmin) {
      const nextPatch = { ...patch };
      delete (nextPatch as Record<string, unknown>).isSuperAdmin;
      // Only hash password if it's actually being changed
      if (typeof nextPatch.password === 'string' && nextPatch.password.trim() && !nextPatch.password.startsWith('$')) {
        nextPatch.password = hashPassword(nextPatch.password.trim());
      }
      return {
        ...nextPatch,
        role: 'Super Admin',
        isSuperAdmin: true,
      };
    }

    const nextPatch = { ...patch };
    delete (nextPatch as Record<string, unknown>).role;
    delete (nextPatch as Record<string, unknown>).isSuperAdmin;

    // Prevent users from claiming the master admin email
    if (nextPatch.email?.toLowerCase() === MASTER_ADMIN_EMAIL) {
      nextPatch.email = currentUser.email;
    }

    if (typeof nextPatch.password === 'string' && nextPatch.password.trim() && !nextPatch.password.startsWith('$')) {
      nextPatch.password = hashPassword(nextPatch.password.trim());
    }

    return nextPatch;
  };

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    
    // Input validation
    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, error: 'Email and password are required.' };
    }
    
    const account = workspace.users.find(user => user.email.toLowerCase() === normalizedEmail);
    const pendingRequest = workspace.pendingSignups.find(request => request.email.toLowerCase() === normalizedEmail);

    // FIX: Do NOT auto-approve pending signups on login. Security bug removed.
    if (!account && pendingRequest) {
      return { ok: false, error: 'Your access request is still pending admin approval.' };
    }

    if (!account) {
      // Log failed login attempt for non-existent account
      commit(current => appendAudit(current, 'LOGIN_FAILED', { email: normalizedEmail, reason: 'account_not_found' }, 'warning'));
      return { ok: false, error: 'No approved account was found for this email.' };
    }

    // Verify password using bcrypt
    const passwordValid = verifyPassword(normalizedPassword, account.password || '');
    if (!passwordValid) {
      commit(current => appendAudit(current, 'LOGIN_FAILED', { email: normalizedEmail, reason: 'invalid_password' }, 'warning'));
      return { ok: false, error: 'Incorrect email or password.' };
    }

    // Successful login
    const sessionId = generateSessionId();
    const expiresAt = calculateSessionExpiration(24);

    commit(current => {
      const updatedUsers = current.users.map(u =>
        u.email.toLowerCase() === normalizedEmail
          ? { ...u, loginAttempts: 0, lockedUntil: undefined, status: 'active' as const, lastLoginAt: new Date().toISOString() }
          : u
      );
      return appendAudit({
        ...current,
        user: toSessionUser(account),
        users: updatedUsers,
      }, 'LOGIN_SUCCESS', { email: normalizedEmail, sessionId }, 'info');
    });

    const state: AuthState = { isAuthenticated: true, isLocked: false, lastActivity: Date.now(), sessionId, expiresAt };
    setAuth(state);
    saveAuthState(state);
    return { ok: true };
  }, [workspace.users, workspace.pendingSignups]);

  const requestSignup = useCallback(async (payload: SignupPayload): Promise<AuthResult> => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const trimmedPassword = payload.password.trim();

    if (!payload.name.trim() || !normalizedEmail || !trimmedPassword) {
      return { ok: false, error: 'Please complete the full access request form.' };
    }

    if (normalizedEmail === MASTER_ADMIN_EMAIL) {
      return { ok: false, error: 'This email address is reserved. Please use a different email.' };
    }

    if (workspace.users.some(user => user.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, error: 'An approved account already exists for this email. Please sign in instead.' };
    }

    if (workspace.pendingSignups.some(request => request.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, error: 'An access request for this email is already pending admin approval.' };
    }

    commit(current => appendAudit({
      ...current,
      pendingSignups: [{
        id: createId('signup'),
        name: payload.name.trim(),
        email: normalizedEmail,
        password: hashPassword(trimmedPassword),
        team: payload.team,
        office: payload.office,
        country: payload.country,
        requestedAt: new Date().toISOString(),
      }, ...current.pendingSignups],
    }, 'SIGNUP_REQUEST', { email: normalizedEmail, team: payload.team }));

    addToast('Access request submitted successfully!', 'success', 6000);
    return { ok: true };
  }, [workspace.pendingSignups, workspace.users]);

  const logout = useCallback(() => {
    setAuth({ isAuthenticated: false, isLocked: false, lastActivity: 0 });
    clearAuthState();
    addToast('You have been signed out.', 'info', 3000);
  }, []);

  const lock = useCallback(() => {
    const state: AuthState = { ...auth, isLocked: true };
    setAuth(state);
    saveAuthState(state);
    addToast('Session locked for security.', 'warning', 3000);
  }, [auth]);

  const restoreSession = useCallback((): boolean => {
    const state = getAuthState();
    if (state.isAuthenticated && !state.isLocked && state.expiresAt && state.expiresAt > Date.now()) {
      setAuth(state);
      return true;
    }
    return false;
  }, []);

  const canUsePrivilegedFeature = (feature: FeatureKey) => {
    if (['users.manage', 'widgets.manage', 'ai.configure'].includes(feature)) {
      return isMasterAdmin;
    }
    // Super Admins can access settings and all standard features
    if (feature === 'settings.manage') {
      return isSuperAdmin;
    }
    return isSuperAdmin || permissionProfile.features.includes(feature);
  };

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
    const account = workspace.users.find(user => user.email.toLowerCase() === workspace.user.email.toLowerCase());
    if (!account) return { ok: false, error: 'User not found' };

    if (!verifyPassword(currentPassword, account.password || '')) {
      return { ok: false, error: 'Current password is incorrect.' };
    }

    const hashedNewPassword = hashPassword(newPassword);
    commit(current => appendAudit({
      ...current,
      user: { ...current.user, password: hashedNewPassword },
      users: current.users.map(u => u.email.toLowerCase() === account.email.toLowerCase()
        ? { ...u, password: hashedNewPassword }
        : u),
    }, 'PASSWORD_CHANGED', { email: account.email }));

    addToast('Password updated successfully.', 'success', 4000);
    return { ok: true };
  }, [workspace.users, workspace.user.email]);

  const value = useMemo<LocalDataContextType>(() => {
    const sync = {
      isOnline: navigator.onLine,
      isSyncing: false,
      pendingChanges: 0,
      lastSyncedAt: undefined as string | undefined,
      error: undefined as string | undefined,
    };

    return {
      ...workspace,
      auth,
      loading: false,
      isReady: true,
      sync,
      login,
      requestSignup,
      approveSignup: async (id) => {
        if (!isMasterAdmin && !isSuperAdmin) return;
        commit(current => {
          const request = current.pendingSignups.find(item => item.id === id);
          if (!request) return current;

          const approvedAt = new Date().toISOString();
          const nextUser: WorkspaceUser = {
            id: createId('user'),
            name: request.name,
            role: 'Viewer',
            office: request.office,
            country: request.country,
            email: request.email,
            password: request.password,
            team: request.team,
            status: 'active',
            createdAt: request.requestedAt,
            approvedAt,
          };

          const nextMembers = current.members.some(member => member.name === request.name)
            ? current.members.map(member => member.name === request.name
              ? { ...member, role: member.role || 'Viewer', team: request.team, office: request.office, country: request.country, updatedAt: approvedAt }
              : member)
            : [{
              id: createId('member'),
              name: request.name,
              team: request.team,
              office: request.office,
              country: request.country,
              role: 'Viewer',
              tasksCompleted: 0,
              handoversOut: 0,
              onTime: 0,
              updatedAt: approvedAt,
            }, ...current.members];

          addToast(`${request.name}'s account has been approved.`, 'success', 4000);

          return appendAudit({
            ...current,
            users: [nextUser, ...current.users.filter(user => user.email.toLowerCase() !== request.email.toLowerCase())],
            pendingSignups: current.pendingSignups.filter(item => item.id !== id),
            members: nextMembers,
          }, 'SIGNUP_APPROVED', { email: request.email, role: 'Viewer' });
        });
      },
      rejectSignup: async (id) => {
        if (!isMasterAdmin && !isSuperAdmin) return;
        commit(current => {
          const request = current.pendingSignups.find(item => item.id === id);
          if (!request) return current;
          addToast(`${request.name}'s access request has been rejected.`, 'info', 4000);
          return appendAudit({
            ...current,
            pendingSignups: current.pendingSignups.filter(item => item.id !== id),
          }, 'SIGNUP_REJECTED', { email: request.email });
        });
      },
      logout,
      lock,
      restoreSession,
      changePassword,
      currentTeam,
      isMasterAdmin,
      isSuperAdmin,
      hasAdminAccess,
      scopedTasks,
      scopedHandovers,
      scopedMembers,
      scopedOffices,
      canAccessPage: page => page === 'settings' ? isSuperAdmin : (isSuperAdmin || permissionProfile.pages.includes(page)),
      canUseFeature: feature => canUsePrivilegedFeature(feature),
      isWidgetEnabled: widget => workspace.settings.widgetConfig?.[widget] !== false,
      addTask: async task => {
        commit(current => appendAudit({
          ...current,
          tasks: [normalizeTask(task, current.user), ...current.tasks],
        }, 'TASK_CREATE', { title: task.title }));
        addToast('Task created successfully.', 'success', 3000);
      },
      updateTask: async (id, patch) => {
        commit(current => appendAudit({
          ...current,
          tasks: current.tasks.map(task => task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task),
        }, 'TASK_UPDATE', { id, patch }));
      },
      deleteTasks: async ids => {
        commit(current => appendAudit({
          ...current,
          tasks: current.tasks.filter(task => !ids.includes(task.id)),
        }, 'TASK_DELETE', { count: ids.length }));
        addToast(`${ids.length} task(s) deleted.`, 'info', 3000);
      },
      addHandover: async handover => {
        commit(current => appendAudit({
          ...current,
          handovers: [{
            id: createId('handover'),
            date: handover.date || new Date().toISOString().split('T')[0],
            fromShift: handover.fromShift!,
            toShift: handover.toShift!,
            fromOffice: handover.fromOffice || '',
            toOffice: handover.toOffice || '',
            team: handover.team || current.settings.teams[0],
            country: handover.country || current.user.country,
            outgoing: handover.outgoing || current.user.name,
            incoming: handover.incoming || 'TBD',
            status: handover.status || 'Pending',
            watchouts: handover.watchouts || '',
            taskIds: handover.taskIds || [],
            createdAt: handover.createdAt || new Date().toISOString(),
            ackAt: handover.ackAt,
            creatorId: 'local-workspace',
          }, ...current.handovers],
        }, 'HANDOVER_INITIATE', { taskCount: handover.taskIds?.length || 0 }));
        addToast('Handover created successfully.', 'success', 3000);
      },
      updateHandover: async (id, patch) => {
        commit(current => appendAudit({
          ...current,
          handovers: current.handovers.map(handover => handover.id === id ? { ...handover, ...patch } : handover),
        }, 'HANDOVER_UPDATE', { id, patch }));
      },
      deleteHandover: async id => {
        commit(current => appendAudit({
          ...current,
          handovers: current.handovers.filter(handover => handover.id !== id),
        }, 'HANDOVER_DELETE', { id }));
      },
      addOffice: async office => {
        commit(current => appendAudit({
          ...current,
          offices: [{ id: createId('office'), name: office.name || 'New Hub', country: office.country || 'EG', lead: office.lead || current.user.name, shift: office.shift || Shift.MORNING, timezone: office.timezone, address: office.address, phone: office.phone }, ...current.offices],
        }, 'OFFICE_REGISTER', { name: office.name }));
        addToast(`Office "${office.name}" registered.`, 'success', 3000);
      },
      updateOffice: async (id, patch) => {
        commit(current => appendAudit({
          ...current,
          offices: current.offices.map(office => office.id === id ? { ...office, ...patch } : office),
        }, 'OFFICE_UPDATE', { id, patch }));
      },
      deleteOffice: async id => {
        commit(current => appendAudit({
          ...current,
          offices: current.offices.filter(office => office.id !== id),
        }, 'OFFICE_DELETE', { id }));
      },
      addMember: async member => {
        if (!hasAdminAccess) {
          addToast('Insufficient permissions to add members.', 'error', 4000);
          return;
        }
        commit(current => {
          const createdAt = new Date().toISOString();
          const name = member.name?.trim() || 'New Member';
          const role = member.role || 'Operations Agent';
          const team = member.team || current.settings.teams[0];
          const office = member.office || current.user.office;
          const country = member.country || current.user.country;
          const emailBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
          const email = (member.email || `${emailBase || 'user'}@trygc.local`).trim().toLowerCase();
          const password = member.password ? hashPassword(member.password) : '';

          if (current.users.some(u => u.email.toLowerCase() === email)) {
            addToast('A user with this email already exists.', 'error', 4000);
            return current;
          }

          return appendAudit({
            ...current,
            members: [{
              id: createId('member'),
              name,
              team,
              office,
              country,
              role,
              tasksCompleted: member.tasksCompleted || 0,
              handoversOut: member.handoversOut || 0,
              onTime: member.onTime || 0,
              updatedAt: createdAt,
              status: 'active',
            }, ...current.members],
            users: [{
              id: createId('user'),
              name,
              role,
              office,
              country,
              email,
              password,
              team,
              status: 'active',
              createdAt,
              approvedAt: createdAt,
            }, ...current.users],
          }, 'MEMBER_CREATE', { name, email });
        });
        addToast('Member added successfully.', 'success', 3000);
      },
      updateMember: async (id, patch) => {
        if (!hasAdminAccess) {
          addToast('Insufficient permissions to update members.', 'error', 4000);
          return;
        }
        commit(current => {
          const target = current.members.find(member => member.id === id);
          if (!target) return current;
          const updatedName = patch.name || target.name;
          const updatedRole = patch.role || target.role || 'Viewer';
          const updatedOffice = patch.office || target.office;
          const updatedCountry = patch.country || target.country;
          const updatedTeam = patch.team || target.team;

          return appendAudit({
            ...current,
            members: current.members.map(member => member.id === id ? { ...member, ...patch, updatedAt: new Date().toISOString() } : member),
            users: current.users.map(account => account.name === target.name
              ? { ...account, name: updatedName, role: updatedRole, office: updatedOffice, country: updatedCountry, team: updatedTeam }
              : account),
            user: current.user.name === target.name
              ? { ...current.user, name: updatedName, role: isMasterAccount(current.user) ? 'Super Admin' : updatedRole, office: updatedOffice, country: updatedCountry, team: updatedTeam }
              : current.user,
          }, 'MEMBER_UPDATE', { id, patch });
        });
      },
      deleteMember: async id => {
        if (!hasAdminAccess) {
          addToast('Insufficient permissions to remove members.', 'error', 4000);
          return;
        }
        commit(current => {
          const target = current.members.find(member => member.id === id);
          if (!target) return current;
          return appendAudit({
            ...current,
            members: current.members.filter(member => member.id !== id),
            users: current.users.filter(account => account.name !== target.name || isMasterAccount(account)),
          }, 'MEMBER_DELETE', { id });
        });
        addToast('Member removed successfully.', 'info', 3000);
      },
      updateSettings: async settings => {
        if (!isMasterAdmin) {
          addToast('Only the master admin can change workspace settings.', 'error', 4000);
          return;
        }
        commit(current => appendAudit({ ...current, settings }, 'SETTINGS_UPDATE', {}));
      },
      updateUser: async patch => {
        commit(current => {
          const safePatch = sanitizeUserPatch(patch, current.user);
          const nextUser = { ...current.user, ...safePatch };
          const previousName = current.user.name;
          const previousEmail = current.user.email.toLowerCase();

          return appendAudit({
            ...current,
            user: nextUser,
            users: current.users.map(account => account.email.toLowerCase() === previousEmail
              ? { ...account, name: nextUser.name, role: isMasterAccount(nextUser) ? 'Super Admin' : nextUser.role, office: nextUser.office, country: nextUser.country, email: nextUser.email, password: nextUser.password, team: nextUser.team || account.team }
              : account),
            members: current.members.map(member => member.name === previousName
              ? { ...member, name: nextUser.name, role: isMasterAccount(nextUser) ? 'Super Admin' : nextUser.role, office: nextUser.office, country: nextUser.country, updatedAt: new Date().toISOString() }
              : member),
          }, 'PROFILE_UPDATE', safePatch);
        });
      },
      exportWorkspace: () => workspace,
      importData: (json: string) => {
        const imported = importWorkspace(json);
        if (!imported) {
          addToast('Failed to import workspace data. Invalid format.', 'error', 4000);
          return false;
        }
        setWorkspace(imported);
        saveWorkspace(imported);
        addToast('Workspace data imported successfully.', 'success', 4000);
        return true;
      },
      resetData: async () => {
        clearAuthState();
        setWorkspace(resetWorkspace());
        setAuth({ isAuthenticated: false, isLocked: false, lastActivity: 0 });
        addToast('Workspace has been reset to default state.', 'warning', 6000);
      },
      logAction: async (action, details, severity) => {
        commit(current => appendAudit(current, action, details, severity));
      },
    };
  }, [workspace, auth, login, requestSignup, logout, lock, restoreSession, changePassword, currentTeam, isMasterAdmin, isSuperAdmin, hasAdminAccess, scopedTasks, scopedHandovers, scopedMembers, scopedOffices, permissionProfile, commit, appendAudit, sanitizeUserPatch, isMasterAccount]);

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
}

export function useLocalData() {
  const context = useContext(LocalDataContext);
  if (!context) throw new Error('useLocalData must be used within LocalDataProvider');
  return context;
}

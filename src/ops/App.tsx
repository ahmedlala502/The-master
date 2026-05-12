import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { localAuth, LocalAuthRole, LocalAuthUser } from './services/localAuth';
import { canAccessPath, getHomePath } from './lib/access';

import Dashboard from './pages/Dashboard';
import Blockers from './pages/Blockers';
import AuditLogs from './pages/AuditLogs';
import Admin from './pages/Admin';
import Reporting from './pages/Reporting';
import Tasks from './pages/Tasks';
import Templates from './pages/Templates';
import Analytics from './pages/Analytics';
import AssetRegistry from './pages/AssetRegistry';
import Handover from './pages/Handover';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Layout from './components/Layout';

interface AuthContextType {
  user: LocalAuthUser | null;
  role: LocalAuthRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default function App() {
  const [user, setUser] = useState<LocalAuthUser | null>(null);
  const [role, setRole] = useState<LocalAuthRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    localAuth.ensureDefaultUser().then(() => {
      if (!mounted) return;
      const session = localAuth.getSession();
      setUser(session);
      setRole(session?.role || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const signedInUser = await localAuth.signIn(email, password);
    setUser(signedInUser);
    setRole(signedInUser.role);
  };

  const logout = async () => {
    localAuth.signOut();
    setUser(null);
    setRole(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="animate-pulse font-mono text-sm tracking-widest uppercase">Initializing Command Center...</div>
      </div>
    );
  }

  const homePath = getHomePath(role);
  const redirectHome = <Navigate to={homePath} replace />;
  const allow = (path: string, element: React.ReactElement) => (canAccessPath(role, path) ? element : redirectHome);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout /> : <Navigate to="/login" />}
          >
            <Route index element={allow('/', <Dashboard />)} />
            <Route path="handover" element={allow('/handover', <Handover />)} />
            <Route path="blockers" element={allow('/blockers', <Blockers />)} />
            <Route path="audit" element={allow('/audit', <AuditLogs />)} />
            <Route path="reporting" element={allow('/reporting', <Reporting />)} />
            <Route path="tasks" element={allow('/tasks', <Tasks />)} />
            <Route path="templates" element={allow('/templates', <Templates />)} />
            <Route path="analytics" element={allow('/analytics', <Analytics />)} />
            <Route path="assets" element={allow('/assets', <AssetRegistry />)} />
            <Route path="settings" element={allow('/settings', <Settings />)} />
            <Route path="admin" element={allow('/admin', <Admin />)} />
            <Route path="*" element={redirectHome} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </AuthContext.Provider>
  );
}

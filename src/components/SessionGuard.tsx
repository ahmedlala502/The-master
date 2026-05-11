import { useCallback, useEffect, useRef } from 'react';
import { useLocalData } from './LocalDataContext';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

export default function SessionGuard() {
  const { auth, lock, settings } = useLocalData();
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockMinutes = settings.sessionLockMinutes || 60;

  const resetTimer = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (!auth.isAuthenticated || auth.isLocked) return;
    lockTimerRef.current = setTimeout(() => {
      lock();
    }, lockMinutes * 60 * 1000);
  }, [auth.isAuthenticated, auth.isLocked, lock, lockMinutes]);

  useEffect(() => {
    resetTimer();
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [resetTimer]);

  return null;
}

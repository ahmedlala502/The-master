import React, { useMemo } from 'react';
import { User, TrendingUp, CheckCircle2, AlertCircle, Clock, Zap, Award, Activity, Target } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Card } from '../ui/card';
import { calculateMemberMetrics, getPerformanceSummary, generatePerformanceAlerts } from '../../lib/performanceService';
import { useLocalData } from '../LocalDataContext';
import { Task, Status, Member, PerformanceMetrics } from '../../types';
import { formatDistance, parseISO } from 'date-fns';

export default function UserProfilePage() {
  const shouldReduceMotion = useReducedMotion();
  const { user, members, tasks, handovers } = useLocalData();
  const normalizedUserName = user.name.trim().toLowerCase();

  const currentMember = useMemo((): Member => {
    const exactMember = members.find(
      (m: Member) => m.name.trim().toLowerCase() === normalizedUserName
    );

    if (exactMember) return exactMember;

    // Fallback profile so the page never gets stuck if the member registry is missing this user.
    return {
      id: `profile-${normalizedUserName || 'user'}`,
      name: user.name,
      team: user.team || 'Unassigned',
      office: user.office || 'N/A',
      country: user.country || 'N/A',
      role: user.role || 'User',
      tasksCompleted: 0,
      handoversOut: 0,
      onTime: 0,
      updatedAt: new Date().toISOString(),
      status: 'active',
    };
  }, [members, normalizedUserName, user.country, user.name, user.office, user.role, user.team]);

  const metrics = useMemo((): PerformanceMetrics | null => {
    if (!currentMember) return null;
    return calculateMemberMetrics(currentMember.id, currentMember, tasks, handovers);
  }, [currentMember, tasks, handovers]);

  const userTasks = useMemo((): Task[] => {
    return tasks.filter((t: Task) => t.owner.trim().toLowerCase() === normalizedUserName);
  }, [normalizedUserName, tasks]);

  const recentTasks = useMemo((): Task[] => {
    return [...userTasks]
      .sort((a: Task, b: Task) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [userTasks]);

  const completionRatio = useMemo(() => {
    if (userTasks.length === 0) return 0;
    return Math.round((metrics?.tasksCompleted || 0) / userTasks.length * 100);
  }, [metrics?.tasksCompleted, userTasks.length]);

  const workloadRatio = useMemo(() => {
    if (userTasks.length === 0) return 0;
    return Math.round((metrics?.tasksInProgress || 0) / userTasks.length * 100);
  }, [metrics?.tasksInProgress, userTasks.length]);

  const alerts = useMemo((): string[] => {
    return metrics ? generatePerformanceAlerts(metrics) : [];
  }, [metrics]);

  const motionProps = shouldReduceMotion
    ? { initial: false, animate: false as const }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <motion.div
        {...motionProps}
        className="relative overflow-hidden rounded-3xl border border-citrus/20 bg-gradient-to-br from-citrus/15 via-white to-sky/10 p-8"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-citrus/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-sky/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center border border-white/60 shadow-sm">
              <User className="h-10 w-10 text-citrus" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-ink">{user.name}</h1>
              <p className="text-muted font-semibold">{user.role} • {currentMember.team}</p>
              <p className="text-sm text-muted/80 mt-1">{currentMember.office}, {currentMember.country}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <Card className="p-3 bg-white/75 border-white/70">
              <p className="text-xs text-muted">Completion</p>
              <p className="text-2xl font-bold text-ink">{completionRatio}%</p>
            </Card>
            <Card className="p-3 bg-white/75 border-white/70">
              <p className="text-xs text-muted">Workload</p>
              <p className="text-2xl font-bold text-ink">{workloadRatio}%</p>
            </Card>
          </div>
        </div>
      </motion.div>

      <motion.div
        {...motionProps}
        transition={{ delay: shouldReduceMotion ? 0 : 0.08 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <StatCard label="Tasks Completed" value={String(metrics.tasksCompleted)} meta={`${metrics.thisMonthCompleted} this month`} icon={<CheckCircle2 className="w-5 h-5 text-citrus" />} accent="border-citrus" />
        <StatCard label="On-Time Rate" value={`${metrics.onTimeRate}%`} meta="Delivery reliability" icon={<TrendingUp className="w-5 h-5 text-sky" />} accent="border-sky" />
        <StatCard label="Quality Score" value={`${metrics.qualityScore}/100`} meta="Overall performance" icon={<Award className="w-5 h-5 text-emerald" />} accent="border-emerald" />
        <StatCard label="Avg. Duration" value={`${metrics.avgCompletionTime}h`} meta="Per task average" icon={<Clock className="w-5 h-5 text-amber" />} accent="border-amber" />
      </motion.div>

      {alerts.length > 0 && (
        <motion.div
          {...motionProps}
          transition={{ delay: shouldReduceMotion ? 0 : 0.12 }}
          className="rounded-2xl border border-amber/30 bg-amber/5 p-5"
        >
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber mb-2">Performance Alerts</h3>
              <ul className="space-y-1">
                {alerts.map((alert: string, idx: number) => (
                  <li key={idx} className="text-sm text-amber/90">{alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        {...motionProps}
        transition={{ delay: shouldReduceMotion ? 0 : 0.16 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-citrus" />
            Workload Snapshot
          </h3>

          <div className="space-y-4">
            <ProgressRow label="In Progress" value={metrics.tasksInProgress} total={userTasks.length} barClass="bg-sky" />
            <ProgressRow label="Blocked" value={metrics.tasksBlocked} total={userTasks.length} barClass="bg-amber" />
            <ProgressRow label="Done" value={metrics.tasksCompleted} total={userTasks.length} barClass="bg-emerald" />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-citrus" />
            Handover Health
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted">Handovers Out</span><span className="font-bold">{metrics.handoversOut}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Acknowledged</span><span className="font-bold text-emerald">{metrics.handoversAcknowledged}</span></div>
            <p className="pt-2 text-muted">
              {metrics.handoversOut === 0
                ? 'No active handovers.'
                : `${Math.round((metrics.handoversAcknowledged / metrics.handoversOut) * 100)}% acknowledgement rate`}
            </p>
          </div>
        </Card>
      </motion.div>

      <motion.div
        {...motionProps}
        transition={{ delay: shouldReduceMotion ? 0 : 0.2 }}
        className="rounded-2xl border border-ink/10 bg-ink/5 p-6"
      >
        <h3 className="font-semibold text-ink mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-citrus" />
          Performance Summary
        </h3>
        <p className="text-muted">{getPerformanceSummary(metrics)}</p>
      </motion.div>

      <motion.div
        {...motionProps}
        transition={{ delay: shouldReduceMotion ? 0 : 0.24 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-semibold text-ink">Recent Tasks</h3>
        {recentTasks.length > 0 ? (
          <div className="space-y-2">
            {recentTasks.map((task: Task) => (
              <Card key={task.id} className="p-4 transition-colors hover:bg-stone/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink truncate">{task.title}</p>
                    <p className="text-sm text-muted line-clamp-1">{task.details}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.priority === 'High' ? 'bg-red/10 text-red' :
                        task.priority === 'Medium' ? 'bg-amber/10 text-amber' :
                        'bg-blue/10 text-blue'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDistance(parseISO(task.updatedAt), new Date(), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <span className={`text-xs px-3 py-1 rounded-lg font-medium whitespace-nowrap ${
                    task.status === Status.DONE ? 'bg-emerald/10 text-emerald' :
                    task.status === Status.IN_PROGRESS ? 'bg-sky/10 text-sky' :
                    task.status === Status.BLOCKED ? 'bg-red/10 text-red' :
                    'bg-stone text-muted'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted">No tasks assigned yet</p>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({
  label,
  value,
  meta,
  icon,
  accent,
}: {
  label: string;
  value: string;
  meta: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className={`p-6 border-l-4 ${accent}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-muted font-medium">{label}</p>
        {icon}
      </div>
      <p className="text-3xl font-bold text-ink">{value}</p>
      <p className="text-xs text-muted mt-2">{meta}</p>
    </Card>
  );
}

function ProgressRow({
  label,
  value,
  total,
  barClass,
}: {
  label: string;
  value: number;
  total: number;
  barClass: string;
}) {
  const ratio = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-ink">{value} ({ratio}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-stone/80 overflow-hidden">
        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}

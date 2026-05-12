import React, { useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Download, Filter, Plus,
  Search, Trash2, Upload, UserCheck, Users, X,
} from 'lucide-react';
import { useLocalData } from '../LocalDataContext';
import { Status } from '../../types';

const PRESET_ROLES = [
  'Admin', 'Super Admin', 'Regional Manager', 'Country Manager', 'Department Head', 'General Manager',
  'Operations Lead', 'Operations Manager', 'Shift Lead', 'Senior Operations Agent', 'Operations Agent',
  'Community Lead', 'Community Manager', 'Creator Coverage Lead', 'Community Agent',
  'Analyst', 'Reporting Specialist', 'Support Agent', 'QA Specialist', 'Viewer',
];

function isAdminUser(role: string): boolean {
  const r = role.toLowerCase();
  return r.includes('admin') || r.includes('manager') || r.includes('lead') || r.includes('head') || r.includes('director') || r.includes('general');
}

const inputClass = 'w-full bg-stone/50 border border-dawn rounded-xl px-4 py-3 font-bold text-sm focus:border-citrus outline-none';

export default function UserManagement() {
  const {
    user, settings, members, pendingSignups, tasks, handovers,
    addMember, updateMember, deleteMember, approveSignup, rejectSignup,
    updateUser, isMasterAdmin,
  } = useLocalData();

  const emptyMember = { name: '', role: PRESET_ROLES[0], team: settings.teams?.[0] || 'Operations Team', office: user.office, country: user.country, email: '', password: '' };
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState(emptyMember);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof members[0]>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const getUserMetrics = (name: string) => {
    const owned = tasks.filter(t => t.owner === name);
    const completed = owned.filter(t => t.status === Status.DONE).length;
    const blocked = owned.filter(t => t.status === Status.BLOCKED).length;
    const ho = handovers.filter(h => h.outgoing === name);
    const acked = ho.filter(h => h.status === 'Acknowledged').length;
    const onTime = ho.length > 0 ? Math.round((acked / ho.length) * 100) : completed > 0 ? Math.round((completed / Math.max(owned.length, 1)) * 100) : 100;
    const productivity = Math.round(Math.min(100, completed * 12 + ho.length * 6 + Math.max(0, 20 - blocked * 8)));
    return { total: owned.length, completed, blocked, handoversOut: ho.length, onTime, productivity };
  };

  const teams = useMemo(() => settings.teams || [], [settings.teams]);

  const filteredMembers = useMemo(() => {
    let list = members;
    if (teamFilter !== 'all') list = list.filter(m => m.team === teamFilter);
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      list = list.filter(m => [m.name, m.role, m.office, m.team].join(' ').toLowerCase().includes(q));
    }
    return list;
  }, [members, teamFilter, memberSearch]);

  const teamStats = useMemo(() => {
    const stats: Record<string, number> = { all: members.length };
    teams.forEach(t => { stats[t] = members.filter(m => m.team === t).length; });
    return stats;
  }, [members, teams]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="relaxed-title text-2xl">User Management</h3>
        <p className="text-sm font-medium text-muted">Create team members, assign roles, and manage access — scoped by team.</p>
      </div>

      {/* Team filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setTeamFilter('all')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${teamFilter === 'all' ? 'bg-ink text-white shadow-lg' : 'bg-stone border border-dawn text-muted hover:text-ink'}`}
        >
          All Teams ({teamStats.all})
        </button>
        {teams.map(t => (
          <button
            key={t}
            onClick={() => setTeamFilter(t)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${teamFilter === t ? 'bg-ink text-white shadow-lg' : 'bg-stone border border-dawn text-muted hover:text-ink'}`}
          >
            {t} ({teamStats[t] || 0})
          </button>
        ))}
      </div>

      {/* Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="Search by name, role, office…"
            className="w-full bg-stone/50 border border-dawn rounded-xl pl-10 pr-10 py-3 text-sm font-bold focus:border-citrus outline-none"
          />
          {memberSearch && (
            <button onClick={() => setMemberSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {isMasterAdmin && (
          <>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(members, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `trygc-users-${new Date().toISOString().split('T')[0]}.json`; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-stone border border-dawn rounded-xl text-xs font-black uppercase tracking-widest text-muted hover:text-ink transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <label className="flex items-center gap-2 px-4 py-3 bg-stone border border-dawn rounded-xl text-xs font-black uppercase tracking-widest text-muted hover:text-ink cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" /> Import
              <input type="file" accept=".json" className="hidden" onChange={e => {
                const file = e.target.files?.[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const data = JSON.parse(ev.target?.result as string);
                    if (Array.isArray(data)) { data.forEach(async (m: any) => { if (m.name) await addMember(m); }); setImportSuccess(`Imported ${data.length} users.`); setTimeout(() => setImportSuccess(''), 3000); }
                    else { setImportError('Expected an array of users.'); setTimeout(() => setImportError(''), 3000); }
                  } catch { setImportError('Invalid JSON file.'); setTimeout(() => setImportError(''), 3000); }
                };
                reader.readAsText(file); e.target.value = '';
              }} />
            </label>
          </>
        )}
        <button
          onClick={() => { setShowAddMember(v => !v); setNewMemberForm({ ...emptyMember, team: teamFilter !== 'all' ? teamFilter : emptyMember.team }); }}
          className="flex items-center gap-2 px-5 py-3 bg-ink text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New User
        </button>
      </div>

      {importError && <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600"><AlertCircle className="w-3.5 h-3.5" /> {importError}</div>}
      {importSuccess && <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-xs font-bold text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> {importSuccess}</div>}

      {/* Pending signups */}
      {pendingSignups.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Pending Access Requests</p>
              <p className="text-sm font-medium text-amber-900/80 mt-1">New sign-ups wait here until you approve or reject them.</p>
            </div>
            <div className="px-3 py-2 rounded-2xl bg-white text-amber-700 text-xs font-black uppercase tracking-widest">{pendingSignups.length} pending</div>
          </div>
          <div className="space-y-3">
            {pendingSignups.map(req => (
              <div key={req.id} className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-white px-4 py-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black shrink-0">
                  {req.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-ink truncate">{req.name}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Pending</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted mt-1">
                    <span>{req.email}</span><span className="text-muted/30">·</span>
                    <span>{req.team}</span><span className="text-muted/30">·</span>
                    <span>{req.office}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => approveSignup(req.id)} className="px-3 py-2 rounded-xl bg-ink text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">Approve</button>
                  <button onClick={() => rejectSignup(req.id)} className="px-3 py-2 rounded-xl bg-white border border-dawn text-[10px] font-black uppercase tracking-widest text-muted hover:text-red-500 hover:border-red-200 transition-all">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add member form */}
      {showAddMember && (
        <div className="p-6 bg-citrus/5 border-2 border-citrus/20 rounded-3xl space-y-5">
          <div className="flex items-center gap-2 text-citrus mb-1">
            <Plus className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Add New User</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name"><input className={inputClass} value={newMemberForm.name} onChange={e => setNewMemberForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sara Ahmed" /></Field>
            <Field label="Email"><input className={inputClass} type="email" value={newMemberForm.email} onChange={e => setNewMemberForm(f => ({ ...f, email: e.target.value }))} placeholder="name@company.com" /></Field>
            <Field label="Role">
              <select className={inputClass} value={PRESET_ROLES.includes(newMemberForm.role) ? newMemberForm.role : '__custom__'} onChange={e => { if (e.target.value !== '__custom__') setNewMemberForm(f => ({ ...f, role: e.target.value })); }}>
                {PRESET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="__custom__">Custom…</option>
              </select>
              {!PRESET_ROLES.includes(newMemberForm.role) && <input className={`${inputClass} mt-2`} value={newMemberForm.role} onChange={e => setNewMemberForm(f => ({ ...f, role: e.target.value }))} placeholder="Custom role…" />}
            </Field>
            <Field label="Team">
              <select className={inputClass} value={newMemberForm.team} onChange={e => setNewMemberForm(f => ({ ...f, team: e.target.value }))}>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Office"><input className={inputClass} value={newMemberForm.office} onChange={e => setNewMemberForm(f => ({ ...f, office: e.target.value }))} placeholder="e.g. Cairo HQ" /></Field>
            <Field label="Country Code"><input className={inputClass} value={newMemberForm.country} onChange={e => setNewMemberForm(f => ({ ...f, country: e.target.value }))} placeholder="EG / KSA / UAE…" maxLength={4} /></Field>
            <Field label="Temporary Password"><input className={inputClass} type="password" value={newMemberForm.password} onChange={e => setNewMemberForm(f => ({ ...f, password: e.target.value }))} placeholder="Set first password" /></Field>
          </div>
          <div className="flex gap-3">
            <button onClick={async () => { if (!newMemberForm.name.trim()) return; await addMember(newMemberForm); setShowAddMember(false); setNewMemberForm(emptyMember); }} className="px-6 py-2.5 bg-citrus text-ink rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all">Create User</button>
            <button onClick={() => setShowAddMember(false)} className="px-6 py-2.5 bg-stone border border-dawn text-muted rounded-xl text-xs font-black uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      {/* Member list */}
      <div className="space-y-2">
        {filteredMembers.map(m => {
          const isCurrentUser = m.name === user.name;
          const isEditing = editingMemberId === m.id;
          const metrics = getUserMetrics(m.name);
          return (
            <div key={m.id} className={`rounded-2xl border transition-all overflow-hidden ${isCurrentUser ? 'border-citrus bg-citrus/3' : isEditing ? 'border-ink/20 bg-stone/30' : 'border-dawn bg-white'}`}>
              <div className="flex items-center gap-4 p-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${isCurrentUser ? 'bg-ink text-white' : 'bg-stone border border-dawn text-muted'}`}>
                  {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-ink truncate">{m.name}</span>
                    {isCurrentUser && <span className="text-[8px] font-black uppercase tracking-widest text-citrus">You</span>}
                    {m.role === 'Super Admin' && <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-citrus/10 text-citrus rounded">Super Admin</span>}
                    {isAdminUser(m.role || '') && m.role !== 'Super Admin' && <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">Admin</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-muted uppercase tracking-widest">
                    <span>{m.role || 'No role'}</span>
                    <span className="text-muted/30">·</span>
                    <span className={`px-1.5 py-0.5 rounded ${m.team?.toLowerCase().includes('operations') ? 'bg-blue-50 text-blue-600' : m.team?.toLowerCase().includes('community') ? 'bg-purple-50 text-purple-600' : 'bg-stone text-muted'}`}>{m.team}</span>
                    <span className="text-muted/30">·</span>
                    <span>{m.office}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted shrink-0 mr-2">
                  <span className="px-2 py-1 bg-stone rounded-lg">{metrics.completed} done</span>
                  <span className="px-2 py-1 bg-stone rounded-lg">{metrics.productivity}%</span>
                  <span className="px-2 py-1 bg-stone rounded-lg">{metrics.onTime}% on-time</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { if (isEditing) { setEditingMemberId(null); } else { setEditingMemberId(m.id); setEditForm({ name: m.name, role: m.role, team: m.team, office: m.office, country: m.country }); } }}
                    className={`p-2 rounded-lg transition-all ${isEditing ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-stone'}`}
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  {deleteConfirmId === m.id ? (
                    <>
                      <button onClick={async () => { await deleteMember(m.id); setDeleteConfirmId(null); }} className="px-2 py-1.5 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase">Confirm</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1.5 bg-stone border border-dawn rounded-lg text-[9px] font-black uppercase text-muted">No</button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(m.id)} disabled={isCurrentUser || (m.role === 'Super Admin' && !isMasterAdmin)} className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {isEditing && (
                <div className="px-5 pb-5 border-t border-dawn/50 pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full Name"><input className={inputClass} value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></Field>
                    <Field label="Role">
                      <select className={inputClass} value={PRESET_ROLES.includes(editForm.role || '') ? editForm.role || '' : '__custom__'} onChange={e => { if (e.target.value !== '__custom__') setEditForm(f => ({ ...f, role: e.target.value })); }}>
                        {PRESET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        <option value="__custom__">Custom…</option>
                      </select>
                      {!PRESET_ROLES.includes(editForm.role || '') && <input className={`${inputClass} mt-2`} value={editForm.role || ''} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} placeholder="Custom role…" />}
                    </Field>
                    <Field label="Team">
                      <select className={inputClass} value={editForm.team || ''} onChange={e => setEditForm(f => ({ ...f, team: e.target.value }))}>
                        {teams.map(t => <option key={t} value={t}>{t}</option>)}
                        {editForm.team && !teams.includes(editForm.team) && <option value={editForm.team}>{editForm.team}</option>}
                      </select>
                    </Field>
                    <Field label="Office"><input className={inputClass} value={editForm.office || ''} onChange={e => setEditForm(f => ({ ...f, office: e.target.value }))} /></Field>
                    <Field label="Country"><input className={inputClass} value={editForm.country || ''} onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))} maxLength={4} /></Field>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={async () => { await updateMember(m.id, editForm); if (isCurrentUser && editForm.name && editForm.role) { await updateUser({ name: editForm.name, role: editForm.role, office: editForm.office || user.office, country: editForm.country || user.country }); } setEditingMemberId(null); }} className="px-5 py-2 bg-ink text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all">Save Changes</button>
                    <button onClick={() => setEditingMemberId(null)} className="px-5 py-2 bg-stone border border-dawn rounded-xl text-xs font-black uppercase tracking-widest text-muted">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredMembers.length === 0 && (
          <div className="py-16 text-center text-muted/40">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-black">No users match your search.</p>
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between p-4 bg-stone/40 rounded-2xl border border-dawn text-[10px] font-bold text-muted">
        <span>
          {filteredMembers.length} users shown · {members.filter(m => m.role === 'Super Admin').length} super admins · {teams.map(t => `${members.filter(m => m.team === t).length} ${t}`).join(' · ')}
        </span>
        <span>Active: <b className="text-ink">{user.name}</b></span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2 block">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}

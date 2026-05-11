import { Status, Priority, Shift, Task, Handover, Office, User, Member, HandoverTemplate } from './types';

export const COUNTRY_FLAGS: Record<string, string> = {
  'KSA': '🇸🇦',
  'UAE': '🇦🇪',
  'KW': '🇰🇼',
  'EG': '🇪🇬',
  'BH': '🇧🇭',
  'QA': '🇶🇦',
  'OM': '🇴🇲',
};

// Admin credentials are now set at runtime via environment or first-run setup
// These defaults are ONLY used for initial workspace seeding and MUST be changed immediately
export const DEFAULT_MASTER_ADMIN_EMAIL = import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'admin@trygc.local';
export const DEFAULT_MASTER_ADMIN_PASSWORD = import.meta.env.VITE_MASTER_ADMIN_PASSWORD || 'Admin123!';
export const MASTER_ADMIN_EMAIL = DEFAULT_MASTER_ADMIN_EMAIL;
export const MASTER_ADMIN_PASSWORD = DEFAULT_MASTER_ADMIN_PASSWORD || '';
export const SUPER_ADMIN_PASSWORD = MASTER_ADMIN_PASSWORD;

export const APP_VERSION = '2.0.0';
export const APP_NAME = 'TryGC Hub Manager';

export const INITIAL_USER: User = {
  name: 'System Administrator',
  role: 'Super Admin',
  office: 'Cairo HQ',
  country: 'EG',
  email: MASTER_ADMIN_EMAIL,
  password: MASTER_ADMIN_PASSWORD,
  isSuperAdmin: true,
};

export const TEAMS = [
  'Operations Team',
  'Community Team',
  'QA Team',
  'Creative Team',
];

export const OFFICES: Office[] = [
  { id: '1', name: 'Riyadh Office', country: 'KSA', lead: 'Mona KSA', shift: Shift.MORNING, timezone: 'Asia/Riyadh' },
  { id: '2', name: 'Dubai Office', country: 'UAE', lead: 'Nour UAE', shift: Shift.MORNING, timezone: 'Asia/Dubai' },
  { id: '3', name: 'Kuwait Office', country: 'KW', lead: 'Fahad KW', shift: Shift.NIGHT, timezone: 'Asia/Kuwait' },
  { id: '4', name: 'Cairo HQ', country: 'EG', lead: 'Ahmed Essmat', shift: Shift.MID, timezone: 'Africa/Cairo' },
];

export const INITIAL_MEMBERS: Member[] = [
  { id: 'm1', name: 'Ahmed Essmat', team: 'Operations Team', office: 'Cairo HQ', country: 'EG', role: 'Super Admin', tasksCompleted: 18, handoversOut: 7, onTime: 16, status: 'active', avatar: undefined },
  { id: 'm2', name: 'Mona KSA', team: 'Community Team', office: 'Riyadh Office', country: 'KSA', role: 'Community Lead', tasksCompleted: 14, handoversOut: 4, onTime: 12, status: 'active', avatar: undefined },
  { id: 'm3', name: 'Nour UAE', team: 'Operations Team', office: 'Dubai Office', country: 'UAE', role: 'Shift Lead', tasksCompleted: 11, handoversOut: 3, onTime: 10, status: 'active', avatar: undefined },
  { id: 'm4', name: 'Fahad KW', team: 'Community Team', office: 'Kuwait Office', country: 'KW', role: 'Creator Coverage Lead', tasksCompleted: 9, handoversOut: 5, onTime: 7, status: 'active', avatar: undefined },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Audit Tashas missing coverage links',
    country: 'KSA',
    office: 'Riyadh Office',
    team: 'Community Team',
    owner: 'Mona KSA',
    shift: Shift.MORNING,
    priority: Priority.HIGH,
    status: Status.BLOCKED,
    due: new Date(Date.now() + 2 * 86400000).toISOString(),
    details: 'Waiting for influencer proof links from agents. Client is chasing daily.',
    carry: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creatorId: 'system',
    tags: ['urgent', 'client-facing'],
    estimatedHours: 4,
    blockedReason: 'Missing influencer proof links',
    blockedSince: new Date().toISOString(),
  },
  {
    id: 't2',
    title: 'Daily client snapshot UAE Restaurants',
    country: 'UAE',
    office: 'Dubai Office',
    team: 'Operations Team',
    owner: 'Nour UAE',
    shift: Shift.MORNING,
    priority: Priority.MEDIUM,
    status: Status.IN_PROGRESS,
    due: new Date(Date.now() + 86400000).toISOString(),
    details: 'Prepare daily coverage snapshot for UAE restaurant clients including engagement metrics and posting status.',
    carry: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creatorId: 'system',
    tags: ['daily', 'reporting'],
    estimatedHours: 2,
  },
  {
    id: 't3',
    title: 'Weekly QA review for Kuwait campaign',
    country: 'KW',
    office: 'Kuwait Office',
    team: 'QA Team',
    owner: 'Fahad KW',
    shift: Shift.NIGHT,
    priority: Priority.LOW,
    status: Status.BACKLOG,
    due: new Date(Date.now() + 5 * 86400000).toISOString(),
    details: 'Review all deliverables for the Kuwait campaign before Friday deadline.',
    carry: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creatorId: 'system',
    tags: ['weekly', 'qa'],
    estimatedHours: 6,
  },
];

export const INITIAL_HANDOVERS: Handover[] = [
  {
    id: 'h1',
    date: new Date().toISOString().split('T')[0],
    fromShift: Shift.MORNING,
    toShift: Shift.MID,
    fromOffice: 'Riyadh Office',
    toOffice: 'Cairo HQ',
    team: 'Operations Team',
    country: 'KSA',
    outgoing: 'Mona KSA',
    incoming: 'Ahmed Essmat',
    status: 'Pending',
    watchouts: 'Please prioritize the Tashas audit as the client is chasing. Ensure all coverage links are verified before EOD.',
    taskIds: ['t1'],
    createdAt: new Date().toISOString(),
    creatorId: 'system',
    quality: 'good',
  },
];

export const HANDOVER_TEMPLATES: HandoverTemplate[] = [
  {
    id: 'tpl-morning-mid',
    name: 'Morning → Mid Standard',
    description: 'Standard handover template for morning to mid shift transition',
    team: 'Operations Team',
    fromShift: Shift.MORNING,
    toShift: Shift.MID,
    defaultWatchouts: '1. Review all carry-over items from morning shift\n2. Check SLA compliance for active campaigns\n3. Verify all blocked items have escalation paths\n4. Confirm next shift lead availability',
    createdBy: 'system',
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'tpl-mid-night',
    name: 'Mid → Night Handover',
    description: 'Critical handover template for mid to night shift with emphasis on APAC clients',
    team: 'Operations Team',
    fromShift: Shift.MID,
    toShift: Shift.NIGHT,
    defaultWatchouts: '1. Flag all APAC client deliverables\n2. Ensure coverage reports are generated\n3. Check influencer posting schedules\n4. Verify emergency contact availability',
    createdBy: 'system',
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  },
];

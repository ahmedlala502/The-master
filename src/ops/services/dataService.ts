/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CampaignStage } from '../constants';
import { Campaign, CampaignInfluencer, Blocker, Handover, Task } from '../types';

const buildCampaignId = (seed: number) => `C-${Date.now()}-${seed}-${Math.random().toString(36).slice(2, 7)}`;

const normalizeCampaignIds = (campaigns: Campaign[]) => {
  const usedIds = new Set<string>();
  let hasChanges = false;

  const normalized = campaigns.map((campaign, index) => {
    const existingId = String((campaign as any).id ?? '').trim();
    let finalId = existingId;

    if (!finalId || usedIds.has(finalId)) {
      hasChanges = true;
      do {
        finalId = buildCampaignId(index + 1);
      } while (usedIds.has(finalId));
    }

    usedIds.add(finalId);
    return finalId === campaign.id ? campaign : { ...campaign, id: finalId };
  });

  return { normalized, hasChanges };
};

// Seeded from backup trygc-backup-1778656311825.json
const INITIAL_CAMPAIGNS_DATA: Campaign[] = [
  {
    id: 'C-001', name: 'Red Bull Summer KSA', clientId: 'c1', brandId: 'b1',
    stage: 14 as any, status: 'Active', country: 'KSA', budget: 50000, budgetType: 'USD',
    recordHealth: 'Healthy', targetInfluencers: 50, targetPostingCoverage: 100,
    currentOwner: 'Sarah A.', nextAction: 'Reconcile visit logs',
    createdAt: 1778223025420, updatedAt: 1778655025420, createdBy: 'system',
    city: 'Riyadh', objective: 'Brand Awareness', platforms: ['Instagram', 'TikTok'],
    type: 'Influencer Marketing', startDate: '2024-06-01', endDate: '2024-08-31',
    deliverables: '2 Stories, 1 Reel', tags: '#RedBullSummer', mentions: '@redbullksa',
    links: 'redbull.com/summer', visitRequired: true, productDetails: 'Summer Edition Cans',
    approvalFlow: 'Standard', reportingCadence: 'Weekly', restrictions: 'None',
    internalOwners: ['Sarah A.'], clientOwners: ['John D.'],
    influencerCriteria: 'Gen Z, Outdoor lifestyle',
  },
  {
    id: 'C-002', name: 'STC Pay Launch', clientId: 'c2', brandId: 'b2',
    stage: 6 as any, status: 'Active', country: 'UAE', budget: 120000, budgetType: 'USD',
    recordHealth: 'Healthy', targetInfluencers: 200, targetPostingCoverage: 400,
    currentOwner: 'Ahmed E.', nextAction: 'Finalize influencer selection',
    createdAt: 1778482225420, updatedAt: 1778655025420, createdBy: 'system',
    city: 'Dubai', objective: 'User Acquisition', platforms: ['Snapchat', 'TikTok'],
    type: 'Performance', startDate: '2024-07-01', endDate: '2024-07-15',
    deliverables: '1 Snap Ad, 1 TikTok Spark', tags: '#STCPayUAE', mentions: '@stcpay_uae',
    links: 'stcpay.com.ae/launch', visitRequired: false, productDetails: 'Mobile App',
    approvalFlow: 'High Priority', reportingCadence: 'Daily', restrictions: 'No competitors',
    internalOwners: ['Ahmed E.'], clientOwners: ['Sarah M.'],
    influencerCriteria: 'Tech savvy, UAE based',
  },
];

const INITIAL_INFLUENCERS_DATA: CampaignInfluencer[] = [
  {
    id: 'CI-001', campaignId: 'C-001', influencerId: 'INF-101', username: '@lifestyle_sa',
    platform: 'Instagram', status: 'Confirmed', niche: 'Lifestyle', followerRange: '100k-500k',
    invitationWave: 1, reminder1Sent: true, reminder2Sent: false, visitCompleted: true,
    coverageReceived: true, qaStatus: 'Approved', ownerId: 'Sarah A.',
    createdAt: 1778655025420, updatedAt: 1778655025420, createdBy: 'system',
  },
  {
    id: 'CI-002', campaignId: 'C-001', influencerId: 'INF-102', username: '@travel_vibe',
    platform: 'TikTok', status: 'Pending', niche: 'Travel', followerRange: '50k-100k',
    invitationWave: 1, reminder1Sent: false, reminder2Sent: false, visitCompleted: false,
    coverageReceived: false, qaStatus: 'Pending', ownerId: 'Sarah A.', city: 'Dubai',
    createdAt: 1778655025420, updatedAt: 1778655025420, createdBy: 'system',
  },
  {
    id: 'CI-003', campaignId: 'C-002', influencerId: 'INF-103', username: '@tech_guy_uae',
    platform: 'Snapchat', status: 'Invited', niche: 'Tech', followerRange: '10k-50k',
    invitationWave: 2, reminder1Sent: true, reminder2Sent: true, visitCompleted: false,
    coverageReceived: false, qaStatus: 'Pending', ownerId: 'Ahmed E.', city: 'Abu Dhabi',
    createdAt: 1778655025420, updatedAt: 1778655025420, createdBy: 'system',
  },
  {
    id: 'CI-004', campaignId: 'C-001', influencerId: 'INF-104', username: '@foodie_riyadh',
    platform: 'Instagram', status: 'Confirmed', niche: 'Food', followerRange: '500k-1M',
    invitationWave: 1, reminder1Sent: true, reminder2Sent: false, visitCompleted: true,
    coverageReceived: false, qaStatus: 'Pending', ownerId: 'Sarah A.', city: 'Riyadh',
    createdAt: 1778655025420, updatedAt: 1778655025420, createdBy: 'system',
  },
];

const INITIAL_BLOCKERS_DATA: Blocker[] = [
  {
    id: 'B-001', campaignId: 'C-001', summary: 'Visit Proof Mismatch for @lifestyle_sa',
    impact: 'QA blocking for 12 posts', status: 'Open', severity: 'Critical',
    ownerId: 'Sarah A.', createdAt: 1778655025420, updatedAt: 1778655025420, createdBy: 'system',
  },
];

const INITIAL_TASKS_DATA: Task[] = [
  {
    id: 'TSK-1778652654446', title: 'Assign owner for task manager per shift', description: '',
    ownerId: 'Ahmed E.', campaignId: 'N/A', priority: 'High', dueDate: 1778662800000,
    completed: false, createdAt: 1778652654446, updatedAt: 1778652654446, createdBy: 'admin',
  },
  {
    id: 'TSK-103', title: 'Archive June coverage receipts', description: 'Batch process in GDrive',
    ownerId: 'Mona K.', campaignId: 'Generic Ops', priority: 'Low', dueDate: 1776816000000,
    completed: false, createdAt: 1778652582144, updatedAt: 1778652582144, createdBy: 'system',
  },
  {
    id: 'TSK-104', title: 'Escalation: Missing recovery Jeddah', description: 'Contact restaurant manager',
    ownerId: 'Sarah A.', campaignId: 'Hungerstation', priority: 'High', dueDate: 1776470400000,
    completed: false, createdAt: 1778652582144, updatedAt: 1778652582144, createdBy: 'system',
  },
];

const INITIAL_HANDOVERS_DATA: Handover[] = [
  {
    id: 'HO-1778620084142', handoffDate: '2026-05-13', fromShift: 'Morning', toShift: 'Mid',
    team: 'Operations', region: 'Regional', outgoingLead: 'Sarah A.', incomingLead: 'Ahmed E.',
    notes: '', taskIds: [], status: 'Acknowledged', createdAt: 1778620084142,
    updatedAt: 1778620207031, createdBy: 'admin', acknowledgedAt: 1778620207031,
  },
  {
    id: 'HO-1778620079406', handoffDate: '2026-05-13', fromShift: 'Morning', toShift: 'Mid',
    team: 'Operations', region: 'Regional', outgoingLead: 'Sarah A.', incomingLead: 'Ahmed E.',
    notes: '', taskIds: [], status: 'Reviewed', createdAt: 1778620079406,
    updatedAt: 1778620205943, createdBy: 'admin', acknowledgedAt: 1778620083015,
    reviewedAt: 1778620205943,
  },
  {
    id: 'HO-1778620077935', handoffDate: '2026-05-13', fromShift: 'Morning', toShift: 'Mid',
    team: 'Operations', region: 'Regional', outgoingLead: 'Sarah A.', incomingLead: 'Ahmed E.',
    notes: '', taskIds: [], status: 'Pending', createdAt: 1778620077935,
    updatedAt: 1778620077935, createdBy: 'admin',
  },
  {
    id: 'HO-001', handoffDate: '2026-05-12', fromShift: 'Morning', toShift: 'Mid',
    team: 'Operations', region: 'KSA / UAE', outgoingLead: 'Sarah A.', incomingLead: 'Ahmed E.',
    status: 'Pending',
    notes: 'Prioritize visit-proof follow-up and confirm missing recovery owners before the mid shift fully picks up.',
    taskIds: ['TSK-101', 'TSK-104'], createdAt: 1778597382573, updatedAt: 1778611782573, createdBy: 'system',
  },
  {
    id: 'HO-002', handoffDate: '2026-05-11', fromShift: 'Mid', toShift: 'Night',
    team: 'Coverage', region: 'KSA', outgoingLead: 'Ahmed E.', incomingLead: 'Mona K.',
    status: 'Reviewed',
    notes: 'All outbound creator reminders sent. Night shift should only monitor late creator replies and archive any final proofs.',
    taskIds: ['TSK-102', 'TSK-103'], acknowledgedAt: 1778575782573,
    createdAt: 1778532582573, updatedAt: 1778620076687, createdBy: 'system',
    reviewedAt: 1778620076687,
  },
];

const loadFromStorage = (key: string, initialData: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialData;
  } catch (e) {
    return initialData;
  }
};

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
};

// Clear any stale demo data from old storage keys
(['GC_CAMPAIGNS', 'GC_INFLUENCERS', 'GC_BLOCKERS', 'GC_TASKS', 'GC_HANDOVERS'] as const).forEach(key => {
  localStorage.removeItem(key);
});

// Versioned keys — ensures any previously stored demo data is ignored
const STORAGE_KEYS = {
  campaigns: 'GC_CAMPAIGNS_V2',
  influencers: 'GC_INFLUENCERS_V2',
  blockers: 'GC_BLOCKERS_V2',
  tasks: 'GC_TASKS_V2',
  handovers: 'GC_HANDOVERS_V2',
};

export let CAMPAIGNS_DATA: Campaign[] = loadFromStorage(STORAGE_KEYS.campaigns, INITIAL_CAMPAIGNS_DATA);
export let INFLUENCERS_DATA: CampaignInfluencer[] = loadFromStorage(STORAGE_KEYS.influencers, INITIAL_INFLUENCERS_DATA);
export let BLOCKERS_DATA: Blocker[] = loadFromStorage(STORAGE_KEYS.blockers, INITIAL_BLOCKERS_DATA);
export let TASKS_DATA: Task[] = loadFromStorage(STORAGE_KEYS.tasks, INITIAL_TASKS_DATA);
export let HANDOVERS_DATA: Handover[] = loadFromStorage(STORAGE_KEYS.handovers, INITIAL_HANDOVERS_DATA);

const hydratedCampaigns = normalizeCampaignIds(CAMPAIGNS_DATA);
CAMPAIGNS_DATA = hydratedCampaigns.normalized;
if (hydratedCampaigns.hasChanges) {
  saveToStorage(STORAGE_KEYS.campaigns, CAMPAIGNS_DATA);
}

// Service Methods
export const dataService = {
  getCampaigns: () => [...CAMPAIGNS_DATA],
  updateCampaign: (id: string, updates: Partial<Campaign>) => {
    const targetIndex = CAMPAIGNS_DATA.findIndex((campaign) => campaign.id === id);
    if (targetIndex === -1) return [...CAMPAIGNS_DATA];

    CAMPAIGNS_DATA = CAMPAIGNS_DATA.map((campaign, index) =>
      index === targetIndex ? { ...campaign, ...updates, updatedAt: Date.now() } : campaign
    );
    saveToStorage(STORAGE_KEYS.campaigns, CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  addCampaign: (campaign: Campaign) => {
    const usedIds = new Set(CAMPAIGNS_DATA.map((item) => item.id));
    let nextId = String((campaign as any).id ?? '').trim();
    if (!nextId || usedIds.has(nextId)) {
      do {
        nextId = buildCampaignId(usedIds.size + 1);
      } while (usedIds.has(nextId));
    }

    CAMPAIGNS_DATA = [{ ...campaign, id: nextId, createdAt: Date.now(), updatedAt: Date.now() }, ...CAMPAIGNS_DATA];
    saveToStorage(STORAGE_KEYS.campaigns, CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  addCampaigns: (campaigns: Campaign[]) => {
    const usedIds = new Set(CAMPAIGNS_DATA.map((item) => item.id));
    const safeCampaigns = campaigns.map((campaign, index) => {
      let nextId = String((campaign as any).id ?? '').trim();
      if (!nextId || usedIds.has(nextId)) {
        do {
          nextId = buildCampaignId(index + 1);
        } while (usedIds.has(nextId));
      }
      usedIds.add(nextId);
      return { ...campaign, id: nextId };
    });

    CAMPAIGNS_DATA = [...safeCampaigns, ...CAMPAIGNS_DATA];
    saveToStorage(STORAGE_KEYS.campaigns, CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  getTasks: () => [...TASKS_DATA],
  updateTask: (id: string, updates: Partial<Task>) => {
    TASKS_DATA = TASKS_DATA.map(t => t.id === id ? { ...t, ...updates } : t);
    saveToStorage(STORAGE_KEYS.tasks, TASKS_DATA);
    return [...TASKS_DATA];
  },
  addTask: (task: Task) => {
    TASKS_DATA = [task, ...TASKS_DATA];
    saveToStorage(STORAGE_KEYS.tasks, TASKS_DATA);
    return [...TASKS_DATA];
  },
  getHandovers: () => [...HANDOVERS_DATA],
  updateHandover: (id: string, updates: Partial<Handover>) => {
    HANDOVERS_DATA = HANDOVERS_DATA.map((handover) =>
      handover.id === id ? { ...handover, ...updates, updatedAt: Date.now() } : handover
    );
    saveToStorage(STORAGE_KEYS.handovers, HANDOVERS_DATA);
    return [...HANDOVERS_DATA];
  },
  addHandover: (handover: Handover) => {
    HANDOVERS_DATA = [handover, ...HANDOVERS_DATA];
    saveToStorage(STORAGE_KEYS.handovers, HANDOVERS_DATA);
    return [...HANDOVERS_DATA];
  },
  deleteHandover: (id: string) => {
    HANDOVERS_DATA = HANDOVERS_DATA.filter((handover) => handover.id !== id);
    saveToStorage(STORAGE_KEYS.handovers, HANDOVERS_DATA);
    return [...HANDOVERS_DATA];
  },
  clearTasks: () => {
    TASKS_DATA = [];
    saveToStorage(STORAGE_KEYS.tasks, TASKS_DATA);
    return [...TASKS_DATA];
  },
  getBlockers: () => [...BLOCKERS_DATA],
  updateBlocker: (id: string, updates: Partial<Blocker>) => {
    BLOCKERS_DATA = BLOCKERS_DATA.map(blocker => blocker.id === id ? { ...blocker, ...updates, updatedAt: Date.now() } : blocker);
    saveToStorage(STORAGE_KEYS.blockers, BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  addBlocker: (blocker: Blocker) => {
    BLOCKERS_DATA = [blocker, ...BLOCKERS_DATA];
    saveToStorage(STORAGE_KEYS.blockers, BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  clearBlockers: () => {
    BLOCKERS_DATA = [];
    saveToStorage(STORAGE_KEYS.blockers, BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  getInfluencers: () => [...INFLUENCERS_DATA],
  updateInfluencer: (id: string, updates: Partial<CampaignInfluencer>) => {
    INFLUENCERS_DATA = INFLUENCERS_DATA.map(inf => inf.id === id ? { ...inf, ...updates, updatedAt: Date.now() } : inf);
    saveToStorage(STORAGE_KEYS.influencers, INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  addInfluencers: (influencers: CampaignInfluencer[]) => {
    INFLUENCERS_DATA = [...influencers, ...INFLUENCERS_DATA];
    saveToStorage(STORAGE_KEYS.influencers, INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  clearInfluencers: () => {
    INFLUENCERS_DATA = [];
    saveToStorage(STORAGE_KEYS.influencers, INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  clearCampaigns: () => {
    CAMPAIGNS_DATA = [];
    saveToStorage(STORAGE_KEYS.campaigns, CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  clearWorkspaceData: () => {
    CAMPAIGNS_DATA = [];
    INFLUENCERS_DATA = [];
    BLOCKERS_DATA = [];
    TASKS_DATA = [];
    HANDOVERS_DATA = [];
    saveToStorage(STORAGE_KEYS.campaigns, CAMPAIGNS_DATA);
    saveToStorage(STORAGE_KEYS.influencers, INFLUENCERS_DATA);
    saveToStorage(STORAGE_KEYS.blockers, BLOCKERS_DATA);
    saveToStorage(STORAGE_KEYS.tasks, TASKS_DATA);
    saveToStorage(STORAGE_KEYS.handovers, HANDOVERS_DATA);
    return {
      campaigns: [...CAMPAIGNS_DATA],
      influencers: [...INFLUENCERS_DATA],
      blockers: [...BLOCKERS_DATA],
      tasks: [...TASKS_DATA],
      handovers: [...HANDOVERS_DATA],
    };
  },
  bulkUpdateInfluencerStatus: (ids: string[], status: CampaignInfluencer['status']) => {
    INFLUENCERS_DATA = INFLUENCERS_DATA.map(inf => ids.includes(inf.id) ? { ...inf, status, updatedAt: Date.now() } : inf);
    saveToStorage(STORAGE_KEYS.influencers, INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  deleteCampaign: (id: string) => {
    CAMPAIGNS_DATA = CAMPAIGNS_DATA.filter(c => c.id !== id);
    saveToStorage(STORAGE_KEYS.campaigns, CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  deleteTask: (id: string) => {
    TASKS_DATA = TASKS_DATA.filter(t => t.id !== id);
    saveToStorage(STORAGE_KEYS.tasks, TASKS_DATA);
    return [...TASKS_DATA];
  },
  deleteBlocker: (id: string) => {
    BLOCKERS_DATA = BLOCKERS_DATA.filter(b => b.id !== id);
    saveToStorage(STORAGE_KEYS.blockers, BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  deleteInfluencer: (id: string) => {
    INFLUENCERS_DATA = INFLUENCERS_DATA.filter(i => i.id !== id);
    saveToStorage(STORAGE_KEYS.influencers, INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
};

export function exportAllData() {
  return {
    campaigns: [...CAMPAIGNS_DATA],
    influencers: [...INFLUENCERS_DATA],
    blockers: [...BLOCKERS_DATA],
    tasks: [...TASKS_DATA],
    handovers: [...HANDOVERS_DATA],
    exportedAt: Date.now(),
    version: '1.0',
  };
}

export function importAllData(data: {
  campaigns?: Campaign[];
  influencers?: CampaignInfluencer[];
  blockers?: Blocker[];
  tasks?: Task[];
  handovers?: Handover[];
}) {
  if (Array.isArray(data.campaigns)) {
    CAMPAIGNS_DATA = data.campaigns;
    saveToStorage(STORAGE_KEYS.campaigns, CAMPAIGNS_DATA);
  }
  if (Array.isArray(data.influencers)) {
    INFLUENCERS_DATA = data.influencers;
    saveToStorage(STORAGE_KEYS.influencers, INFLUENCERS_DATA);
  }
  if (Array.isArray(data.blockers)) {
    BLOCKERS_DATA = data.blockers;
    saveToStorage(STORAGE_KEYS.blockers, BLOCKERS_DATA);
  }
  if (Array.isArray(data.tasks)) {
    TASKS_DATA = data.tasks;
    saveToStorage(STORAGE_KEYS.tasks, TASKS_DATA);
  }
  if (Array.isArray(data.handovers)) {
    HANDOVERS_DATA = data.handovers;
    saveToStorage(STORAGE_KEYS.handovers, HANDOVERS_DATA);
  }
}

export function downloadJson(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

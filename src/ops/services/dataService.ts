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

// Mock Data Initial State
const INITIAL_CAMPAIGNS_DATA: Campaign[] = [
  { 
    id: 'C-001', 
    name: 'Red Bull Summer KSA', 
    clientId: 'c1', 
    brandId: 'b1',
    stage: CampaignStage.COVERAGE_IN_PROGRESS, 
    status: 'Active', 
    country: 'KSA', 
    budget: 50000, 
    budgetType: 'USD',
    recordHealth: 'Healthy',
    targetInfluencers: 50,
    targetPostingCoverage: 100,
    currentOwner: 'Sarah A.',
    nextAction: 'Reconcile visit logs',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now(),
    createdBy: 'system',
    city: 'Riyadh',
    objective: 'Brand Awareness',
    platforms: ['Instagram', 'TikTok'],
    type: 'Influencer Marketing',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    deliverables: '2 Stories, 1 Reel',
    tags: '#RedBullSummer',
    mentions: '@redbullksa',
    links: 'redbull.com/summer',
    visitRequired: true,
    productDetails: 'Summer Edition Cans',
    approvalFlow: 'Standard',
    reportingCadence: 'Weekly',
    restrictions: 'None',
    internalOwners: ['Sarah A.'],
    clientOwners: ['John D.'],
    influencerCriteria: 'Gen Z, Outdoor lifestyle'
  },
  { 
    id: 'C-002', 
    name: 'STC Pay Launch', 
    clientId: 'c2', 
    brandId: 'b2',
    stage: CampaignStage.LIST_PREPARATION, 
    status: 'Active', 
    country: 'UAE', 
    budget: 120000, 
    budgetType: 'USD',
    recordHealth: 'Healthy',
    targetInfluencers: 200,
    targetPostingCoverage: 400,
    currentOwner: 'Ahmed E.',
    nextAction: 'Finalize influencer selection',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
    createdBy: 'system',
    city: 'Dubai',
    objective: 'User Acquisition',
    platforms: ['Snapchat', 'TikTok'],
    type: 'Performance',
    startDate: '2024-07-01',
    endDate: '2024-07-15',
    deliverables: '1 Snap Ad, 1 TikTok Spark',
    tags: '#STCPayUAE',
    mentions: '@stcpay_uae',
    links: 'stcpay.com.ae/launch',
    visitRequired: false,
    productDetails: 'Mobile App',
    approvalFlow: 'High Priority',
    reportingCadence: 'Daily',
    restrictions: 'No competitors',
    internalOwners: ['Ahmed E.'],
    clientOwners: ['Sarah M.'],
    influencerCriteria: 'Tech savvy, UAE based'
  }
];

const INITIAL_INFLUENCERS_DATA: CampaignInfluencer[] = [
  {
    id: 'CI-001',
    campaignId: 'C-001',
    influencerId: 'INF-101',
    username: '@lifestyle_sa',
    platform: 'Instagram',
    status: 'Confirmed',
    niche: 'Lifestyle',
    followerRange: '100k-500k',
    invitationWave: 1,
    reminder1Sent: true,
    reminder2Sent: false,
    visitCompleted: true,
    coverageReceived: true,
    qaStatus: 'Approved',
    ownerId: 'Sarah A.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  },
  {
    id: 'CI-002',
    campaignId: 'C-001',
    influencerId: 'INF-102',
    username: '@travel_vibe',
    platform: 'TikTok',
    status: 'Pending',
    niche: 'Travel',
    followerRange: '50k-100k',
    invitationWave: 1,
    reminder1Sent: false,
    reminder2Sent: false,
    visitCompleted: false,
    coverageReceived: false,
    qaStatus: 'Pending',
    ownerId: 'Sarah A.',
    city: 'Dubai',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  },
  {
    id: 'CI-003',
    campaignId: 'C-002',
    influencerId: 'INF-103',
    username: '@tech_guy_uae',
    platform: 'Snapchat',
    status: 'Invited',
    niche: 'Tech',
    followerRange: '10k-50k',
    invitationWave: 2,
    reminder1Sent: true,
    reminder2Sent: true,
    visitCompleted: false,
    coverageReceived: false,
    qaStatus: 'Pending',
    ownerId: 'Ahmed E.',
    city: 'Abu Dhabi',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  },
  {
    id: 'CI-004',
    campaignId: 'C-001',
    influencerId: 'INF-104',
    username: '@foodie_riyadh',
    platform: 'Instagram',
    status: 'Confirmed',
    niche: 'Food',
    followerRange: '500k-1M',
    invitationWave: 1,
    reminder1Sent: true,
    reminder2Sent: false,
    visitCompleted: true,
    coverageReceived: false,
    qaStatus: 'Pending',
    ownerId: 'Sarah A.',
    city: 'Riyadh',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  }
];

const INITIAL_BLOCKERS_DATA: Blocker[] = [
  {
    id: 'B-001',
    campaignId: 'C-001',
    summary: 'Visit Proof Mismatch for @lifestyle_sa',
    impact: 'QA blocking for 12 posts',
    status: 'Open',
    severity: 'Critical',
    ownerId: 'Sarah A.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  }
];

const INITIAL_TASKS_DATA: Task[] = [
  {
    "id": "TRYGC-BO-2026-0001-T01",
    "title": "Review client request",
    "description": "Validate brief completeness, scope, timeline, commercial model, and internal launch readiness.",
    "ownerId": "Campaign Manager",
    "dueDate": 1778526076261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T02",
    "title": "Build influencer list",
    "description": "Filter creators by market, city, category, tier, language, followers, and blacklists.",
    "ownerId": "Community Lead",
    "dueDate": 1778551276261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T03",
    "title": "Collect confirmations",
    "description": "Send invitations, manage responses, confirm creator availability, and prepare approval list if required.",
    "ownerId": "Community Lead",
    "dueDate": 1778551276261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T04",
    "title": "Prepare coordination plan",
    "description": "Confirm branches, visit windows, creator instructions, client availability, and schedule.",
    "ownerId": "Coordination Lead",
    "dueDate": 1778540476261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T05",
    "title": "Prepare coverage tracker",
    "description": "Create deliverables tracker for stories, reels, posts, TikTok, Snapchat, UGC, proof links, and deadlines.",
    "ownerId": "Coverage Lead",
    "dueDate": 1778590876261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T06",
    "title": "Validate content requirements",
    "description": "Review campaign guidelines, tags, brand tone, approval logic, and QA checklist.",
    "ownerId": "QA Lead",
    "dueDate": 1778529676261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T07",
    "title": "Validate commercials",
    "description": "Confirm budget, currency, compensation model, payment status, and invoice/payment risks.",
    "ownerId": "Finance Lead",
    "dueDate": 1778551276261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T08",
    "title": "Monitor campaign risk",
    "description": "Review SLA exposure, urgency, missing information, and escalation requirements.",
    "ownerId": "Head of Operations",
    "dueDate": 1778526076261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T09",
    "title": "Confirm branch visit schedule",
    "description": "Lock branch schedule, slots, creator arrival process, and no-show escalation rule.",
    "ownerId": "Coordination Lead",
    "dueDate": 1778540476261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T10",
    "title": "Track visit-to-post completion",
    "description": "Compare confirmed visits against submitted coverage and flag missing coverage.",
    "ownerId": "Coverage Lead",
    "dueDate": 1778590876261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T11",
    "title": "Manage client approval cycle",
    "description": "Send proposed influencer list, track approval, and confirm final approved creators.",
    "ownerId": "Campaign Manager",
    "dueDate": 1778526076261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T12",
    "title": "Prepare reporting structure",
    "description": "Prepare final report fields: links, screenshots, views, interactions, missing items, and remarks.",
    "ownerId": "Coverage Lead",
    "dueDate": 1778590876261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": true,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0001-T13",
    "title": "Apply KSA routing",
    "description": "Assign KSA team, SAR currency, city routing, and local creator communication.",
    "ownerId": "Coordination Lead",
    "dueDate": 1778540476261,
    "campaignId": "Mr Beast Riyadh Visit Push",
    "completed": false,
    "priority": "High",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T01",
    "title": "Review client request",
    "description": "Validate brief completeness, scope, timeline, commercial model, and internal launch readiness.",
    "ownerId": "Campaign Manager",
    "dueDate": 1778540476261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T02",
    "title": "Build influencer list",
    "description": "Filter creators by market, city, category, tier, language, followers, and blacklists.",
    "ownerId": "Community Lead",
    "dueDate": 1778598076261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T03",
    "title": "Collect confirmations",
    "description": "Send invitations, manage responses, confirm creator availability, and prepare approval list if required.",
    "ownerId": "Community Lead",
    "dueDate": 1778598076261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T04",
    "title": "Prepare coordination plan",
    "description": "Confirm branches, visit windows, creator instructions, client availability, and schedule.",
    "ownerId": "Coordination Lead",
    "dueDate": 1778576476261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T05",
    "title": "Prepare coverage tracker",
    "description": "Create deliverables tracker for stories, reels, posts, TikTok, Snapchat, UGC, proof links, and deadlines.",
    "ownerId": "Coverage Lead",
    "dueDate": 1778684476261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T06",
    "title": "Validate content requirements",
    "description": "Review campaign guidelines, tags, brand tone, approval logic, and QA checklist.",
    "ownerId": "QA Lead",
    "dueDate": 1778554876261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T07",
    "title": "Validate commercials",
    "description": "Confirm budget, currency, compensation model, payment status, and invoice/payment risks.",
    "ownerId": "Finance Lead",
    "dueDate": 1778598076261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T08",
    "title": "Monitor campaign risk",
    "description": "Review SLA exposure, urgency, missing information, and escalation requirements.",
    "ownerId": "Head of Operations",
    "dueDate": 1778533276261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T09",
    "title": "Confirm branch visit schedule",
    "description": "Lock branch schedule, slots, creator arrival process, and no-show escalation rule.",
    "ownerId": "Coordination Lead",
    "dueDate": 1778576476261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T10",
    "title": "Track visit-to-post completion",
    "description": "Compare confirmed visits against submitted coverage and flag missing coverage.",
    "ownerId": "Coverage Lead",
    "dueDate": 1778684476261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": true,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T11",
    "title": "Prepare reporting structure",
    "description": "Prepare final report fields: links, screenshots, views, interactions, missing items, and remarks.",
    "ownerId": "Coverage Lead",
    "dueDate": 1778684476261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0002-T12",
    "title": "Apply UAE routing",
    "description": "Assign UAE team, AED currency, emirate routing, and branch timing.",
    "ownerId": "Coordination Lead",
    "dueDate": 1778576476261,
    "campaignId": "Dubai Lifestyle Coverage",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T01",
    "title": "Review client request",
    "description": "Validate brief completeness, scope, timeline, commercial model, and internal launch readiness.",
    "ownerId": "Campaign Manager",
    "dueDate": 1778533276261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T02",
    "title": "Build influencer list",
    "description": "Filter creators by market, city, category, tier, language, followers, and blacklists.",
    "ownerId": "Community Lead",
    "dueDate": 1778572876261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T03",
    "title": "Collect confirmations",
    "description": "Send invitations, manage responses, confirm creator availability, and prepare approval list if required.",
    "ownerId": "Community Lead",
    "dueDate": 1778572876261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T04",
    "title": "Prepare coordination plan",
    "description": "Confirm branches, visit windows, creator instructions, client availability, and schedule.",
    "ownerId": "Coordination Lead",
    "dueDate": 1778558476261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T05",
    "title": "Prepare coverage tracker",
    "description": "Create deliverables tracker for stories, reels, posts, TikTok, Snapchat, UGC, proof links, and deadlines.",
    "ownerId": "Coverage Lead",
    "dueDate": 1778634076261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T06",
    "title": "Validate content requirements",
    "description": "Review campaign guidelines, tags, brand tone, approval logic, and QA checklist.",
    "ownerId": "QA Lead",
    "dueDate": 1778540476261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T07",
    "title": "Validate commercials",
    "description": "Confirm budget, currency, compensation model, payment status, and invoice/payment risks.",
    "ownerId": "Finance Lead",
    "dueDate": 1778572876261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T08",
    "title": "Monitor campaign risk",
    "description": "Review SLA exposure, urgency, missing information, and escalation requirements.",
    "ownerId": "Head of Operations",
    "dueDate": 1778533276261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T09",
    "title": "Collect delivery information",
    "description": "Collect creator addresses, contact numbers, dispatch details, and delivery proof.",
    "ownerId": "Coordination Lead",
    "dueDate": 1778558476261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": true,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T10",
    "title": "Track delivery-to-post completion",
    "description": "Validate product received, content posted, and proof submitted.",
    "ownerId": "Coverage Lead",
    "dueDate": 1778634076261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T11",
    "title": "Manage client approval cycle",
    "description": "Send proposed influencer list, track approval, and confirm final approved creators.",
    "ownerId": "Campaign Manager",
    "dueDate": 1778533276261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T12",
    "title": "Prepare reporting structure",
    "description": "Prepare final report fields: links, screenshots, views, interactions, missing items, and remarks.",
    "ownerId": "Coverage Lead",
    "dueDate": 1778634076261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  },
  {
    "id": "TRYGC-BO-2026-0003-T13",
    "title": "Apply Kuwait routing",
    "description": "Assign Kuwait team, KWD currency, area routing, and approval process.",
    "ownerId": "Coordination Lead",
    "dueDate": 1778558476261,
    "campaignId": "Mother's Day Product Seeding",
    "completed": false,
    "priority": "Medium",
    "createdAt": 1778511676261,
    "updatedAt": 1778511676261,
    "createdBy": "system"
  }
];

const INITIAL_HANDOVERS_DATA: Handover[] = [
  {
    id: 'HO-001',
    handoffDate: '2026-05-12',
    fromShift: 'Morning',
    toShift: 'Mid',
    team: 'Operations',
    region: 'KSA / UAE',
    outgoingLead: 'Sarah A.',
    incomingLead: 'Ahmed E.',
    status: 'Pending',
    notes: 'Prioritize visit-proof follow-up and confirm missing recovery owners before the mid shift fully picks up.',
    taskIds: ['TSK-101', 'TSK-104'],
    createdAt: Date.now() - 3600000 * 6,
    updatedAt: Date.now() - 3600000 * 2,
    createdBy: 'system',
  },
  {
    id: 'HO-002',
    handoffDate: '2026-05-11',
    fromShift: 'Mid',
    toShift: 'Night',
    team: 'Coverage',
    region: 'KSA',
    outgoingLead: 'Ahmed E.',
    incomingLead: 'Mona K.',
    status: 'Acknowledged',
    notes: 'All outbound creator reminders sent. Night shift should only monitor late creator replies and archive any final proofs.',
    taskIds: ['TSK-102', 'TSK-103'],
    acknowledgedAt: Date.now() - 86400000 / 2,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000 / 2,
    createdBy: 'system',
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

export let CAMPAIGNS_DATA: Campaign[] = loadFromStorage('GC_CAMPAIGNS', INITIAL_CAMPAIGNS_DATA);
export let INFLUENCERS_DATA: CampaignInfluencer[] = loadFromStorage('GC_INFLUENCERS', INITIAL_INFLUENCERS_DATA);
export let BLOCKERS_DATA: Blocker[] = loadFromStorage('GC_BLOCKERS', INITIAL_BLOCKERS_DATA);
export let TASKS_DATA: Task[] = loadFromStorage('GC_TASKS', INITIAL_TASKS_DATA);
export let HANDOVERS_DATA: Handover[] = loadFromStorage('GC_HANDOVERS', INITIAL_HANDOVERS_DATA);

const hydratedCampaigns = normalizeCampaignIds(CAMPAIGNS_DATA);
CAMPAIGNS_DATA = hydratedCampaigns.normalized;
if (hydratedCampaigns.hasChanges) {
  saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
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
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
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
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
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
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  getTasks: () => [...TASKS_DATA],
  updateTask: (id: string, updates: Partial<Task>) => {
    TASKS_DATA = TASKS_DATA.map(t => t.id === id ? { ...t, ...updates } : t);
    saveToStorage('GC_TASKS', TASKS_DATA);
    return [...TASKS_DATA];
  },
  addTask: (task: Task) => {
    TASKS_DATA = [task, ...TASKS_DATA];
    saveToStorage('GC_TASKS', TASKS_DATA);
    return [...TASKS_DATA];
  },
  getHandovers: () => [...HANDOVERS_DATA],
  updateHandover: (id: string, updates: Partial<Handover>) => {
    HANDOVERS_DATA = HANDOVERS_DATA.map((handover) =>
      handover.id === id ? { ...handover, ...updates, updatedAt: Date.now() } : handover
    );
    saveToStorage('GC_HANDOVERS', HANDOVERS_DATA);
    return [...HANDOVERS_DATA];
  },
  addHandover: (handover: Handover) => {
    HANDOVERS_DATA = [handover, ...HANDOVERS_DATA];
    saveToStorage('GC_HANDOVERS', HANDOVERS_DATA);
    return [...HANDOVERS_DATA];
  },
  deleteHandover: (id: string) => {
    HANDOVERS_DATA = HANDOVERS_DATA.filter((handover) => handover.id !== id);
    saveToStorage('GC_HANDOVERS', HANDOVERS_DATA);
    return [...HANDOVERS_DATA];
  },
  clearTasks: () => {
    TASKS_DATA = [];
    saveToStorage('GC_TASKS', TASKS_DATA);
    return [...TASKS_DATA];
  },
  getBlockers: () => [...BLOCKERS_DATA],
  updateBlocker: (id: string, updates: Partial<Blocker>) => {
    BLOCKERS_DATA = BLOCKERS_DATA.map(blocker => blocker.id === id ? { ...blocker, ...updates, updatedAt: Date.now() } : blocker);
    saveToStorage('GC_BLOCKERS', BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  addBlocker: (blocker: Blocker) => {
    BLOCKERS_DATA = [blocker, ...BLOCKERS_DATA];
    saveToStorage('GC_BLOCKERS', BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  clearBlockers: () => {
    BLOCKERS_DATA = [];
    saveToStorage('GC_BLOCKERS', BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  getInfluencers: () => [...INFLUENCERS_DATA],
  updateInfluencer: (id: string, updates: Partial<CampaignInfluencer>) => {
    INFLUENCERS_DATA = INFLUENCERS_DATA.map(inf => inf.id === id ? { ...inf, ...updates, updatedAt: Date.now() } : inf);
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  addInfluencers: (influencers: CampaignInfluencer[]) => {
    INFLUENCERS_DATA = [...influencers, ...INFLUENCERS_DATA];
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  clearInfluencers: () => {
    INFLUENCERS_DATA = [];
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  clearCampaigns: () => {
    CAMPAIGNS_DATA = [];
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  clearWorkspaceData: () => {
    CAMPAIGNS_DATA = [];
    INFLUENCERS_DATA = [];
    BLOCKERS_DATA = [];
    TASKS_DATA = [];
    HANDOVERS_DATA = [];
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
    saveToStorage('GC_BLOCKERS', BLOCKERS_DATA);
    saveToStorage('GC_TASKS', TASKS_DATA);
    saveToStorage('GC_HANDOVERS', HANDOVERS_DATA);
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
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  deleteCampaign: (id: string) => {
    CAMPAIGNS_DATA = CAMPAIGNS_DATA.filter(c => c.id !== id);
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  deleteTask: (id: string) => {
    TASKS_DATA = TASKS_DATA.filter(t => t.id !== id);
    saveToStorage('GC_TASKS', TASKS_DATA);
    return [...TASKS_DATA];
  },
  deleteBlocker: (id: string) => {
    BLOCKERS_DATA = BLOCKERS_DATA.filter(b => b.id !== id);
    saveToStorage('GC_BLOCKERS', BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  deleteInfluencer: (id: string) => {
    INFLUENCERS_DATA = INFLUENCERS_DATA.filter(i => i.id !== id);
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
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
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
  }
  if (Array.isArray(data.influencers)) {
    INFLUENCERS_DATA = data.influencers;
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
  }
  if (Array.isArray(data.blockers)) {
    BLOCKERS_DATA = data.blockers;
    saveToStorage('GC_BLOCKERS', BLOCKERS_DATA);
  }
  if (Array.isArray(data.tasks)) {
    TASKS_DATA = data.tasks;
    saveToStorage('GC_TASKS', TASKS_DATA);
  }
  if (Array.isArray(data.handovers)) {
    HANDOVERS_DATA = data.handovers;
    saveToStorage('GC_HANDOVERS', HANDOVERS_DATA);
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

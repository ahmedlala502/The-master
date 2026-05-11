// ─── API Service — TryGC Hub Manager v2.0 ────────────────────────────────────
// Stable multi-provider AI service with:
//  • Per-provider timeout (10 s)
//  • Automatic retry (1 retry on network errors, NOT on 4xx)
//  • Smart context-aware mock fallback
//  • Custom OpenAI-compatible provider support via workspace settings
//  • Better error handling and sanitization
// ─────────────────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

// ── helpers ──────────────────────────────────────────────────────────────────

function getSettings(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem('trygc_hub_settings_v2');
    if (!raw) return null;
    return JSON.parse(raw) || null;
  } catch { return null; }
}

function redactSecrets(value: string): string {
  return value
    .replace(/sk-[a-zA-Z0-9_\-]+/g, '[REDACTED_KEY]')
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]');
}

function sanitizePromptInput(input: string): string {
  const bounded = input.slice(0, 4000);
  return bounded
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/ignore\s+all\s+previous\s+instructions/gi, '[BLOCKED]')
    .replace(/reveal\s+(system|hidden)\s+prompt/gi, '[BLOCKED]')
    .replace(/disregard\s+.+?instructions/gi, '[BLOCKED]')
    .replace(/bypass\s+.+?security/gi, '[BLOCKED]')
    .trim();
}

/** fetch with a hard timeout and automatic retry on network/5xx errors */
async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  attempt = 0
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    // Retry once on 5xx (server errors), never on 4xx (auth / bad-request)
    if (!res.ok && res.status >= 500 && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithTimeout(url, opts, attempt + 1);
    }
    return res;
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    if (!isAbort && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithTimeout(url, opts, attempt + 1);
    }
    throw isAbort
      ? new Error('Request timed out after 10s. Check your network or endpoint.')
      : err;
  }
}

// ── types ─────────────────────────────────────────────────────────────────────

export type AIProviderName = 'openai' | 'anthropic' | 'groq' | 'alibaba' | 'local' | 'custom' | 'mock';

export interface AIResult {
  text: string;
  provider: AIProviderName;
  latencyMs?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

// ── provider calls ────────────────────────────────────────────────────────────

async function callOpenAICompat(
  apiKey: string,
  model: string,
  endpoint: string,
  prompt: string,
  providerLabel = 'OpenAI'
): Promise<string> {
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message
      || `${providerLabel} ${res.status}: ${res.statusText}`
    );
  }
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error(`${providerLabel} returned an empty response.`);
  return text;
}

async function callAnthropic(apiKey: string, model: string, endpoint: string, prompt: string): Promise<string> {
  const url = endpoint || 'https://api.anthropic.com/v1/messages';
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-haiku-20241022',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message
      || `Anthropic ${res.status}: ${res.statusText}`
    );
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text || '';
  if (!text) throw new Error('Anthropic returned an empty response.');
  return text;
}

async function callOllama(model: string, endpoint: string, prompt: string): Promise<string> {
  const base = endpoint || 'http://localhost:11434';
  const url = (base.endsWith('/') ? base : base + '/') + 'api/generate';
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'llama3', prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${res.statusText} — is the server running?`);
  const data = await res.json();
  const text: string = data?.response || '';
  if (!text) throw new Error('Ollama returned an empty response.');
  return text;
}

// ── main dispatcher ───────────────────────────────────────────────────────────

async function callProvider(prompt: string): Promise<AIResult> {
  const safePrompt = sanitizePromptInput(prompt);
  const settings = getSettings() as {
    aiProvider?: string;
    aiModel?: string;
    aiEndpoint?: string;
    providerModels?: Record<string, string>;
    providerEndpoints?: Record<string, string>;
    fallbackProviders?: string[];
  } | null;

  const provider = settings?.aiProvider || 'openai';
  const providerModels = settings?.providerModels || {};
  const fallbackProviders = settings?.fallbackProviders || ['local', 'openai', 'anthropic', 'groq'];
  const model = settings?.aiModel || providerModels[provider] || '';
  const attemptOrder = [provider, ...fallbackProviders.filter(item => item && item !== provider)];
  let lastError = '';

  for (const candidate of attemptOrder) {
    const candidateModel = candidate === provider ? model : providerModels[candidate] || '';
    const t0 = Date.now();

    try {
      let text = '';
      if (candidate === 'local') {
        text = await callOllama(candidateModel, '', safePrompt);
      } else {
        const proxyResponse = await fetchWithTimeout('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: candidate, model: candidateModel, prompt: safePrompt }),
        });
        const proxyJson = await proxyResponse.json().catch(() => ({}));
        if (!proxyResponse.ok) {
          throw new Error(proxyJson?.error || `AI proxy failed (${proxyResponse.status})`);
        }
        text = String(proxyJson?.text || '');
      }

      return { text, provider: candidate as AIProviderName, latencyMs: Date.now() - t0 };
    } catch (err: unknown) {
      lastError = err instanceof Error ? redactSecrets(err.message) : redactSecrets(String(err));
      console.warn(`[apiService] ${candidate} failed (${lastError}) — trying next fallback`);
    }
  }

  return mockFallback(safePrompt, lastError || 'No AI provider could respond.');
}

// ── smart mock fallback ───────────────────────────────────────────────────────

function mockFallback(prompt: string, reason?: string): AIResult {
  const lower = prompt.toLowerCase();
  const note = reason ? `\n\n_Note: ${reason}_` : '';
  let text = '';

  if (lower.includes('handover') || lower.includes('watchout') || lower.includes('shift summary')) {
    text = [
      '## Shift Handover Summary',
      '',
      '**Pending Actions:**',
      '- Review all high-priority carry-over tasks before shift close',
      '- Flag any blocked items requiring regional lead intervention',
      '- Confirm SLA compliance across all active campaigns',
      '',
      '**Key Watchouts:**',
      '- Verify all open tasks have been updated with latest status',
      '- Ensure incoming team has full context on active issues',
      '- Document any escalations or pending approvals',
    ].join('\n');
  } else if (lower.includes('risk') || lower.includes('alert') || lower.includes('urgent')) {
    text = '## Risk Assessment\n\n**Immediate Actions Required:**\n- Escalate all blocked high-priority items to regional lead\n- Verify SLA timers have not elapsed on in-progress tasks\n- Document all open dependencies in handover notes\n- Identify any tasks approaching deadline without progress';
  } else if (lower.includes('title') || lower.includes('rewrite') || lower.includes('improve title')) {
    const stripped = prompt.replace(/rewrite.*?original:\s*"/i, '').replace(/".*$/s, '').trim();
    text = stripped.length > 10 ? stripped.slice(0, 80) + (stripped.length > 80 ? '...' : '') : prompt + ' — action item';
  } else if (lower.includes('improve') || lower.includes('notes') || lower.includes('details')) {
    text = '**Objective:** Complete the outlined deliverable with full stakeholder sign-off. Ensure all dependencies are resolved and regional compliance requirements are met before closure. Coordinate with relevant teams to address any blockers and document all decisions made during execution.';
  } else if (lower.includes('status') || lower.includes('summary') || lower.includes('overview')) {
    text = '## Operations Status\n\nAll regional hubs are active and reporting. Review the carry-over task list and ensure all pending handovers are acknowledged before next shift. No critical SLA breaches detected at this time. Monitor high-priority items for any changes in status.';
  } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('help')) {
    text = 'Hello! I\'m your AI operations assistant. I can help you with:\n- Task summaries and status updates\n- Risk assessments and alerts\n- Shift handover documentation\n- Performance reporting\n\nTo get started, try asking about "risks", "tasks", or "handovers". For full AI capabilities, add an API key in Settings → AI & API.';
  } else {
    text = 'Action confirmed. Review outstanding tasks, resolve any blockers, and ensure all handovers are properly documented before the end of your shift.';
  }

  return { text: text + note, provider: 'mock' };
}

// ── public API ────────────────────────────────────────────────────────────────

export async function improveTaskContent({ content, type, campaign, team }: {
  content: string;
  type: 'title' | 'details';
  campaign?: string;
  team?: string;
}): Promise<AIResult> {
  const prompt = type === 'title'
    ? `Rewrite this task title to be more clear and actionable. Keep it under 80 characters. Original: "${content}"${campaign ? `. Campaign: ${campaign}` : ''}${team ? `. Team: ${team}` : ''}. Return only the improved title, no explanation.`
    : `Improve these task notes to be clearer and more actionable for the operations team. Original: "${content}"${campaign ? `. Campaign: ${campaign}` : ''}. Return only the improved notes, no explanation.`;
  return callProvider(prompt);
}

export async function generateHandoverSummary({ tasks, watchouts }: {
  tasks: Array<{ title: string; priority: string; status: string }>;
  watchouts?: string;
}): Promise<AIResult> {
  const taskList = tasks.map(t => `- [${t.priority}/${t.status}] ${t.title}`).join('\n');
  const prompt = `Generate a concise shift handover watchout summary for the following tasks:\n${taskList}\n${watchouts ? `Existing notes: ${watchouts}\n` : ''}Write 2-3 sentences covering key risks, blockers, and actions needed. Be direct and operational.`;
  return callProvider(prompt);
}

export async function chatWithWorkspaceAI({ history, tasksSummary, handoverSummary, memberStats }: {
  history: ChatMessage[];
  tasksSummary: string;
  handoverSummary: string;
  memberStats?: string;
}): Promise<AIResult> {
  const transcript = history.map(message => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`).join('\n');
  const prompt = [
    'You are the AI operations copilot for TryGC Hub Manager.',
    `Task context: ${tasksSummary}`,
    `Handover context: ${handoverSummary}`,
    memberStats ? `Team context: ${memberStats}` : '',
    'Give direct, practical, operational answers. Be concise but thorough.',
    '',
    transcript,
    '',
    'Reply to the latest user message.',
  ].join('\n');
  return callProvider(prompt);
}

export async function analyzeRisks(tasks: Array<{ title: string; priority: string; status: string; due?: string }>): Promise<AIResult> {
  const taskList = tasks.map(t => `- [${t.priority}/${t.status}] ${t.title}${t.due ? ` (due: ${t.due})` : ''}`).join('\n');
  const prompt = `Analyze these tasks for operational risks:\n${taskList}\n\nIdentify the top 3 risks, their severity (high/medium/low), and specific mitigation actions. Format as a concise operations brief.`;
  return callProvider(prompt);
}

export async function suggestTaskBreakdown(title: string, details?: string): Promise<AIResult> {
  const prompt = `Break down this task into actionable sub-tasks:\nTitle: ${title}${details ? `\nDetails: ${details}` : ''}\n\nProvide 3-5 concrete steps. Return as a bullet list only.`;
  return callProvider(prompt);
}

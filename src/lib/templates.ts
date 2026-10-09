import type { AutoCoverages, HomeCoverages } from '@/data/types';

export type QuoteTemplate = { id: string; name: string; created: string; autoCoverages: AutoCoverages; homeCoverages: HomeCoverages };
const KEY = 'erie-agentexchange-templates';

export function loadTemplates(): QuoteTemplate[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as QuoteTemplate[]; } catch { return []; }
}

export function saveTemplates(templates: QuoteTemplate[]) {
  try { localStorage.setItem(KEY, JSON.stringify(templates)); } catch { /* storage unavailable */ }
}

import type { AutoCoverages, HomeCoverages } from '@/data/types';
import { migrateAuto, migrateHome } from '@/data/store';

export type QuoteTemplate = { id: string; name: string; created: string; autoCoverages: AutoCoverages; homeCoverages: HomeCoverages };
const KEY = 'erie-agentexchange-templates';

export function loadTemplates(): QuoteTemplate[] {
  try {
    // Templates saved before the coverage split get the same migration as saved quotes and policies.
    return (JSON.parse(localStorage.getItem(KEY) ?? '[]') as QuoteTemplate[]).map((t) => ({ ...t, autoCoverages: migrateAuto(t.autoCoverages)!, homeCoverages: migrateHome(t.homeCoverages)! }));
  } catch { return []; }
}

export function saveTemplates(templates: QuoteTemplate[]) {
  try { localStorage.setItem(KEY, JSON.stringify(templates)); } catch { /* storage unavailable */ }
}

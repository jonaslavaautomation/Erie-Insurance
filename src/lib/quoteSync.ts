import { supabase } from '@/lib/supabase';
import { quoteStatusLabel } from '@/lib/personalLines';
import type { Quote } from '@/data/types';

/*
 * Saves quotes to the Supabase table `portal_quotes` (see supabase/migrations/…_create_portal_quotes.sql).
 * The full quote is stored as JSON in `data`; the other columns summarize it for searching in Supabase.
 */

export type SyncStatus = 'offline' | 'connecting' | 'saving' | 'saved' | 'error';

const TABLE = 'portal_quotes';

export function quoteRow(q: Quote, totalPremium: number | null) {
  return {
    id: q.id,
    quote_number: q.numbers?.[q.products[0]] ?? q.id,
    applicant_name: `${q.applicant.lastName}, ${q.applicant.firstName}`.trim(),
    applicant_state: q.applicant.state,
    products: q.products,
    status: quoteStatusLabel(q),
    effective_date: /^\d{4}-\d{2}-\d{2}$/.test(q.effectiveDate) ? q.effectiveDate : null,
    total_premium: totalPremium,
    rated: q.flow === 'pl' ? !!q.pl?.rated : true,
    data: q,
    created_at: q.createdAt,
    updated_at: q.updatedAt,
  };
}

/** All saved quotes, newest first. */
export async function loadRemoteQuotes(): Promise<Quote[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(TABLE).select('data').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.data as Quote).filter((q) => q && typeof q.id === 'string');
}

export async function upsertRemoteQuotes(rows: ReturnType<typeof quoteRow>[]) {
  if (!supabase || !rows.length) return;
  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteRemoteQuotes(ids: string[]) {
  if (!supabase || !ids.length) return;
  const { error } = await supabase.from(TABLE).delete().in('id', ids);
  if (error) throw error;
}

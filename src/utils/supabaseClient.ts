import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(raw: string): string {
  if (!raw) return '';
  let url = raw.trim().replace(/^['"]+|['"]+$/g, '');

  // 1. If user pasted Supabase dashboard URL: https://supabase.com/dashboard/project/<project-ref>/...
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // 2. If user pasted project domain with any path or trailing slash: https://<project-ref>.supabase.co/...
  const domainMatch = url.match(/(https?:\/\/[a-zA-Z0-9_-]+\.supabase\.co)/i);
  if (domainMatch && domainMatch[1]) {
    return domainMatch[1].replace('http://', 'https://');
  }

  // 3. Fallback: clean trailing slashes and paths
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

function normalizeSupabaseKey(raw: string): string {
  if (!raw) return '';
  return raw.trim().replace(/^['"]+|['"]+$/g, '');
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const sanitizedSupabaseUrl = normalizeSupabaseUrl(rawUrl);
export const sanitizedSupabaseKey = normalizeSupabaseKey(rawKey);

export const isSupabaseConfigured = Boolean(
  sanitizedSupabaseUrl &&
  sanitizedSupabaseKey &&
  sanitizedSupabaseUrl.startsWith('https://') &&
  !sanitizedSupabaseUrl.includes('your-project-id')
);

export const supabase = isSupabaseConfigured
  ? createClient(sanitizedSupabaseUrl, sanitizedSupabaseKey)
  : null;

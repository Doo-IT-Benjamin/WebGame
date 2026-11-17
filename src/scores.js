// Highscores: shared via Supabase when configured, otherwise kept on this device.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const SHARED = Boolean(SUPABASE_URL && SUPABASE_KEY);
const LOCAL_KEY = 'gravity-scores';
const FETCH_LIMIT = 200;

export function cleanName(raw) {
  return String(raw || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

function headers(extra = {}) {
  return { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...extra };
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}

/** All scores, highest first (raw entries, not de-duplicated). */
async function fetchAll() {
  if (!SHARED) return readLocal().sort((a, b) => b.score - a.score);
  const url = `${SUPABASE_URL}/rest/v1/scores?select=name,score,created_at&order=score.desc,created_at.asc&limit=${FETCH_LIMIT}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Scores laden mislukt (${res.status})`);
  return res.json();
}

/** Top list with each name's best score only. */
export async function topScores(n = 10) {
  const all = await fetchAll();
  const seen = new Set();
  const top = [];
  for (const s of all) {
    const key = s.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    top.push(s);
    if (top.length === n) break;
  }
  return top;
}

export async function saveScore(name, score) {
  const entry = { name: cleanName(name), score: Math.floor(score) };
  if (!entry.name || entry.score < 1) return;
  if (!SHARED) {
    const list = readLocal();
    list.push({ ...entry, created_at: new Date().toISOString() });
    list.sort((a, b) => b.score - a.score);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, FETCH_LIMIT))); } catch {}
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`Score opslaan mislukt (${res.status})`);
}

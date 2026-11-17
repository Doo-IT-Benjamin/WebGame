// Supabase connection for the shared highscores table.
//
// Fill these in from your Supabase project: Project Settings → API (or "API Keys").
// - SUPABASE_URL: the Project URL, e.g. https://abcdefghijklm.supabase.co
// - SUPABASE_KEY: the *publishable* / "anon public" key — NOT the secret / service_role key.
//
// The publishable key is meant to be public; the database rules in supabase/migrations/20261117000000_create_scores.sql
// only let it read scores and add new ones.
//
// While these are empty, highscores are only kept on the current device.
export const SUPABASE_URL = 'https://mlhmwmbprumdujtsrcle.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_wQ3YpchqZGUW9hnXwAqbZg_l_liuOXh';

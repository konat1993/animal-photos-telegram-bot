import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY) must be configured"
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseClient(), prop, receiver);
  },
});

export type AnimalReport = {
  id: string;
  telegram_user_id: string;
  photo_path: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  /** Reverse-geocoded labels (null for legacy rows or geocoder failure). */
  location_continent: string | null;
  location_country: string | null;
  location_region: string | null;
  identified_species: string;
  confidence: number | null;
  safety_note: string;
  raw_ai_response: Record<string, unknown>;
  created_at: string;
};

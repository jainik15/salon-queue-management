import { describe, expect, it } from 'vitest';

describe('Supabase configuration boundary', () => {
  it('does not expose service-role or staff secrets', () => {
    expect(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(import.meta.env.PHONE_HMAC_SECRET).toBeUndefined();
  });

  it('uses public URL and anon key names only', () => {
    expect(import.meta.env.VITE_SUPABASE_URL ?? '').toBe('');
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').toBe('');
  });
});

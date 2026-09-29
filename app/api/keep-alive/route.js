import { supabaseAdmin, json, serverError } from '../../lib/server';

// Called once a day by Vercel Cron (see vercel.json) so the free Supabase project never sits idle
// for 7 days and gets paused. Only Vercel may call it: it sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ error: 'Unauthorized' }, 401);
  }
  try {
    // One tiny real query is enough to count as database activity.
    const { count, error } = await supabaseAdmin().from('profiles').select('id', { count: 'exact', head: true });
    if (error) throw error;
    return json({ ok: true, checkedAt: new Date().toISOString(), profiles: count });
  } catch (err) {
    return serverError('Keep-alive error:', err);
  }
}

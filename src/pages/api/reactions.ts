import type { APIRoute } from 'astro';
export const prerender = false;
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    if (!env?.REACTIONS || !env?.DB) return new Response('Storage unavailable', { status: 503 });
    const form = await request.formData();
    const video = form.get('video');
    const name = String(form.get('name') ?? '').trim().slice(0, 80);
    const guess = String(form.get('guess') ?? '');
    const consent = form.get('consent') === 'true';
    if (!(video instanceof File) || video.size === 0 || video.size > 65 * 1024 * 1024 || !name || !['boy','girl'].includes(guess) || !consent || !video.type.startsWith('video/')) return new Response('Invalid submission', { status: 400 });
    const id = crypto.randomUUID();
    const key = 'reactions/' + id;
    await env.REACTIONS.put(key, video.stream(), { httpMetadata: { contentType: video.type } });
    try { await env.DB.prepare('INSERT INTO reactions (id, name, guess, object_key, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id,name,guess,key,video.type,new Date().toISOString()).run(); }
    catch(e){await env.REACTIONS.delete(key);throw e;}
    return new Response(JSON.stringify({ id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response('Upload failed', { status: 500 }); }
};

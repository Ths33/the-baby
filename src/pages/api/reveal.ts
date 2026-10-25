import type { APIRoute } from 'astro';
export const prerender = false;
export const POST: APIRoute = async ({ locals }) => {
  const selected = locals.runtime?.env?.REVEAL_GENDER;
  if (selected !== 'boy' && selected !== 'girl') return new Response(JSON.stringify({ error: 'A revelação ainda não foi configurada.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  return new Response(JSON.stringify({ gender: selected }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};

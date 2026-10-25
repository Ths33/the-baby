import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  headers.set('Cache-Control', context.url.pathname.startsWith('/api/') ? 'no-store' : 'private, no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});

import type { APIContext } from 'astro';
import { url } from '../lib/site';

const FALLBACK_SITE = 'http://localhost:4321';

export function GET(context: APIContext): Response {
  const site = context.site ?? new URL(FALLBACK_SITE);
  const sitemap = new URL(url('/sitemap.xml'), site).toString();
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

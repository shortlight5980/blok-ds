import type { APIContext } from 'astro';
import { getPosts } from '../lib/posts';
import { postPath, url } from '../lib/site';

const FALLBACK_SITE = 'http://localhost:4321';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET(context: APIContext): Promise<Response> {
  const posts = await getPosts();
  const site = context.site ?? new URL(FALLBACK_SITE);
  const locations = [url('/'), ...posts.map((post) => postPath(post.id))].map(
    (path) => new URL(path, site).toString(),
  );
  const entries = locations
    .map((location) => `  <url>\n    <loc>${escapeXml(location)}</loc>\n  </url>`)
    .join('\n');
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

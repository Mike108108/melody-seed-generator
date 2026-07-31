import type { APIRoute } from 'astro';

const routes = [
  '/',
  '/instructions',
  '/suno-tips',
  '/suno-tips/where-to-publish-suno-track',
  '/suno-tips/suno-682-release',
  '/suno-tips/gpt-release-form-workflow',
  '/development',
  '/privacy'
];

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');
  const urls = routes
    .map((route) => `  <url><loc>${escapeXml(new URL(route, base).toString())}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
};

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

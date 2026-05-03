import { supabase } from '../config/supabase.js';

export const generateSitemap = async () => {
    const baseUrl = 'https://theambassadorsassembly.org';
    const staticPaths = [
        '',
        '/sermons',
        '/events',
        '/ministries',
        '/give',
        '/about',
        '/meet-the-pastor',
        '/connect',
        '/plan-a-visit',
        '/faq',
        '/testimonies',
        '/prayer-wall'
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // 1. Add static paths
    staticPaths.forEach(path => {
        xml += `
  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path === '' ? '1.0' : '0.8'}</priority>
  </url>`;
    });

    try {
        // 2. Fetch dynamic sermons
        const { data: sermons } = await supabase
            .from('sermons')
            .select('slug, updated_at')
            .eq('status', 'published');
        
        sermons?.forEach(sermon => {
            xml += `
  <url>
    <loc>${baseUrl}/sermons/${sermon.slug}</loc>
    <lastmod>${new Date(sermon.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
        });

        // 3. Fetch dynamic events
        const { data: events } = await supabase
            .from('events')
            .select('slug, updated_at')
            .eq('status', 'published');
        
        events?.forEach(event => {
            xml += `
  <url>
    <loc>${baseUrl}/events/${event.slug}</loc>
    <lastmod>${new Date(event.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
        });

        // 4. Fetch dynamic ministries
        const { data: ministries } = await supabase
            .from('ministries')
            .select('slug, updated_at')
            .eq('is_active', true);
        
        ministries?.forEach(ministry => {
            xml += `
  <url>
    <loc>${baseUrl}/ministries/${ministry.slug}</loc>
    <lastmod>${new Date(ministry.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
        });

    } catch (error) {
        console.error('[Sitemap] Error fetching dynamic data:', error.message);
    }

    xml += '\n</urlset>';
    return xml;
};

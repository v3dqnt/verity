import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Uses Tavily Search to find the real Instagram usernames of competitor brands.
 * Returns an array of confirmed IG handles.
 */
export async function POST(req: Request) {
  try {
    const { competitors } = await req.json();

    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return NextResponse.json({ handles: [] });
    }

    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
      return NextResponse.json({ error: 'TAVILY_API_KEY not configured.' }, { status: 500 });
    }

    const resolvedHandles: string[] = [];

    // Search for each competitor's Instagram handle individually for accuracy
    for (const competitor of competitors.slice(0, 3)) {
      try {
        const tavilyRes = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${competitor} official Instagram account username site:instagram.com`,
            search_depth: 'basic',
            max_results: 3,
            include_domains: ['instagram.com'],
          }),
        });

        if (!tavilyRes.ok) continue;

        const tavilyData = await tavilyRes.json();
        const results: any[] = tavilyData?.results || [];

        // Parse the Instagram username from the result URLs
        for (const result of results) {
          const url: string = result.url || '';
          // Match instagram.com/{username}/ pattern, exclude known non-profile paths
          const match = url.match(/instagram\.com\/([a-zA-Z0-9_\.]+)\/?/);
          if (match && match[1]) {
            const handle = match[1];
            const excluded = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts', 'about', 'legal'];
            if (!excluded.includes(handle) && !resolvedHandles.includes(handle)) {
              resolvedHandles.push(handle);
              break; // Take first valid match per competitor
            }
          }
        }
      } catch (err) {
        console.warn(`[handle-resolver] Skipping ${competitor}:`, err);
      }
    }

    console.log(`[handle-resolver] Resolved ${resolvedHandles.length} handles:`, resolvedHandles);
    return NextResponse.json({ handles: resolvedHandles });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[handle-resolver] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

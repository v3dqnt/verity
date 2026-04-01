import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const CACHE_TTL_HOURS = 12;

// --- TYPES ---
export type InstagramPost = {
  id: string;
  shortcode: string;
  type: 'GraphImage' | 'GraphVideo' | 'GraphSidecar';
  is_video: boolean;
  timestamp: number;
  posted_at: string; // human readable
  caption: string;
  hashtags: string[];
  mentions: string[];
  likes: number;
  comments: number;
  video_url: string | null;
  thumbnail_url: string;
  post_url: string;
};

export type InstagramProfile = {
  username: string;
  full_name: string;
  biography: string;
  followers: number;
  following: number;
  post_count: number;
  is_verified: boolean;
  profile_pic_url: string;
  external_url: string | null;
};

export type ScrapeResult = {
  profile: InstagramProfile;
  posts: InstagramPost[];
  reels: InstagramPost[];
  posting_frequency: PostingFrequency;
  top_hashtags: { tag: string; count: number }[];
};

type PostingFrequency = {
  total_posts_scraped: number;
  avg_posts_per_week: number;
  avg_posts_per_month: number;
  most_active_hour: number | null;
  date_range: { oldest: string; newest: string } | null;
};

// --- HELPERS ---
function extractHashtags(caption: string): string[] {
  return (caption.match(/#[\w\u0590-\u05ff]+/g) || []).map(h => h.toLowerCase());
}

function extractMentions(caption: string): string[] {
  return (caption.match(/@[\w.]+/g) || []).map(m => m.toLowerCase());
}

function toHumanDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function buildHeaders(sessionId: string): HeadersInit {
  return {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-IG-App-ID': '936619743392459', // Instagram Web App ID (public, hardcoded in IG web)
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://www.instagram.com/',
    'Cookie': `sessionid=${sessionId}`,
  };
}

// --- FETCH PROFILE METADATA ---
async function fetchProfile(username: string, sessionId: string): Promise<InstagramProfile> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
  const res = await fetch(url, { headers: buildHeaders(sessionId) });

  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status} ${res.statusText}`);

  const json = await res.json();
  const user = json?.data?.user;
  if (!user) throw new Error('User not found or profile is private.');

  return {
    username: user.username,
    full_name: user.full_name,
    biography: user.biography,
    followers: user.edge_followed_by?.count ?? 0,
    following: user.edge_follow?.count ?? 0,
    post_count: user.edge_owner_to_timeline_media?.count ?? 0,
    is_verified: user.is_verified,
    profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url,
    external_url: user.external_url || null,
  };
}

// --- FETCH POSTS (paginated) ---
async function fetchPosts(
  username: string,
  sessionId: string,
  maxPosts: number = 24
): Promise<InstagramPost[]> {
  const posts: InstagramPost[] = [];
  let endCursor: string | null = null;
  let hasNextPage = true;

  // First we need the user ID
  const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
  const profileRes = await fetch(profileUrl, { headers: buildHeaders(sessionId) });
  if (!profileRes.ok) throw new Error(`Could not fetch user ID: ${profileRes.status}`);
  const profileJson = await profileRes.json();
  const userId = profileJson?.data?.user?.id;
  if (!userId) throw new Error('Could not resolve user ID.');

  while (hasNextPage && posts.length < maxPosts) {
    const loopVariables: string = JSON.stringify({
      id: userId,
      first: Math.min(12, maxPosts - posts.length),
      ...(endCursor ? { after: endCursor } : {}),
    });

    const loopUrl: string = `https://www.instagram.com/graphql/query/?query_hash=e769aa130647d2354c40ea6a439bfc08&variables=${encodeURIComponent(loopVariables)}`;

    const loopRes: Response = await fetch(loopUrl, { headers: buildHeaders(sessionId) });
    if (!loopRes.ok) throw new Error(`Posts fetch failed: ${loopRes.status}`);

    const loopJson: any = await loopRes.json();
    const timelineNode: any = loopJson?.data?.user?.edge_owner_to_timeline_media;
    if (!timelineNode) throw new Error('Could not parse posts response.');

    const pageInfoData: any = timelineNode.page_info;
    hasNextPage = pageInfoData?.has_next_page ?? false;
    endCursor = pageInfoData?.end_cursor ?? null;

    for (const edge of timelineNode.edges || []) {
      const node = edge.node;
      const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || '';

      posts.push({
        id: node.id,
        shortcode: node.shortcode,
        type: node.__typename,
        is_video: node.is_video,
        timestamp: node.taken_at_timestamp,
        posted_at: toHumanDate(node.taken_at_timestamp),
        caption,
        hashtags: extractHashtags(caption),
        mentions: extractMentions(caption),
        likes: node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? 0,
        comments: node.edge_media_to_comment?.count ?? 0,
        video_url: node.video_url || null,
        thumbnail_url: node.thumbnail_src || node.display_url,
        post_url: `https://www.instagram.com/p/${node.shortcode}/`,
      });
    }

    // Polite delay between pages to avoid rate limiting
    if (hasNextPage && posts.length < maxPosts) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  return posts;
}

// --- COMPUTE POSTING FREQUENCY ---
function computeFrequency(posts: InstagramPost[]): PostingFrequency {
  if (posts.length === 0) {
    return {
      total_posts_scraped: 0,
      avg_posts_per_week: 0,
      avg_posts_per_month: 0,
      most_active_hour: null,
      date_range: null,
    };
  }

  const sorted = [...posts].sort((a, b) => a.timestamp - b.timestamp);
  const oldest = sorted[0].timestamp;
  const newest = sorted[sorted.length - 1].timestamp;
  const spanDays = Math.max((newest - oldest) / 86400, 1);

  const hours = posts.map(p => new Date(p.timestamp * 1000).getUTCHours());
  const hourCounts = hours.reduce((acc, h) => {
    acc[h] = (acc[h] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  const mostActiveHour = parseInt(
    Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '0'
  );

  return {
    total_posts_scraped: posts.length,
    avg_posts_per_week: parseFloat(((posts.length / spanDays) * 7).toFixed(2)),
    avg_posts_per_month: parseFloat(((posts.length / spanDays) * 30).toFixed(2)),
    most_active_hour: mostActiveHour,
    date_range: {
      oldest: toHumanDate(oldest),
      newest: toHumanDate(newest),
    },
  };
}

// --- TOP HASHTAGS ---
function computeTopHashtags(posts: InstagramPost[]): { tag: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    for (const tag of post.hashtags) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));
}

// --- ROUTE HANDLER ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username')?.trim().replace('@', '');
    const maxPosts = parseInt(searchParams.get('count') || '24', 10);

    if (!username) {
      return NextResponse.json({ error: 'Missing ?username= param' }, { status: 400 });
    }

    const sessionId = process.env.INSTAGRAM_SESSION_ID;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'INSTAGRAM_SESSION_ID env variable not set.' },
        { status: 500 }
      );
    }

    // --- CACHE CHECK (12hr TTL) ---
    const cacheKey = `ig_scrape_${username.toLowerCase()}`;
    const { data: cached } = await supabaseAdmin
      .from('radar_cache')
      .select('result, created_at')
      .eq('cache_key', cacheKey)
      .gte('created_at', new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (cached?.result) {
      console.log(`[ig-scraper] Cache HIT for @${username}`);
      const parsedResult = typeof cached.result === 'string'
        ? JSON.parse(cached.result)
        : cached.result;
      return NextResponse.json(parsedResult);
    }

    console.log(`[ig-scraper] Cache MISS for @${username} — fetching live...`);

    // Run profile + posts fetch in parallel
    const [profile, posts] = await Promise.all([
      fetchProfile(username, sessionId),
      fetchPosts(username, sessionId, Math.min(maxPosts, 50)), // cap at 50
    ]);

    const reels = posts.filter(p => p.is_video);
    const posting_frequency = computeFrequency(posts);
    const top_hashtags = computeTopHashtags(posts);

    const result: ScrapeResult = {
      profile,
      posts,
      reels,
      posting_frequency,
      top_hashtags,
    };

    // --- WRITE TO CACHE ---
    await supabaseAdmin.from('radar_cache').upsert({
      cache_key: cacheKey,
      result: JSON.stringify(result),
      created_at: new Date().toISOString(),
    }, { onConflict: 'cache_key' });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[instagram-scraper] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

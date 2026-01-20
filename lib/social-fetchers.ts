// lib/social-fetchers.ts
import { TwitterApi } from 'twitter-api-v2';

// 1. Initialize Twitter Client (Use Bearer Token for Read-Only)
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN || '');
const readOnlyClient = twitterClient.readOnly;

export async function getXPlatformTrends() {
  try {
    // WOEID 1 is Global. Use 23424977 for USA, etc.
    const trends = await readOnlyClient.v2.get('trends/by_woeid', { woeid: 1 });
    return trends.data.map((t: any) => ({
      name: t.name,
      volume: t.tweet_volume || 0,
      url: t.url,
      platform: 'x'
    }));
  } catch (error) {
    console.error("X API Error:", error);
    return [];
  }
}

// 2. Mocking Instagram (Since official API requires a Business App Review)
export async function getInstaHashtagTrends(query: string = 'streetwear') {
  // Logic: In production, you'd call: 
  // https://graph.facebook.com/v21.0/ig_hashtag_search?user_id={id}&q={query}
  
  return [
    { name: `${query}_vibes`, volume: 450000, platform: 'instagram' },
    { name: `vintage_${query}`, volume: 120000, platform: 'instagram' },
  ];
}

// 3. Unified Trend Engine (The "Pulse")
export async function getUnifiedPulse() {
  const [xTrends, instaTrends] = await Promise.all([
    getXPlatformTrends(),
    getInstaHashtagTrends('genz')
  ]);

  return [...xTrends, ...instaTrends].sort((a, b) => b.volume - a.volume);
}
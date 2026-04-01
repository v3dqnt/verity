import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
import { getAuthenticatedUser } from "../../auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
const openaiKey = process.env.OPENAI_API_KEY || '';

// --- TYPES ---
type TrendStrategy = {
  format_explanation: string;
  key_slang: string[];
};

type TrendItem = {
  name: string;
  status: "EXPLODING" | "RISING";
  score: number;
  desc: string;
  platform: string;
  ugc_strategy: TrendStrategy;
  source_evidence: string;
  example_urls: string[];
  source_links: string[];
};

// --- TREND SCHEMA DEFINITION ---
const TrendSchema = z.object({
  thinking: z.string().describe("A deep, strategic thought process analyzing the brand context and user intent before generating trends."),
  trends: z.array(z.object({
    name: z.string().describe("The name of the cultural signal or trend."),
    status: z.enum(["EXPLODING", "RISING"]).describe("The current velocity status."),
    score: z.number().describe("Velocity score from 0 to 100."),
    desc: z.string().describe("Why is this trend viral on the internet right now?"),
    platform: z.enum(["YouTube", "Instagram", "TikTok", "Reddit", "Twitter"]).describe("Primary platform where this signal is peaking."),
    ugc_strategy: z.object({
      format_explanation: z.string().describe("A detailed explanation of how this video format works: structure, pacing, visual style, narrative flow, and why it performs well on the platform."),
      key_slang: z.array(z.string()).describe("Keywords that trigger the 'in-group' feeling.")
    }).describe("Creative strategy to bridge this trend to a brand."),
    source_evidence: z.string().describe("One sentence proving this trend is real, e.g. 'Trending YouTube Short with 2M views this week'."),
    example_urls: z.array(z.string()).describe("1-3 URLs of real video examples using this trend."),
    source_links: z.array(z.string()).describe("1-2 URLs of the original source (hashtag page, audio page, etc.).")
  })).min(3).max(3)
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const intent = searchParams.get('q') || "";
    const paramsUserId = searchParams.get('userId');
    const authUserId = await getAuthenticatedUser(req);
    const userId = authUserId || paramsUserId;
    const brandId = searchParams.get('brandId');

    if (paramsUserId && paramsUserId !== authUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!openaiKey) {
      return NextResponse.json({ posts: [], error: "System configuration error: OpenAI Key missing." }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Parallelize Data Fetching
    const [brandContextRes, vaultItemsRes] = await Promise.all([
      (brandId && brandId !== 'null' && brandId !== 'undefined')
        ? supabaseAdmin.from('briefs').select('*').eq('id', brandId).maybeSingle()
        : Promise.resolve({ data: null }),
      (userId && userId !== 'undefined' && userId !== 'null')
        ? supabaseAdmin.from('signal_vault').select('topic').eq('user_id', userId)
        : Promise.resolve({ data: [] })
    ]);

    const brandContext = brandContextRes.data as Record<string, unknown> | null;
    const savedTopics = new Set((vaultItemsRes.data as { topic: string }[] | null)?.map(v => v.topic) || []);

    // Load user's saved vault if no search is active
    if (!intent && !brandId && userId && userId !== 'undefined' && userId !== 'null') {
      const { data, error } = await supabaseAdmin
        .from('signal_vault')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ data: data || [] });
    }

    const industry = brandContext?.industry ? String(brandContext.industry) : (intent || "general");
    const today = new Date().toDateString();

    const normalizedBrandId = (brandId && brandId !== 'null' && brandId !== 'undefined') ? brandId : 'nobrand';
    const normalizedIntent = intent?.trim().toLowerCase() || 'general';
    const cacheKey = `radar_${normalizedBrandId}_${normalizedIntent}`;
    const { data: cached } = await supabaseAdmin
      .from('radar_cache')
      .select('result, created_at')
      .eq('cache_key', cacheKey)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (cached) return NextResponse.json(cached.result);

    // --- COMPETITOR INTEL (with per-competitor caching) ---
    let competitorIntel = "";
    const competitors: string[] = (Array.isArray(brandContext?.competitors)
      ? (brandContext.competitors as string[])
      : []
    ).slice(0, 3);

    if (competitors.length > 0) {
      const competitorIntelSummaries = await Promise.all(
        competitors.map(async (competitor) => {
          const competitorCacheKey = `competitor_intel_${competitor
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "")}`;

          // Check cache first (6 hour TTL)
          const { data: cachedIntel } = await supabaseAdmin
            .from("radar_cache")
            .select("result, created_at")
            .eq("cache_key", competitorCacheKey)
            .gte(
              "created_at",
              new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
            )
            .maybeSingle();

          if (cachedIntel) {
            console.log(`Competitor cache hit: ${competitor}`);
            return `Competitor: ${competitor}\n${cachedIntel.result.summary}`;
          }

          // Cache miss — run standard completions
          console.log(`Competitor cache miss, fetching: ${competitor}`);
          const res = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are a social media competitive analyst. Predict a concise 3-5 sentence summary of what this brand/creator is likely posting on Instagram and YouTube right now based on their name and industry context. Focus on video formats, hooks, topics, and posting frequency.",
              },
              {
                role: "user",
                content: `What video formats, topics, and hooks are they using right now? Competitor name: "${competitor}"`,
              },
            ],
          });

          const summary = res.choices[0]?.message?.content?.trim() || "No data found.";

          // Save to cache asynchronously
          supabaseAdmin
            .from("radar_cache")
            .upsert({
              cache_key: competitorCacheKey,
              result: { summary },
            })
            .then(
              () => console.log(`Competitor intel cached: ${competitor}`),
              (e: any) => console.error(`Competitor cache save failed: ${e}`)
            );

          return `Competitor: ${competitor}\n${summary}`;
        })
      );

      competitorIntel = `
COMPETITOR CONTENT INTEL (Live Research):
${competitorIntelSummaries.join("\n\n")}

Use this to:
- Identify formats competitors are over-indexing on (so the brand can differentiate)
- Spot gaps in competitor content the brand can own
- Avoid recommending trends the competitors are already saturating
`;
    }

    const brandPromptPart = brandContext ? `
      BRAND IDENTITY DEEP DIVE:
      - Overview Summary: ${brandContext.brand_summary || 'N/A'}
      - Company Name: ${brandContext.company_name || 'N/A'}
      - Entity Type: ${brandContext.entity_type || 'brand'}
      - Industry Segment: ${brandContext.industry || 'N/A'}
      - Tagline: ${brandContext.tagline || 'N/A'}
      - Mission Brief: ${brandContext.mission_brief || 'N/A'}
      - Vision: ${brandContext.vision || 'N/A'}
      - Strategy Label: ${brandContext.title || 'N/A'}

      MARKET POSITIONING:
      - Archetype: ${brandContext.archetype || 'N/A'}
      - Personality Traits: ${JSON.stringify(brandContext.personality || [])}
      - Values: ${JSON.stringify(brandContext.values || [])}
      - Positioning Statement: ${brandContext.positioning || 'N/A'}
      - Competitors/Inspirations: ${JSON.stringify(brandContext.competitors || [])}
      ${competitorIntel}

      AUDIENCE:
      - Target Age Groups: ${JSON.stringify(brandContext.target_age_groups || [])}
      - Target Audience (General): ${brandContext.target_audience || 'N/A'}

      BRAND VOICE & TONE:
      - Primary Tone: ${brandContext.tone_voice || 'N/A'}
      - Extra Tone Instructions: ${brandContext.tone_extra_instructions || 'N/A'}
      - Voice Traits: ${JSON.stringify(brandContext.voice_traits || [])}
      - Do Say: ${JSON.stringify(brandContext.do_say || [])}
      - Don't Say: ${JSON.stringify(brandContext.dont_say || [])}
      - Humor Style: ${brandContext.humor_style || 'N/A'}
      - Slang Level: ${brandContext.slang_level || 3}/5
      - Emoji Usage: ${brandContext.emoji_usage || 2}/5

      VISUAL IDENTITY:
      - Visual Aesthetic: ${brandContext.visual_aesthetic || 'N/A'}
      - Logo URL: ${brandContext.logo_url || 'N/A'}
      - Product Analysis/DNA: ${JSON.stringify(brandContext.product_analysis || [])}
      - Reference Content Samples: ${JSON.stringify(brandContext.content_samples || [])}

      GUARDRAILS:
      - Legal Constraints: ${JSON.stringify(brandContext.legal_constraints || [])}
      - Sensitive Topics: ${JSON.stringify(brandContext.sensitive_topics || [])}
      - Banned Topics: ${JSON.stringify(brandContext.banned_topics || [])}

      ${brandContext.entity_type === 'creator' ? `
      CREATOR-SPECIFIC INTEL:
      - Creator Stage: ${brandContext.creator_stage || 'N/A'}
      - Persona Name: ${brandContext.persona_name || 'N/A'}
      - Goals: ${JSON.stringify(brandContext.goals || [])}
      - Content Pillars: ${JSON.stringify(brandContext.content_pillars || [])}
      - Catchphrases: ${JSON.stringify(brandContext.catchphrases || [])}
      - On-Screen Presence: ${brandContext.on_screen_presence || 'N/A'}
      - Awareness Level: ${brandContext.awareness_level || 'N/A'}
      - Language Style: ${brandContext.language_style || 'N/A'}
      - Pain Points: ${JSON.stringify(brandContext.pain_points || [])}
      - Objections: ${JSON.stringify(brandContext.objections || [])}
      - Content they skip: ${JSON.stringify(brandContext.content_they_skip || [])}
      - Offers/Monetization: ${JSON.stringify(brandContext.offers || [])}
      - Visual References: ${JSON.stringify(brandContext.visual_refs || [])}
      - No-Go Visuals: ${JSON.stringify(brandContext.no_go_visuals || [])}
      - Preferred Brand Partnerships: ${JSON.stringify(brandContext.preferred_brand_types || [])}
      - Personal Boundaries: ${JSON.stringify(brandContext.personal_boundaries || [])}
      ` : ''}

      SOCIAL PRESENCE LINKS:
      ${JSON.stringify(brandContext.social_links || {})}
    ` : `No specific brand context provided. Use general high-velocity internet signals. (Primary focus: ${industry || 'global impact'})`;

    const signalContext = savedTopics.size > 0
      ? `EXCLUSION LIST (Do not suggest these): ${Array.from(savedTopics).join(", ")}`
      : "";

    const industrySegment = industry || "general";

    const instructions = `
DATE: ${today}

ROLE:
You are a platform-native trend analyst for Instagram Reels and YouTube Shorts. Your task is to find high-velocity trends and validate them for the specific brand context.

RESEARCH MANDATE: You MUST call web_search at least 4 times before selecting any trend.
Required searches:
1. "trending ${industrySegment} video format Instagram Reels ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}"
2. "viral ${industrySegment} YouTube Shorts format this week"
3. "${intent} content going viral Instagram ${new Date().getFullYear()}"
4. "top ${industrySegment} creators YouTube format trend"
Only select trends that appear in your search results. If you cannot find evidence, do not include the trend.

GOAL:
Return exactly 3 REAL trends that:
1) Are already visible on Instagram or YouTube.
2) Match the brand voice perfectly (Avoid corporate-cringe or off-brand suggestions).
3) Directly advance the user's goal: "${intent || "global impact"}".

BRAND CONTEXT:
${brandPromptPart}

USER INTENT:
"${intent || "global impact"}"

${signalContext}

REALISM RULES:
- Only select trends currently circulating on Instagram Reels or YouTube Shorts.
- Do NOT invent trends. Each must reflect a format creators are actively repeating.
- Format explanations must describe how creators actually shoot and structure the video.
- No corporate tone. No marketing jargon.
- If a trend feels awkward for this brand, reject it.

PLATFORM PRIORITY:
- Instagram and YouTube only.
- TikTok-only trends are forbidden unless clearly active on IG/YT.

INTENT MATCH RULES:
Sales → demos, testimonials, UGC proof  
Awareness → remixable hooks, meme formats  
Authority → myth-busting, explainers  
Community → challenges, POVs  

FORMAT TRANSLATION REQUIREMENTS:
For each trend:
- Rename it in creator-native language.
- Describe exactly how creators structure the video (hook style, pacing, framing, beat flow).
- Explain why this format is spreading now.

EVIDENCE REQUIREMENTS:
- 'source_evidence' must reference real observable behavior.
- 'example_urls' must be plausible Instagram or YouTube URLs.
- 'source_links' must be plausible hashtag or discovery pages.

SELF-AUDIT BEFORE OUTPUTTING:
- Remove any trend that sounds invented or corporate.
- Ensure all format_explanations describe how creators actually film this.
- If a trend wouldn't feel native to this brand, replace it.
Only output trends that pass this check.

OUTPUT CONTRACT:
Return ONLY valid JSON:
{
  "thinking": "Your deep strategic thought process and editorial rationale for selecting these 3 specific trends for this brand.",
  "trends": [
    {
      "name": "...",
      "status": "EXPLODING or RISING",
      "score": 30–100,
      "desc": "...",
      "platform": "Instagram or YouTube",
      "ugc_strategy": {
        "format_explanation": "...",
        "key_slang": []
      },
      "source_evidence": "...",
      "example_urls": ["..."],
      "source_links": ["..."]
    }
  ]
}
`;

    console.log(`Executing OpenAI GPT-5 Research for: ${industry}...`);

    const researchResponse = await openai.responses.create({
      model: "gpt-5",
      tools: [{ type: "web_search" }],
      input: [
        {
          role: "system",
          content: "Use web_search to ground your trend selection in current Instagram and YouTube behavior."
        },
        {
          role: "user",
          content: instructions
        }
      ]
    });

    const rawText = researchResponse.output_text || "{}";
    const cleanText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsedData = JSON.parse(cleanText);

    const validated = TrendSchema.safeParse(parsedData);
    if (!validated.success) {
      // Try extracting just the trends array if top-level structure is off
      const fallback = TrendSchema.safeParse({
        thinking: parsedData?.thinking || "N/A",
        trends: parsedData?.trends || []
      });
      if (!fallback.success) throw new Error("AI output was invalid.");
      parsedData = fallback.data;
    } else {
      parsedData = validated.data;
    }

    const posts = (parsedData.trends || []).map((item: any, idx: number) => {
      return {
        id: `trend-${idx}-${Date.now()}`,
        name: item.name,
        status: item.status,
        score: item.score,
        desc: item.desc,
        category: item.platform,
        link: `https://www.google.com/search?q=${encodeURIComponent(item.name)}`,
        isSaved: savedTopics.has(item.name),
        ugc_strategy: item.ugc_strategy,
        source_evidence: item.source_evidence,
        example_urls: item.example_urls,
        source_links: item.source_links
      };
    });

    const result = {
      posts,
      thinking: parsedData.thinking
    };

    // Cache the result asynchronously without awaiting if possible, but fine to await usually
    supabaseAdmin.from('radar_cache').upsert({
      cache_key: cacheKey,
      result: result
    }).then(
      () => console.log('Radar cache updated for key', cacheKey),
      (e: any) => console.error('Cache save failed', e)
    );

    return NextResponse.json(result);

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("GET_ERROR:", errorMsg);
    return NextResponse.json({ posts: [], error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { trend, userId: paramsUserId } = await req.json();
    const authUserId = await getAuthenticatedUser(req);
    const userId = authUserId || paramsUserId;

    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (paramsUserId && paramsUserId !== authUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const cleanScore = Math.round(trend.score || 80);
    const { data, error } = await supabaseAdmin.from('signal_vault').upsert({
      user_id: userId,
      topic: trend.name,
      growth_score: cleanScore,
      status: trend.status || 'RISING',
      raw_data: trend
    }, { onConflict: 'user_id, topic' }).select();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paramsUserId = searchParams.get('userId');
    const topic = searchParams.get('topic');
    const authUserId = await getAuthenticatedUser(req);
    const userId = authUserId || paramsUserId;

    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (paramsUserId && paramsUserId !== authUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (!userId || !topic) return NextResponse.json({ error: "Missing params" }, { status: 400 });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabaseAdmin.from('signal_vault').delete().eq('user_id', userId).eq('topic', topic);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
    const userId = searchParams.get('userId');
    const brandId = searchParams.get('brandId');

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

    const brandPromptPart = brandContext ? `
      BRAND IDENTITY DEEP DIVE:
      - Company Name: ${brandContext.company_name || 'N/A'}
      - Industry Segment: ${brandContext.industry || 'N/A'}
      - Brand Tone & Voice: ${brandContext.tone_voice || 'N/A'}
      - Target Audience: ${brandContext.target_audience || 'N/A'}
      - Target Age Groups: ${JSON.stringify(brandContext.target_age_groups || [])}
      - Mission Brief: ${brandContext.mission_brief || 'N/A'}
      - Visual Aesthetic: ${brandContext.visual_aesthetic || 'N/A'}
      - Entity Type: ${brandContext.entity_type || 'brand'}
      - Competitors: ${JSON.stringify(brandContext.competitors || [])}
      - Social Links: ${JSON.stringify(brandContext.social_links || {})}
      - Content Samples (reference URLs): ${JSON.stringify(brandContext.content_samples || [])}
      - Product Analysis: ${JSON.stringify(brandContext.product_analysis || [])}
    ` : `No specific brand context provided. Use general high-velocity internet signals.`;

    const signalContext = savedTopics.size > 0
      ? `EXCLUSION LIST (Do not suggest these): ${Array.from(savedTopics).join(", ")}`
      : "";

    const categoryContext = industry && industry !== "general"
      ? `INDUSTRY FOCUS: ${industry}`
      : "";


    const platforms = ["Instagram", "YouTube", "Twitter"];
    const industrySegment = industry || "general";

    const baseQueries = [
      `what video format is trending in ${industrySegment} on Instagram`,
      `what video format is trending in ${industrySegment} on YouTube`,
      `what content style is blowing up in ${industrySegment} Instagram Reels`,
      `what Shorts format is trending in ${industrySegment} YouTube`,
      `top viral ${industrySegment} creators this week`,
      `trending ${industrySegment} hashtags on Instagram`,
      `trending ${industrySegment} YouTube Shorts this week`
    ];

    const intentQueries = intent
      ? [
        `best performing ${industrySegment} videos for ${intent} on Instagram`,
        `best performing ${industrySegment} videos for ${intent} on YouTube`,
        `how ${industrySegment} brands are going viral on Instagram`,
        `how ${industrySegment} creators are going viral on YouTube`
      ]
      : [];

    const allQueries = [...baseQueries, ...intentQueries];

    const instructions = `
DATE: ${today}

ROLE:
You are a platform-native trend analyst for Instagram Reels and YouTube Shorts. Your task is to find high-velocity trends and validate them for the specific brand context.

RESEARCH MANDATE:
Before selecting any trends, mentally simulate searching these exact queries:
${allQueries.map(q => `- ${q}`).join("\n")}

You are ONLY allowed to select trends that would realistically appear from these searches.

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

    // --- STEP 2: GPT-5 VALIDATOR PASS ---
    try {
      console.log("Starting GPT-5 Validator Pass...");
      const validatorPrompt = `
        You are a ruthless brand + culture editor. Review these trends for the brand context provided.

        BRAND CONTEXT:
        ${brandPromptPart}

        USER INTENT:
        ${intent || "global impact"}

        INPUT TRENDS:
        ${JSON.stringify(parsedData.trends, null, 2)}

        TASK:
        1. Remove any trend that sounds fake, corporate-cringe, or off-brand.
        2. Ensure hooks and format explanations sound creator-native.
        3. Rewrite descriptions to reflect real high-velocity behavior.
        4. Return the same JSON structure with 'thinking' and 'trends' (Exactly 3).
      `;

      const validationResponse = await openai.responses.create({
        model: "gpt-5",
        input: validatorPrompt,
      });

      const validatedText = validationResponse.output_text || "{}";
      const cleanValidated = validatedText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanValidated);
    } catch (valErr) {
      console.warn("Validator Pass Failed (using raw research):", valErr);
    }

    // --- STEP 3: URL VALIDATION PASS ---
    const validateUrl = async (url: string) => {
      if (!url || url.includes("example.com") || url.includes("PLACEHOLDER")) return null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
          signal: controller.signal
        });
        clearTimeout(timeout);
        return res.ok ? url : null;
      } catch {
        return null;
      }
    };

    console.log("Validating signal URLs...");
    const posts = await Promise.all((parsedData.trends || []).map(async (item: any, idx: number) => {
      const [validExamples, validSources] = await Promise.all([
        Promise.all((item.example_urls || []).map(validateUrl)),
        Promise.all((item.source_links || []).map(validateUrl))
      ]);

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
        example_urls: validExamples.filter(Boolean),
        source_links: validSources.filter(Boolean)
      };
    }));

    return NextResponse.json({
      posts,
      thinking: parsedData.thinking,
      intelligence: {
        raw_output: rawText
      }
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("GET_ERROR:", errorMsg);
    return NextResponse.json({ posts: [], error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { trend, userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "No User ID" }, { status: 401 });
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
    const userId = searchParams.get('userId');
    const topic = searchParams.get('topic');
    if (!userId || !topic) return NextResponse.json({ error: "Missing params" }, { status: 400 });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabaseAdmin.from('signal_vault').delete().eq('user_id', userId).eq('topic', topic);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

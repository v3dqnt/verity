import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: Request) {
  try {
    const { brandData } = await req.json();

    const cacheKey = `intel_cache_v4_${brandData?.name?.toLowerCase().replace(/\s+/g, '_') || 'default'}`;
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: cachedIntel } = await supabaseAdmin
        .from("radar_cache")
        .select("result, created_at")
        .eq("cache_key", cacheKey)
        .gte("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
        
      if (cachedIntel?.result) {
        console.log(`[CompetitorIntel] Cache HIT for ${brandData?.name}`);
        let parsedCache = cachedIntel.result;
        if (typeof parsedCache === 'string') {
          try { parsedCache = JSON.parse(parsedCache); } catch(e) { /* ignore */ }
        }
        return NextResponse.json({ content: parsedCache });
      }
      console.log(`[CompetitorIntel] Cache MISS for ${brandData?.name}`);
    }
    const systemPrompt = `You are a market analyst analyzing the content strategies of the following brand's competitors. 
Industry: ${brandData?.industry || 'General'}.
Competitors: ${(brandData?.competitors || []).join(', ') || 'General industry leaders'}.

Return ONLY valid JSON that matches the following structure:
{
  "summary": "1 sentence overarching summary of the competitive landscape",
  "content_types": ["[Competitor Name]: [Specific video format they use]", "[Another Competitor]: [Format]"],
  "what_works": ["[Competitor Name]: [Why it works for them]", "[Another Competitor]: [Why it works]"],
  "gaps": ["Unexploited gap 1", "Unexploited gap 2"],
  "instagram_handles": ["exact_ig_username1", "exact_ig_username2"]
}

Keep all points concise, highly actionable, and remove all markdown (no ** or ###). Ensure you explicitly mention the competitor's name in the content_types and what_works arrays.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    const parsedContent = JSON.parse(response.choices[0]?.message?.content || '{}');

    const content = Object.keys(parsedContent).length > 0 ? parsedContent : null;

    if (content) {
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        await supabaseAdmin.from("radar_cache").upsert({
          cache_key: cacheKey,
          result: JSON.stringify(content),
          created_at: new Date().toISOString()
        }, { onConflict: 'cache_key' });
      }

      return NextResponse.json({ content });
    } else {
      return NextResponse.json({ content: "Unable to generate intelligence." });
    }

  } catch (error: any) {
    console.error("Competitor Intel Error:", error);
    return NextResponse.json({ 
      content: `Unable to fetch competitor intelligence: ${error.message}` 
    });
  }
}

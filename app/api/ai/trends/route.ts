import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiKey = process.env.GOOGLE_API_KEY!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || "internet culture";
    const userId = searchParams.get('userId');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (!searchParams.get('q') && userId && userId !== 'undefined' && userId !== 'null') {
      const { data, error } = await supabaseAdmin
        .from('signal_vault')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ data: data || [] });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    let savedTopics = new Set();

    if (userId && userId !== 'undefined' && userId !== 'null') {
      const { data: vaultItems } = await supabaseAdmin.from('signal_vault').select('topic').eq('user_id', userId);
      savedTopics = new Set(vaultItems?.map((v: any) => v.topic) || []);
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }] as any,
    });

    // --- ENHANCED INTELLIGENT PROMPT ---
    const prompt = `
      Current Date: Monday, January 19, 2026.
      Role: You are a Lead Cultural Forecaster and Trend Analyst.
      
      Task: Analyze the user's search query: "${query}".
      
      Intelligence Protocol:
      1. Intent Mapping: Determine the 'vibe' of the query. If the user searches "Fashion", find sub-cultures (e.g., 'Cyber-Nomadism'). If they search "Tech", find 'Human-centric AI' shifts.
      2. Multi-Layer Search: 
         - Use Google Search to find high-velocity keywords.
         - Identify specific TikTok/Reels audio tracks or visual "filters" that are peaking.
         - Detect "Micro-trends" (niche but growing) vs "Macro-trends" (mainstream).
      3. Filtering: Ignore "evergreen" news. Only return items that have spiked in interest within the last 48-72 hours.
      
      Response Requirements:
      - Return exactly 7 high-signal items.
      - Ensure a mix of Platform-specific data (e.g., "TikTok Audio", "Reddit Discourse", "Search Volume").
      - Scoring: Assign a score (0-100) based on the "Velocity" (how fast it's spreading).

      Return ONLY a JSON object:
      {"trends": [{"name": "string", "status": "EXPLODING" | "RISING", "score": number, "desc": "granular 1-sentence analysis of WHY this matters", "platform": "string"}]}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");
    
    const parsedData = JSON.parse(jsonMatch[0]);
    const trendArray = parsedData.trends || parsedData;

    const posts = (Array.isArray(trendArray) ? trendArray : []).map((item: any, idx: number) => ({
        id: `trend-${idx}-${Date.now()}`,
        name: item.name || "Unknown Trend",
        status: item.status || (item.score > 90 ? "EXPLODING" : "RISING"),
        score: Math.min(100, Math.max(0, item.score || 85)),
        desc: `[${item.platform || 'Signal'}] ${item.desc || ''}`,
        category: item.platform === "Google" ? "Search Intent" : "Social Pulse",
        link: `https://www.google.com/search?q=${encodeURIComponent(item.name || '')}`,
        isSaved: savedTopics.has(item.name)
    }));

    return NextResponse.json({ posts });

  } catch (error: any) {
    console.error("GET_ERROR:", error);
    return NextResponse.json({ posts: [], error: error.message }, { status: 500 });
  }
}

// ... POST and DELETE methods stay the same as your provided code
export async function POST(req: Request) {
  try {
    const { trend, userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "No User ID" }, { status: 401 });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    let cleanScore = trend.score || 80;
    cleanScore = cleanScore > 0 && cleanScore <= 1 ? Math.round(cleanScore * 100) : Math.round(cleanScore);
    const { data, error } = await supabaseAdmin
      .from('signal_vault')
      .upsert({
        user_id: userId,
        topic: trend.name,
        growth_score: cleanScore, 
        status: trend.status || 'RISING',
        raw_data: trend 
      }, { onConflict: 'user_id, topic' })
      .select();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
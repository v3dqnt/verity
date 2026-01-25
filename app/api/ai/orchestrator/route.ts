import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { goal, brandId, trendId, platform, scriptType = 'Content', mode = 'orchestration' } = await req.json();
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Initialize AI clients
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // 1. FETCH BRAND DNA (Optional in Improvement Mode)
    let brandVault = null;
    if (brandId && mode !== 'improvement') {
      const { data } = await supabase.from('briefs').select('*').eq('id', brandId).single();
      brandVault = data;
    }

    if (!brandVault && mode !== 'improvement') return NextResponse.json({ error: "Missing Brand DNA" }, { status: 400 });

    // 2. FETCH TREND SIGNAL
    let trendSignal = null;
    const shouldFollowTrend = scriptType === 'Content';

    if (trendId && shouldFollowTrend) {
      const { data } = await supabase.from('signal_vault').select('*').eq('id', trendId).single();
      trendSignal = data;
    }

    const isHeroMode = platform.toLowerCase() === 'all';

    // 3. DEFINE PLATFORM REQUIREMENTS
    const requirements = {
      youtube: "Long-form narrative (12-15 beats). Tone: Educational/Storyteller. Start with a curiosity gap hook. Include specific b-roll descriptions in 'action' fields. Captions: Professional, SEO-rich, with 3-5 relevant hashtags.",
      tiktok: "Short-form high energy (6-8 beats). Tone: Fast-paced, punchy, trend-hacking. Start with a visual/audio 'pattern interrupt'. Use current slang naturally but lightly. Captions: Short, punchy, emoji-light, with 2 viral hashtags.",
      instagram: "Visual-first (6-8 beats). Tone: Polished, cinematic, aspirational. Focus on visual transitions in 'action' fields. Captions: Aesthetic, storytelling focused, with 5 niche hashtags and a clear CTA."
    };

    // 4. CONSTRUCT SYSTEM PROMPT (HUMAN-LIKE)
    const brandBlock = brandVault ? `
Brand: ${brandVault.company_name} (${brandVault.entity_type})
Tone: ${brandVault.tone_voice}
Visual Aesthetic: ${brandVault.visual_aesthetic}
Target Audience: ${brandVault.target_audience} (Focus: ${brandVault.target_age_groups?.join(', ')})
Competitors: ${brandVault.competitors?.join(', ')}
Mission: ${brandVault.mission_brief}
Product Visual DNA: ${JSON.stringify(brandVault.product_analysis || [])}
` : '[NO BRAND DNA PROVIDED]';

    // Strategy Definitions
    const strategyPrompts: any = {
      UGC: `
[MISSION: UGC MODE]
You are a content creator, not a brand.
Vibe: "I just picked up my phone and told you what happened."
Primary goal: Build trust through relatability and authenticity.
Narrative shape: Personal story -> mild struggle -> discovery -> honest reaction -> soft share.
Language style: Casual, imperfect phrasing (hesitations/interjections), skepticism before belief. NO slogans.
Visuals: Selfie cam, handheld, real environments, messy moments included.
Product role: Supporting character, not the hero.
CTA: Soft and optional (e.g. "If you're curious, it's in my bio.")
Constraint: No corporate tone. No "marketing" speak.
`,
      Advertisement: `
[MISSION: ADVERTISEMENT MODE]
You are a direct-response marketer.
Vibe: "We know what problem you have. Here’s the fix."
Primary goal: Drive action and conversion.
Narrative shape: Hook -> problem -> solution -> benefit -> proof -> CTA.
Language style: Clear, confident, benefit-forward. Taglines allowed.
Visuals: Polished transitions, product beauty shots, clear framing, text overlays.
Product role: The hero.
CTA: Strong and explicit (e.g. "Tap the link and get yours today.")
Constraint: High energy, clear value prop, inescapable hook.
`,
      Content: `
[MISSION: CONTENT MODE]
You are an authority figure/educator.
One-line definition: Content = a surprising insight + personal proof + subtle product assist + repeatable takeaway.

Vibe: "Here’s something that shouldn’t work like this… but it does."
Primary Goal: Deliver a mindset shift that’s useful, surprising, and emotionally sticky. Product is a sidekick, not the headline.

[NARRATIVE SHAPE]
1. Pattern-Interrupt Hook (0–2s): Say something that slightly contradicts expectations.
2. Friction / Curiosity Gap (2–6s): Introduce a relatable tension or confusion.
3. Insight Drop (6–12s): Deliver one simple, unexpected idea.
4. Personal Anchor (12–20s): Tie the idea to your real behavior.
5. Demonstration / Visual Proof (20–30s): Show, don’t explain. Organize. Sit down. Start working.
6. Emotional Micro-Payoff (30–38s): Name a feeling shift.
7. Soft Takeaway + CTA (38–45s): Leave a repeatable insight + optional next step.

[LANGUAGE STYLE]
Engineered for Clarity, Simplicity, and Personal Touch.
- Short, uneven sentences. One idea per line.
- Conversational, not polished. Contractions everywhere.
- Soft emotional vocabulary. Light skepticism before belief.
- Allowed: "Honestly…", "Real talk…", "I didn’t expect this…", "This sounds dumb, but…"
- BANNED: "Game-changer", "Next-level", "Unlock your potential", "Revolutionary"

[VISUALS]
Retention-first, not aesthetic-first.
- Immediate visual contrast (before vs after).
- Fast early movement (first 2 seconds).
- Simple props, real spaces.
- Micro-actions: picking up items, sitting down, exhale, typing.
- Every visual must: Reduce cognitive load OR Increase emotional resonance OR Reinforce the insight.

[PRODUCT ROLE]
Tool in a story, not the star.
- Introduced after the insight.
- Framed as something that helped you apply the idea.
- No feature dumps. No logo slams.

[CTA]
Soft, optional, value-aligned. Zero urgency language.
Example: "I linked what I'm using if you want to check it out."

[TREND ADHERENCE]
Selected Trend: "${trendSignal ? trendSignal.topic : 'Evergreen Value'}"
Trend Usage Strategy: "${trendSignal?.raw_data?.ugc_strategy?.format_explanation || trendSignal?.raw_data?.desc || 'Focus on value-driven storytelling and education.'}"

MANDATE: You MUST structure the script to align with the "Trend Usage Strategy" above. Use the specific format, pacing, or hook style described to ensure the content feels native to this trend.
`,
      Improvement: `
[MISSION: SCRIPT IMPROVEMENT]
You are a ruthless viral script editor.
Goal: Take the provided draft and transform it into a high-retention performance script.

Process:
1. Critique: Analyze the existing script against virality criteria (Hook, Pacing, Clarity, Relatability).
2. Tweak & Polish: Rewrite lines to increase impact, remove fluff, and add emotional texture.
3. Humanize: Add creator-native "imperfections" (hesitations, pauses, relief).

Output Requirement (STRICT):
You MUST return a JSON object containing:
1. "improvements": An array of objects: { "original": string, "tweak": string, "reasoning": string }.
2. "script": An array of script beats: { "timestamp": string, "speaker": string, "action": string, "dialogue": string }.
3. "title": A punchy viral title.
4. "authenticityScore": 0-100.

Strategy context for ${scriptType}:
${scriptType === 'UGC' ? 'Focus on raw sincerity, messy environments, and "unfiltered" truth.' : ''}
${scriptType === 'Advertisement' ? 'Focus on frame-one hooks, sharp benefits, and unavoidable CTAs.' : ''}
${scriptType === 'Content' ? 'Focus on surprising insights and repeatable mindset shifts.' : ''}
`
    };

    const selectedStrategy = mode === 'improvement' ? strategyPrompts.Improvement : (strategyPrompts[scriptType] || strategyPrompts.Content);

    const systemPrompt = `
You are the Content Producer AI, powered by GPT-5.

${mode === 'improvement' ? '[MODE: SCRIPT IMPROVEMENT]' : brandBlock}

Goal: ${mode === 'improvement' ? 'IMPROVE THIS SCRIPT' : goal}
Target script for improvement: ${mode === 'improvement' ? goal : 'N/A (Generating from scratch)'}
Current focus: ${platform.toUpperCase()}
Category Context: ${scriptType}

${selectedStrategy}

[HUMANIZATION MANDATE]
- Write dialogue like a real creator speaking, not a marketing brochure.
- Use contractions (it's, you're, we’re) where natural.
- Add subtle imperfections: hesitations, micro-pauses, light self-corrections.
- Vary sentence length and rhythm.
- Avoid over-polished corporate phrasing.
- Insert emotional texture: curiosity, mild doubt, excitement, relief.
- Reference real-world behaviors (scrolling, notifications, messy desks, coffee, late nights) when relevant.
- Use story beats: setup, friction, insight, resolution.

[RESEARCH MANDATE]
If the user goal contains links, references, or specific names, use the web_search tool to find the most recent data. Ground your script generation in this real-time evidence.

[SELF-VALIDATION]
You MUST assess if your output truly matches the selected Category (${scriptType}). In your JSON, include a "validation_question" field that asks: "is this a good script for ${scriptType}?"

[DURATION LOGIC]
1. SCRIPT LENGTH: Determine the target duration based on the Goal: "${goal}".
   - If a time is mentioned, strictly follow it.
   - If NO time is mentioned, use platform defaults:
     * TikTok/Instagram: 30-60 seconds (6-8 beats).
     * YouTube: 5-8 minutes (12-15 beats).
2. PACING: Adjust depth of dialogue and number of beats.
3. AUTHENTICITY: Score from 0-100.

[OUTPUT SCHEMA]
Return a single JSON object for ${platform}.

Example JSON (DO NOT DEVIATE):
${mode === 'improvement' ?
        `{
    "platform": "${platform}",
    "authenticityScore": 95,
    "title": "Improved Script Name",
    "improvements": [
      { "original": "Hi everyone welcome back to my channel", "tweak": "Stop scrolling. You've been lied to about productivity.", "reasoning": "Replacing a weak introduction with a high-tension pattern interrupt hook." }
    ],
    "script": [
      { "timestamp": "0:00", "speaker": "Host", "action": "Intense close up", "dialogue": "Stop scrolling. You've been lied to about productivity." }
    ],
    "captions": ["..."]
  }` :
        `{
    "platform": "${platform}",
    "authenticityScore": 95,
    "title": "The Hidden Truth",
    "postingTime": "10:00 AM",
    "thumbnail": { "concept": "Clean workspace", "visualPrompt": "A pristine white desk", "textOverlay": "Why Less is More" },
    "captions": ["Stop decluttering.", "Minimalism is a mindset.", "Link in bio."],
    "script": [
      { "timestamp": "0:00", "speaker": "Host", "action": "Opens camera, slight laugh", "dialogue": "Okay, quick confession..." },
      { "timestamp": "0:05", "speaker": "Host", "action": "Shows product", "dialogue": "I kept buying organizers, but honestly? It added more clutter." },
      { "timestamp": "0:12", "speaker": "Host", "action": "Shrugs", "dialogue": "Then I tried this. And yeah... it actually changed how I work." },
      { "timestamp": "0:20", "speaker": "Host", "action": "Close up", "dialogue": "It’s not about owning less. It’s about owning better." },
      { "timestamp": "0:30", "speaker": "Host", "action": "Camera address", "dialogue": "If your brain feels noisy, this might help." }
    ]
  }`
      }

[PLATFORM RULES]
${requirements[platform as keyof typeof requirements]}

Generate full content now.
`;

    let parsed: any = null;

    // 5. TRY GPT-5 PRIMARY
    try {
      const response = await openai.responses.create({
        model: 'gpt-5',
        tools: [{ type: 'web_search' }],
        input: [
          { role: 'system', content: 'You are an expert video strategist. Prioritize natural, human-like speech. Respond ONLY with valid JSON.' },
          { role: 'user', content: systemPrompt }
        ]
      });

      const rawText = response.output_text || '{}';
      // Robust JSON extraction
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const cleanText = jsonMatch ? jsonMatch[0] : rawText;
      parsed = JSON.parse(cleanText);
    } catch (gptError: any) {
      console.error('GPT-5 Primary Failed, Falling back to Groq:', gptError);

      // 6. FALLBACK TO GROQ
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: systemPrompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        temperature: 0.9,
        max_tokens: 6000
      });
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    }

    // --- SCHEMA PROTECTION ---
    if (parsed.campaign && !parsed.script) parsed = parsed.campaign;
    if (parsed.data && !parsed.script) parsed = parsed.data;
    if (!parsed.script) parsed.script = [];
    if (!parsed.captions) parsed.captions = [];

    // 7. PERSIST
    await supabase.from('campaign_history').insert({
      brand_id: mode === 'improvement' ? null : brandId,
      trend_id: mode === 'improvement' ? null : (trendId || null),
      goal,
      script_data: parsed,
      platform,
      metadata: { mode }
    });

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Orchestrator Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

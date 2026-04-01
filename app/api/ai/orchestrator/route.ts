import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { getAuthenticatedUser } from '../../auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { goal, brandId, trendId, platform, scriptType = 'Content', mode = 'orchestration' } = await req.json();
    
    // Auth Check
    const authUserId = await getAuthenticatedUser(req);
    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Initialize AI clients
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // 1. FETCH BRAND DNA
    let brandVault = null;
    if (brandId) {
      const { data } = await supabase.from('briefs').select('*').eq('id', brandId).single();
      brandVault = data;
    }

    if (!brandVault) return NextResponse.json({ error: "Missing Brand DNA" }, { status: 400 });

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
Brand Identity:
- Name/Handle: ${brandVault.company_name}
- Type: ${brandVault.entity_type}
- Tone: ${brandVault.tone_voice}
- Visual Aesthetic: ${brandVault.visual_aesthetic}
- Audience: ${brandVault.target_audience} (${brandVault.target_age_groups?.join(', ')})
- Mission/Bio: ${brandVault.mission_brief}
- Product Visual DNA: ${JSON.stringify(brandVault.product_analysis || [])}

${brandVault.entity_type === 'creator' ? `
[CREATOR SCRIPTING PROTOCOL]
- Creator Stage: ${brandVault.creator_stage}
- Primary Goals: ${JSON.stringify(brandVault.goals || [])}
- Content Pillars: ${JSON.stringify(brandVault.content_pillars || [])}
- Offers/IP: ${JSON.stringify(brandVault.offers || [])}
- Humor style: ${brandVault.humor_style}
- Catchphrases: ${JSON.stringify(brandVault.catchphrases || [])}
- Personal Boundaries (MUST AVOID): ${JSON.stringify(brandVault.personal_boundaries || [])}
- On-Screen Presence: ${brandVault.on_screen_presence}

*INSTRUCTION: Use the Humor Style and On-Screen Presence to calibrate the script's energy. Ensure Content Pillars and Goals drive the narrative arc.*
` : `
[CORPORATE SCRIPTING PROTOCOL]
- Competitors: ${brandVault.competitors?.join(', ')}
- Core Archetype: ${brandVault.archetype}
- Vision: ${brandVault.vision}
- Values: ${brandVault.values?.join(', ')}
`}
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
`
    };

    const selectedStrategy = strategyPrompts[scriptType] || strategyPrompts.Content;

    const sanitizedGoal = goal.replace(/[`"\\]/g, ' ').slice(0, 4000);
    const writerSystemPrompt = `
You are the Content Producer AI.

${brandBlock}

Goal: ${sanitizedGoal}
Current focus: ${isHeroMode ? 'ALL (HERO MODE)' : platform.toUpperCase()}
Category Context: ${scriptType}

[HOOK VALIDATOR (INTERNAL)]
Before writing the script, privately evaluate 3 alternative hooks for this goal. Rate them on curiosity gap, emotional trigger, and pattern interrupt. Use ONLY the absolute highest-scoring one as the first dialogue beat in the script. Do NOT include the evaluation array in your final output.

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
Return a ${isHeroMode ? 'multi-platform Hero JSON object' : `single JSON object for ${platform}`}.

Example JSON (DO NOT DEVIATE):
{
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
}

[PLATFORM RULES]
${isHeroMode
        ? Object.entries(requirements).map(([p, r]) => `[${p.toUpperCase()}]: ${r}`).join('\n')
        : requirements[platform as keyof typeof requirements] || ''}

Generate full content now.
`;

    // ============================================
    // STEP 1: STRATEGIST PASS (Fast Model)
    // ============================================
    console.log("Running Strategist Pass...");
    const strategySystemPrompt = `You are a Lead Video Strategist.
Goal: ${goal}
Platform: ${platform}
Category: ${scriptType}

${brandBlock}

[TREND USAGE]
${trendSignal ? trendSignal.topic : 'Evergreen'}
${trendSignal?.raw_data?.ugc_strategy?.format_explanation || 'Value-driven'}

TASK: Output ONLY the high-level strategy (no script). Provide the hook angle, narrative arc, and emotional journey in 5 bullet points.
Respond ONLY with a JSON object.
{
  "hook_angle": "How we will grab attention in the first 2 seconds",
  "narrative_arc": "The 5 bullet points of the story shape",
  "emotional_journey": "How the viewer's feelings should shift"
}`;

    let strategistOutput: any = { hook_angle: "N/A", narrative_arc: "N/A", emotional_journey: "N/A" };
    try {
      const stratResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: strategySystemPrompt }],
        response_format: { type: "json_object" }
      });
      strategistOutput = JSON.parse(stratResponse.choices[0]?.message?.content || '{}');
    } catch (e) {
      console.error("Strategist pass failed", e);
      strategistOutput = { fallback: "Proceed with implicit strategy" };
    }

    // ============================================
    // STEP 2: WRITER PASS (Full Model)
    // ============================================
    let parsed: any = null;

    // Inject Script Examples (#3)
    const examples = {
      UGC: `EXAMPLE UGC:
Action: Holding phone walking
Dialogue: "Everyone tells you to wake up at 5AM. They're lying to you."
Action: Stops walking, sighs
Dialogue: "I tried it for a month. I was miserable."`,
      Advertisement: `EXAMPLE AD:
Action: Fast, dynamic zoom on product
Dialogue: "If your back hurts right now, stop scrolling."
Action: Text overlay "The 3-second fix"
Dialogue: "This tiny thing fixed 3 years of bad posture."`,
      Content: `EXAMPLE CONTENT:
Action: Sitting down at desk, looking annoyed
Dialogue: "You don't lack motivation. You lack clarity."
Action: Pulls out a simple notepad
Dialogue: "Write down three things. Just three. Watch what happens."`
    };

    const writerPrompt = `
You are the Content Producer AI.
Brand/Mission: ${goal}
Platform: ${platform}
Category: ${scriptType}

[APPROVED STRATEGY FROM LEAD STRATEGIST]
Hook Angle: ${strategistOutput.hook_angle || 'N/A'}
Narrative: ${strategistOutput.narrative_arc || 'N/A'}
Emotion: ${strategistOutput.emotional_journey || 'N/A'}

[CONCRETE VIRAL EXAMPLES FOR TONE]
${examples[scriptType as keyof typeof examples] || examples.Content}

${writerSystemPrompt}
`;

    try {
      console.log("Running Writer Pass...");
      const response = await openai.chat.completions.create({
        model: 'gpt-5.4',
        messages: [
          { role: 'system', content: 'You are an expert video script writer. Prioritize natural, human-like speech. Respond ONLY with valid JSON.' },
          { role: 'user', content: writerPrompt }
        ],
        response_format: { type: "json_object" }
      });

      const rawText = response.choices[0]?.message?.content || '{}';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const cleanText = jsonMatch ? jsonMatch[0] : rawText;
      parsed = JSON.parse(cleanText);

    } catch (gptError: any) {
      console.error('Writer Primary Failed, Falling back to Groq:', gptError);
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: writerPrompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' }
      });
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    }

    if (parsed.campaign && !parsed.script) parsed = parsed.campaign;
    if (parsed.data && !parsed.script) parsed = parsed.data;
    if (!parsed.script) parsed.script = [];
    if (!parsed.captions) parsed.captions = [];

    // ============================================
    // STEP 3: CRITIC/DIRECTOR & ENFORCEMENT PASS
    // ============================================
    // Includes Banned Words check (#5) and separate Camera direction/Critique scoring (#1, #4)
    console.log("Running Critic & Patch Pass...");

    let stringifiedScript = JSON.stringify(parsed);
    const criticPrompt = `You are a ruthless Viral Script Critic and Director.
Your job is to read this generated video script JSON and patch it.

TASK 0: WORD BAN ENFORCEMENT
Before anything else, scan every "dialogue" field and remove any of these words: ["game-changer", "next-level", "revolutionary", "delve", "harness", "elevate", "unlock your potential", "synergy", "landscape"]. Replace them cleanly inline.

TASK 1: CRITIQUE & PATCH DIALOGUE
Score the overall script (0-10) on: hook strength, pacing, authenticity, CTA clarity, platform fit.
If a dialogue beat scores below 7/10 for sounding too "corporate", rewrite it to be punchy, human, and conversational. No exceptions. 

TASK 2: UPGRADE CAMERA/ACTION DIRECTIONS (Separate the voice from action)
Review the "action" field for every beat. Rewrite the "action" field to be specific, cinematically evocative camera/action directions that maximize retention by visually breaking the pattern. Make it read like a real director's shot list.

OUTPUT: Return the FULL JSON script structure identically, but with the upgraded 'dialogue' and 'action' fields, and include a "critic_scores" object summarizing your 0-10 scores for the 5 categories.

Original JSON:
${stringifiedScript}`;

    try {
      const criticResponse = await openai.chat.completions.create({
        model: "gpt-5.4", // Strong model for director pass
        messages: [{ role: "user", content: criticPrompt }],
        response_format: { type: "json_object" }
      });
      parsed = JSON.parse(criticResponse.choices[0]?.message?.content || stringifiedScript);
    } catch (e) {
      console.warn("Critic pass failed", e);
    }

    // 7. PERSIST
    await supabase.from('campaign_history').insert({
      brand_id: brandId,
      trend_id: trendId || null,
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

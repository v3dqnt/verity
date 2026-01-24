import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai";
import { NextResponse } from 'next/server';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

// Supabase Init
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(fn: () => Promise<any>, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.message?.includes("429") || error.message?.includes("Too Many Requests"))) {
      console.warn(`Rate limited. Retrying in ${backoff}ms... (${retries} retries left)`);
      await sleep(backoff);
      return fetchWithRetry(fn, retries - 1, backoff * 2);
    }
    throw error;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabaseAdmin
      .from('audit_history')
      .select('id, created_at, content, score, result')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ history: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { content, userId } = await req.json();

    if (!content) return NextResponse.json({ error: "No content provided" }, { status: 400 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. CHECKSUM / CACHE CHECK
    // We check if this exact content has been audited for this user before.
    // "Maintain the score if the same script is being audited twice"
    if (userId) {
      const { data: existing } = await supabaseAdmin
        .from('audit_history')
        .select('result')
        .eq('user_id', userId)
        .eq('content', content) // minor tweaks = diff content = new audit
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ ...existing.result, _cached: true });
      }
    }

    const prompt = `Analyze this short-form script or content: "${content}".

YOU ARE A CREATOR-CRITICAL VIRAL CONTENT STRATEGIST.
You are a ruthless auditor. You assume viewers are impatient and the algorithm is unforgiving. Your goal is to separate "Corporate/Lecture" fluff from "Platform Weapons."

EVALUATION FRAMEWORK: THE MERGED MRI MECHANISM

1. NUANCE SENSITIVITY (Surgical Scoring)
- Changing ONE word is the difference between a "Lecture" and a "Secret."
- Reward active commands ("Steal this") over passive verbs ("I think").
- Ruin the score for formal connectives ("Consequently," "Moreover") that trigger the 'Lecture Tax'.

2. THE "HEARSAY & INTRO" REJECTION (Hook Strength)
- SEVERE PENALTY for "They say that..." (ऐसे कहते हैं कि...), "A lot of people think...", or general observations. These are Secondary Hooks.
- DEDUCT Points for "Hi I'm..." or "Wait for the end."
- REWARD Active Authority: Defiant opinions, "Underrated" claims, or direct "Truths" that break logic.

3. THE LECTURE TRAP AUDIT (Friction vs. Flow)
- Look for academic fillers or news-report storytelling. (PENALIZE).
- Content must feel like "sharing a secret," not "teaching a lesson." "Teaching" feels like a chore; "Secrets" feel like status advancement.

4. TOPIC SATURATION & THE "FLIP" (Clarity/Incongruency)
- Common Knowledge Penalty: Don't tell us AI is dangerous or money is good.
- Reward the "Flip": A counter-intuitive insight that subverts the obvious.

5. SOCIAL CURRENCY THEORY (Shareability)
- Does sharing this make the viewer look smart/insider/funny? 
- If it's just "warm" or "nice," it has ZERO share impulse. 

6. CRITERIA BREAKDOWN:
- Hook Strength: Pattern interrupts and tension in the first 3s.
- Clarity: Premise delivered within 8s.
- Incongruency: Strategic mismatch or twist.
- Simplicity: Frictionless and cognitively light language.
- Emotional Trigger: High-intensity triggers (Awe, Anger, Humor) over mild vibes.
- Personal Touch: Niche-coded language and identity resonance.
- Retention Potential: Narrative turns and micro-hooks.
- Shareability: Identity weaponization and status reward.
- Takeaway & CTA: Punchy, non-vague closing.

MULTILINGUAL RULES:
- Detect the language (e.g., Hinglish, Slang). Use local cultural nuance to judge the "vibe," but provide analysis in English.

SCORING RULES:
- Be deterministic and pessimistic. Scores above 85 are rare.
- WEIGHTED FORMULA:
  Hook ×2.0, Clarity ×2.0, Incongruency ×1.5, Simplicity ×1.5, Emotional Trigger ×1.5, Retention ×1.5, Shareability ×1.5, Personal Touch ×1.0, Takeaway ×0.5.

Return a valid JSON object ONLY:
{
  "thinking": "1-2 sentence ruthless strategic audit logic.",
  "viralityScore": 0-100,
  "breakdown": { "hook_strength": 0-100, "clarity": 0-100, "incongruency": 0-100, "simplicity": 0-100, "emotional_trigger": 0-100, "retention": 0-100, "shareability": 0-100, "personal_touch": 0-100, "takeaway_cta": 0-100 },
  "feedback": "2 sentences summarizing viral potential.",
  "redFlags": ["3 weaknesses sorted by severity"],
  "strengths": ["3 strategic positives sorted by impact"],
  "language": "Language name"
}
`;

    let aiResult;

    // 1. PRIMARY: OpenAI (GPT-4o)
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await fetchWithRetry(() => openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: prompt.replace(`Analyze this short-form script or content: "${content}".`, "").trim() },
            { role: "user", content: `Analyze this short-form script or content: "${content}".` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.9
        }));

        const text = completion.choices[0].message.content || "{}";
        aiResult = JSON.parse(text);

      } catch (openaiError) {
        console.warn("OpenAI Primary Failed, switching to fallback:", openaiError);
      }
    }

    // 2. SECONDARY: OpenRouter Fallback
    if (!aiResult) {
      console.log("Using OpenRouter Fallback...");
      const aiContent = await fetchWithRetry(async () => {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "model": "openai/gpt-4o",
            "messages": [
              { "role": "system", "content": prompt.replace(`Analyze this short-form script/transcript: "${content}".`, "").trim() },
              { "role": "user", "content": `Analyze this short-form script/transcript: "${content}".` }
            ],
            "temperature": 0.7,
            "response_format": { "type": "json_object" }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429) throw new Error("429 Too Many Requests");
          throw new Error(`OpenRouter Failed: ${errText}`);
        }

        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
      });
      aiResult = aiContent;
    }

    // 3. SAVE TO HISTORY
    if (userId && aiResult) {
      const { error: saveError } = await supabaseAdmin.from('audit_history').insert({
        user_id: userId,
        content: content,
        score: aiResult.viralityScore,
        result: aiResult
      });
      if (saveError) console.error("Failed to save audit history:", saveError);
    }

    return NextResponse.json(aiResult);

  } catch (error: any) {
    console.error("Critical Failure (All Providers):", error);
    return NextResponse.json({
      viralityScore: 0,
      thinking: "Error occurred",
      breakdown: {
        hook_strength: 0,
        clarity: 0,
        incongruency: 0,
        simplicity: 0,
        emotional_trigger: 0,
        retention: 0,
        shareability: 0,
        personal_touch: 0,
        takeaway_cta: 0
      },
      feedback: "System Offline. Unable to audit content at this time.",
      redFlags: ["AI Service Unavailable", "Network Error"],
      language: "Unknown"
    }, { status: 500 });
  }
}
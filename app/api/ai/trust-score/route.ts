import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

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

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    const prompt = `Analyze this short-form script/transcript: "${content}".

You are a Viral Mechanics Auditor. Your job is to distinguish between "Explainer/Lecture" content (High quality but Low views) and "Platform Weapons" (Viral events).

EVALUATION FRAMEWORK: "The MRI Mechanism"

1. THE HOOK ARCHETYPE (3-Second Window)
- The Passive/Hearsay Tax: Does it start with "They say that..." (ऐसे कहते हैं कि...), "A lot of people think...", or general observations? (SEVERE PENALTY). These are "Secondary Hooks"—they lack immediate personal stakes and authority.
- The Intro Tax: "Hi I'm..." or "Growing up..." (DEDUCT Points).
- The Active Authority Hook: Does it start with a defiant opinion, a specific "Underrated" claim, or a direct "Truth" that breaks common logic? (REWARD Points).

2. THE "LECTURE TRAP" AUDIT (Friction vs. Flow)
- Attention Killers: Look for formal connectives or academic fillers (e.g., "collectively," "consequently," "additional complications," "whether it is X or Y"). These make content feel like a news report or a classroom. (PENALIZE).
- The Information Flow: Is the script "teaching" or "sharing a secret"? "Teaching" feels like a chore for the viewer. "Sharing a secret" feels like status-advancement.

3. TOPIC SATURATION (Freshness Check)
- Common Knowledge Penalty: Is the script talking about something everyone already knows? (e.g., "AI is dangerous," "Cybersecurity is important"). Unless there is a "Flip" or a completely new angle, saturated topics get a "Dullness Penalty."
- The "Profound" vs "Obvious" Lens: Is the conclusion just a standard prediction (e.g., "Security will grow in 5 years") or a punchy, counter-intuitive insight?

4. SOCIAL CURRENCY THEORY (Sharability)
- Identity Weaponization: Does sharing this help a specific tribe (Gen Z, creators, rebels) say something about themselves?
- Status Reward: Does the sharer look "smart" or just "informed"? Being "informed" is for news apps; being "smart/insider" is for Reels/TikTok.

VIRALITY MRI SCORING BENCHMARKS:
- 0–45: "The Lecture Trap/News Report" — Obvious topics, formal language, passive hooks. (Views: <10k).
- 46–70: "The Competent Creator" — Quality information but lacks the "Flip." (Views: 10k–50k).
- 71–85: "Algorithm-Eligible" — Active authority, good pacing, niche relatability. (Views: 50k–500k).
- 86–100: "Platform Weapon" — Surgical logic subversion, high status reward, zero academic friction. (Views: 500k+).

WEIGHTED MRI FORMULA:
- Hook (Active Authority vs. Hearsay) x 2.0
- Strategic Polarity (The Flip vs. The Obvious) x 2.0
- Friction Audit (Lecture Tax) x 1.5
- Social Currency (Share Status) x 1.5
- Resonance & Nuance (Slang/Belonging) x 1.0
- Insight Impact x 1.0

Return a valid JSON object ONLY. The object MUST contain:
- viralityScore (number 0–100, rounded to nearest integer)
- breakdown (object with keys: hook_strength, clarity, incongruency, simplicity, emotional_trigger, retention, shareability, personal_touch, takeaway_cta — each 0–100)
- feedback (string, exactly 2 sentences summarizing viral potential)
- redFlags (array of strings, exactly 3 critical weaknesses)
- strengths (array of strings, exactly 3 genuine strategic positives)
- language (string, detected language name)`;

    // 1. PRIMARY: Try Google Gemini (Official SDK)
    const geminiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (geminiKey) {
      try {
        const text = await fetchWithRetry(async () => {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { temperature: 0 }
          });
          const result = await model.generateContent(prompt);
          return result.response.text();
        });

        // Clean up markdown blocks if present
        const jsonText = text.replace(/```json\n?|\n?```/g, "").trim();
        return Response.json(JSON.parse(jsonText));

      } catch (geminiError) {
        console.warn("Gemini Primary Failed, switching to fallback:", geminiError);
        // Continue to fallback
      }
    }

    // 2. SECONDARY: OpenRouter Fallback
    console.log("Using OpenRouter Fallback...");
    const aiContent = await fetchWithRetry(async () => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "google/gemini-2.0-flash-001",
          "messages": [{ "role": "user", "content": prompt }],
          "temperature": 0,
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

    return Response.json(aiContent);

  } catch (error: any) {
    console.error("Critical Failure (All Providers):", error);
    return Response.json({
      viralityScore: 0,
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
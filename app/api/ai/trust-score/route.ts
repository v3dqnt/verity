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

You are a Viral Mechanics Auditor. You do not judge content by "quality" or "artistry," but by "Share Impulse" and "Algorithm Retention Logic."

EVALUATION FRAMEWORK: "The MRI Mechanism"

1. THE HOOK MECHANICS (3-Second Window)
- The Intro Tax: Does it start with "Hi I'm..." or "Growing up..."? (DEDUCT Points). These are linear/anecdotal and have a 90% bounce rate for new viewers.
- The Information Gap: Does it start with a claim of "Underrated," "The Truth," or a direct attack on status quo? (REWARD Points). 
- Identity-Authority: Is the speaker's identity (e.g., "I'm 19") used as a weapon against a system (e.g., "Big Creators")?

2. BODY DYNAMICS (The "Logic Turn")
- Anecdotal (Weak): "I liked this, then I didn't, now I do." (Linear storytelling for existing fans only).
- Systemic/Conflict-Driven (Strong): "Everyone says X, but X is actually a trap because of Y." 
- Strategic Incongruency: Is there a "Flip" where common logic is subverted? (e.g., Lifestyle content vs. Getting paid).

3. SOCIAL CURRENCY THEORY (Why people share)
- "Nice Story" (Low Shareability): Viewer thinks "That's sweet" and swipes.
- "Identity Weapon" (High Shareability): Viewer shares to look:
    - Smart (The "Secret" factor)
    - Rebellious (The "Truth-teller" factor)
    - Validated (The "This is so us" factor)
- Does the script make the SHARER look better for posting it?

4. THE RETENTION LOOP (Curiosity Pacing)
- Open Loops: Mentioning a "Big Secret" or "Underrated advice" early but not resolving it until the end.
- Micro-Shifts: Changing the angle or tone (e.g., "Bhai, but wait...") to reset the viewer's attention span.

VIRALITY MRI SCORING CRITERIA:

1. Hook Strength: (Value-first vs. Story-first). High score for immediate status-quo disruption.
2. Strategic Polarity: (The "Us vs. Them" lens). Does it pick a side?
3. Social Currency: Does this weaponize the viewer's identity?
4. Cultural Nuance: Natural use of slang/Hinglish (e.g., "Bhai," "Dal Chawal") as a "we belong" signal.
5. Retention Factor: Pacing, open loops, and narrative speed.

SCORING BENCHMARKS:
- 0–45: "The Vlog Trap" — Quality story, but 10k view limit. Linear, anecdotal, polite.
- 46–70: "The Competent Creator" — Solid relatability, decent pacing. 50k–100k views.
- 71–85: "Algorithm-Eligible" — Strong polarity, identity-authority, good share currency. 100k–500k views.
- 86–100: "Platform Weapon" — Surgical logic subversion, high status reward for sharers. Viral event potential.

WEIGHTED MRI FORMULA:
- Hook (Value/Identity Gap) x 2.0
- Strategic Polarity (The Flip) x 2.0
- Social Currency (Share Status) x 1.5
- Cultural Nuance (Resonance) x 1.5
- Pacing & Loops (Retention) x 1.0
- CTA & Impact x 1.0

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
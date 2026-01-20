import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { goal, brandId, trendId, platform } = await req.json();
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // Initialize both AI clients
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        // 1. FETCH BRAND DNA
        const { data: brandVault } = await supabase.from('briefs').select('*').eq('id', brandId).single();
        if (!brandVault) return NextResponse.json({ error: "Missing Brand DNA" }, { status: 400 });

        // 2. FETCH TREND SIGNAL
        let trendSignal = null;
        if (trendId) {
            const { data } = await supabase.from('signal_vault').select('*').eq('id', trendId).single();
            trendSignal = data;
        }

        const isHeroMode = platform.toLowerCase() === 'all';

        // 3. DEFINE PLATFORM REQUIREMENTS
        const requirements = {
            youtube: "Long-form narrative (12-15 beats). Tone: Educational/Storyteller. Start with a curiosity gap hook. Include specific b-roll descriptions in 'action' fields. Captions: Professional, SEO-rich, with 3-5 relevant hashtags.",
            tiktok: "Short-form high energy (6-8 beats). Tone: Fast-paced, punchy, trend-hacking. Start with a visual/audio 'pattern interrupt'. Use current slang naturally. Captions: Short, punchy, emoji-heavy, with 2 viral hashtags.",
            instagram: "Visual-first (6-8 beats). Tone: Polished, cinematic, aspirational. Focus on visual transitions in 'action' fields. Captions: Aesthetic, storytelling focused, with 5 niche hashtags and a clear CTA."
        };

        // 4. CONSTRUCT SYSTEM PROMPT (Updated for Natural Integration & Easter Eggs)
        const systemPrompt = `
      You are the Omni Orchestrator AI. 
      You are the Omni Orchestrator AI.
      Brand: ${brandVault.company_name} | Tone: ${brandVault.tone_voice}
      Goal: ${goal}
      Trend context: ${trendSignal ? `${trendSignal.topic} - ${trendSignal.raw_data?.desc || ''}` : 'Evergreen psychological hooks'}

      Current focus: ${platform.toUpperCase()}

      [MISSION]
      Generate a high-quality video strategy for the brand.
      Tone: "Authentic, Grounded, Professional".
      Constraint: No "cringe" slang (e.g. no "no cap", "bussin"). Speak naturally.

      [OUTPUT REQUIREMENTS]
      1. SCRIPT: Must have 6-8 distinct beats.
      2. CAPTIONS: Must provide 3 distinct options.
      3. AUTHENTICITY: Score from 0-100.

      [OUTPUT SCHEMA]
      ${isHeroMode
                ? `HERO MODE: You MUST return a JSON object with a "campaigns" array containing exactly 3 objects (youtube, tiktok, instagram).`
                : `SINGLE MODE: Return a single JSON object for ${platform}.`
            }

      Example of expected JSON structure (DO NOT DEVIATE):
      ${isHeroMode ?
                `{
          "campaigns": [
            {
              "platform": "youtube",
              "authenticityScore": 95,
              "title": "The Hidden Truth About Minimalist Design",
              "postingTime": "10:00 AM",
              "thumbnail": { "concept": "Clean workspace", "visualPrompt": "A pristine white desk with one coffee cup", "textOverlay": "Why Less is More" },
              "captions": ["Stop decluttering and start designing.", "Minimalism isn't just a look, it's a mindset.", "Link in bio for the full guide."],
              "script": [
                { "timestamp": "0:00", "speaker": "Host", "action": "Opens camera with a sigh of relief", "dialogue": "I finally found the secret to a perfect workspace." },
                { "timestamp": "0:05", "speaker": "Host", "action": "Shows the product on the desk", "dialogue": "It's not about buying more, it's about removing the noise." },
                { "timestamp": "0:10", "speaker": "Host", "action": "Close up on texture", "dialogue": "Just look at this detail." },
                { "timestamp": "0:15", "speaker": "Host", "action": "Fast forward montage of usage", "dialogue": "I've been using this for a week and my focus has doubled." },
                { "timestamp": "0:25", "speaker": "Host", "action": "Direct address to camera", "dialogue": "If you're tired of clutter, you need to see this." },
                { "timestamp": "0:30", "speaker": "Host", "action": "Fade to logo", "dialogue": "Check the link in my bio." }
              ]
            },
            { 
              "platform": "tiktok", 
              "authenticityScore": 98,
              "title": "My New Obsession", "postingTime": "4PM", "thumbnail": { "concept": "Reaction face", "visualPrompt": "Shocked expression holding product", "textOverlay": "OMG" }, 
              "captions": ["I can't believe I lived without this.", "Game changer.", "#minimalism"], 
              "script": [ 
                { "timestamp": "0:00", "speaker": "Creator", "action": "Jump cut intro", "dialogue": "Stop scrolling! You have to see this." },
                { "timestamp": "0:03", "speaker": "Creator", "action": "Rapid product demo", "dialogue": "This thing literally saved my morning routine." },
                { "timestamp": "0:08", "speaker": "Creator", "action": "Before and after split screen", "dialogue": "Look at the difference! It's insane." },
                { "timestamp": "0:12", "speaker": "Creator", "action": "Pointing at link", "dialogue": "Grab yours before it sells out!" }
               ] 
            },
            { 
              "platform": "instagram", 
              "authenticityScore": 96,
              "title": "Aesthetic Goals", "postingTime": "12PM", "thumbnail": { "concept": "Flat lay", "visualPrompt": "Product arranged perfectly", "textOverlay": "Essentails" }, 
              "captions": ["Sunday vibes.", "Elevate your space.", "Link in bio."], 
              "script": [ 
                { "timestamp": "0:00", "speaker": "Voiceover", "action": "Slow cinematic pan of the room", "dialogue": "Create a space that inspires you." },
                { "timestamp": "0:05", "speaker": "Voiceover", "action": "Hand interacting with product", "dialogue": "Every detail matters when you're building a home." },
                { "timestamp": "0:10", "speaker": "Voiceover", "action": "Sunlight hitting the surface", "dialogue": "The way the light catches this texture is everything." },
                { "timestamp": "0:15", "speaker": "Voiceover", "action": "Final beauty shot", "dialogue": "Make your environment work for you." }
               ] 
            }
          ]
        }` :
                `{
          "platform": "${platform}",
          "authenticityScore": 95,
          "title": "The Hidden Truth",
          "postingTime": "10:00 AM",
          "thumbnail": { "concept": "Clean workspace", "visualPrompt": "A pristine white desk", "textOverlay": "Why Less is More" },
          "captions": ["Stop decluttering.", "Minimalism is a mindset.", "Link in bio."],
          "script": [
            { "timestamp": "0:00", "speaker": "Host", "action": "Opens camera", "dialogue": "I finally found the secret to a perfect workspace." },
            { "timestamp": "0:05", "speaker": "Host", "action": "Shows product", "dialogue": "It's not about buying more, it's about removing the noise." },
            { "timestamp": "0:10", "speaker": "Host", "action": "Close up", "dialogue": "Just look at this detail." },
            { "timestamp": "0:15", "speaker": "Host", "action": "Montage", "dialogue": "My focus has doubled." },
            { "timestamp": "0:25", "speaker": "Host", "action": "Camera address", "dialogue": "You need to see this." },
            { "timestamp": "0:30", "speaker": "Host", "action": "Fade to logo", "dialogue": "Check the link." }
          ]
        }`
            }

      [PLATFORM RULES]
      ${isHeroMode ? Object.entries(requirements).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n') : requirements[platform as keyof typeof requirements]}

      Generate full content now.
    `;

        let parsed = null;

        // 5. TRY GEMINI PRIMARY
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192,
                    temperature: 0.7
                }
            });

            const result = await model.generateContent(systemPrompt);
            const text = result.response.text();
            parsed = JSON.parse(text);
        } catch (geminiError) {
            console.warn("Gemini Primary Failed, Falling back to Groq:", geminiError);

            // 6. FALLBACK TO GROQ
            const completion = await groq.chat.completions.create({
                messages: [{ role: "system", content: systemPrompt }],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 6000
            });
            parsed = JSON.parse(completion.choices[0].message.content || "{}");
        }

        // --- SCHEMA PROTECTION ---
        // Ensure we always have a script array, even if AI mis-nests it
        if (!isHeroMode) {
            if (parsed.campaign && !parsed.script) parsed = parsed.campaign;
            if (parsed.data && !parsed.script) parsed = parsed.data;
            if (!parsed.script) parsed.script = [];
            if (!parsed.captions) parsed.captions = [];
        } else if (parsed.campaigns) {
            parsed.campaigns = parsed.campaigns.map((c: any) => {
                if (c.campaign && !c.script) c = c.campaign;
                if (!c.script) c.script = [];
                if (!c.captions) c.captions = [];
                return c;
            });
        }

        // 7. PERSIST
        await supabase.from('campaign_history').insert({
            brand_id: brandId,
            trend_id: trendId || null,
            goal,
            script_data: parsed,
            platform
        });

        return NextResponse.json(parsed);

    } catch (error: any) {
        console.error("Orchestrator Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


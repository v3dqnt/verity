import { NextResponse } from 'next/server';
import OpenAI from "openai";

const openaiKey = process.env.OPENAI_API_KEY || '';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });
        if (!openaiKey) return NextResponse.json({ error: "OpenAI API Key missing" }, { status: 500 });

        const openai = new OpenAI({ apiKey: openaiKey });

        const instructions = `
      Analyze the brand or creator at this URL: ${url}
      
      Task: Extract a comprehensive Brand DNA profile.
      
      Required Fields:
      1. company_name: Official name.
      2. industry: Specific niche.
      3. target_audience: Granular Gen Z demographic (e.g., "Streetwear enthusiasts in London, 18-24").
      4. tone_voice: Archetype (e.g., "Chaotic & Self-Aware", "Minimalist & High-Status").
      5. mission_brief: A deep dive into their vibe, what they stand for, and their internet personality.
      6. visual_aesthetic: Describe colors, fonts, and "core" (e.g., "Y2K Cyberpunk", "Clean Girl").
      7. hooks_sample: 3 viral-style hooks they have used or would use.
      8. competitors: Identify 3-5 key competitors in their space.

      Return ONLY a JSON object:
      {
        "company_name": "string",
        "industry": "string",
        "target_audience": "string",
        "tone_voice": "string",
        "mission_brief": "string",
        "visual_aesthetic": "string",
        "hooks_sample": ["string", "string", "string"],
        "competitors": ["string", "string", "string"]
      }
    `;

        console.log(`Analyzing brand via GPT-5 Research: ${url}...`);

        const researchResponse = await (openai as any).responses.create({
            model: "gpt-5",
            tools: [{ type: "web_search" }],
            input: [
                {
                    role: "system",
                    content: "Use web_search to ground your brand analysis in current internet presence and cultural data."
                },
                {
                    role: "user",
                    content: instructions
                }
            ]
        });

        const rawText = researchResponse.output_text || "{}";
        const cleanText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");

        return NextResponse.json(JSON.parse(jsonMatch[0]));

    } catch (error: any) {
        console.error("BRAND_ANALYZE_ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

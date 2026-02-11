import { NextResponse } from 'next/server';
import OpenAI from "openai";

const openaiKey = process.env.OPENAI_API_KEY || '';

export async function POST(req: Request) {
    try {
        const { url, social_links, entity_type } = await req.json();

        if (!url && (!social_links?.instagram && !social_links?.tiktok && !social_links?.twitter)) {
            return NextResponse.json({ error: "At least one digital link is required" }, { status: 400 });
        }
        if (!openaiKey) return NextResponse.json({ error: "OpenAI API Key missing" }, { status: 500 });

        const openai = new OpenAI({ apiKey: openaiKey });

        const formatHandle = (value?: string) => {
            if (!value) return 'Not provided';
            return value.startsWith('@') ? value : `@${value}`;
        };

        const presenceContext = `
            Target Context:
            - Entity Type: ${entity_type || 'brand'}
            - Primary Website: ${url || 'Not provided'}
            - Instagram: ${formatHandle(social_links?.instagram)}
            - TikTok: ${formatHandle(social_links?.tiktok)}
            - Twitter/X: ${formatHandle(social_links?.twitter)}
        `;

        const instructions = `
Research Task: Execute a multi-stage "Deep Discovery" protocol to extract precise ${entity_type === 'creator' ? 'Creator' : 'Brand'} DNA.

Discovery Sources:
${presenceContext}

STRICT DISCOVERY PROTOCOL:
1. STAGE 1 (${entity_type === 'creator' ? 'Personality Hub' : 'Primary Hub'}): Deep-crawl the website/link-in-bio. Look for 'About', 'Mission', or 'Portfolio'.
2. STAGE 2 (${entity_type === 'creator' ? 'Content Voice' : 'Social Persona'}): Visit social links. Analyze the last 5-10 posts. Identify recurring content pillars and voice patterns.
3. STAGE 3 (Market Footprint): Search for mentions, reviews, or interview transcripts. Identify public perception.
4. STAGE 4 (Synthesis): Create a unified profile. Eliminate citations [e.g., (1)].

Required Extraction Fields (Return ONLY JSON):
{
  "company_name": "Official name or handle",
  "tagline": "Punchy 1-sentence descriptor",
  "industry": "Specific niche (e.g., 'Travel AI Tools')",
  "mission_brief": "Short purpose statement",
  "visual_aesthetic": "Describe colors/vibe",
  "tone_voice": "Main vibe (e.g. 'Chaotic & Fast')",
  "personality": ["adj1", "adj2", "adj3"],
  ${entity_type === 'creator' ? `
  "creator_stage": "One of [Beginner, Growth, Established]",
  "goals": ["Goal 1", "Goal 2"],
  "humor_style": "Brief descriptor",
  "on_screen_presence": "Brief descriptor"
  ` : `
  "competitors": ["Comp 1", "Comp 2"]
  `}
}
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a Brand DNA Architect. You provide high-fidelity extraction in JSON format." },
                { role: "user", content: instructions }
            ],
            response_format: { type: "json_object" }
        });

        const dataContent = response.choices[0].message.content || "{}";
        const jsonMatch = dataContent.match(/\{[\s\S]*\}/);

        if (!jsonMatch && dataContent === "{}") {
            console.error("AI Response failed to provide JSON:", dataContent);
            throw new Error("Invalid AI Response format");
        }

        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(dataContent);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("AI Analysis Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

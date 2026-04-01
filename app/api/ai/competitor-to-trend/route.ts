import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const GeneratedTrendSchema = z.object({
  name: z.string().describe("A catchy, recognizable title for this specific video format (e.g. 'The Walk & Talk Rant', 'The 3-Second Pattern Interrupt')."),
  status: z.enum(["EXPLODING", "RISING"]).describe("Velocity indicating the opportunity size."),
  score: z.number().int().min(70).max(99).describe("A virality probability score."),
  desc: z.string().describe("A detailed description of the video's hook, visual setting, and core premise. Must clearly describe what happens on camera."),
  platform: z.enum(["TikTok", "Instagram Reels", "YouTube Shorts"]).describe("Best platform for this format."),
  ugc_strategy: z.object({
    format_explanation: z.string().describe("Step-by-step visual blueprint: How should the creator hold the camera? What is the background? What is the editing style?"),
    key_slang: z.array(z.string()).describe("Specific hook phrases, text-on-screen hooks, or pacing directions.")
  }),
  source_evidence: z.string().describe("Brief explanation linking this idea back to the analyzed competitor gaps."),
  example_urls: z.array(z.string()).describe("Return empty array"),
  source_links: z.array(z.string()).describe("Return empty array")
});

export async function POST(req: Request) {
  try {
    const { intel, brandData } = await req.json();

    if (!intel || !brandData) {
      return NextResponse.json({ error: "Missing required data." }, { status: 400 });
    }

    const systemPrompt = `You are an elite short-form video director (TikTok/Reels) and content strategist for the brand: ${brandData.name}.
    
We have gathered the following competitor intelligence:
${JSON.stringify(intel, null, 2)}

Your goal is to synthesize this intel and exploit their 'Content Gaps' by inventing a BRAND NEW, HIGHLY VIRAL SHORT-FORM VIDEO FORMAT.
Do not just suggest a generic "topic" to talk about. You must design a specific *Video Format* — a repeatable visual framework. 

Think about:
- The Hook: What is happening in the first 3 seconds visually and audibly?
- The Setting/Vibe: Is it chaotic? Aesthetically pleasing? A steady-cam walk?
- The Delivery: Fast-paced editing? ASMR style? Aggressive pointing?

Return ONLY structured JSON data conforming to the schema. Name the format something highly recognizable and catchy.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: systemPrompt }],
      response_format: zodResponseFormat(GeneratedTrendSchema, "trend"),
    });

    const parsedContent = JSON.parse(response.choices[0]?.message?.content || '{}');

    // Add unique ID so it integrates natively with the frontend
    const finalTrend = {
      ...parsedContent,
      id: `generated_intel_trend_${Date.now()}`,
      category: "Generated Intel"
    };

    return NextResponse.json({ trend: finalTrend });

  } catch (error: any) {
    console.error("Competitor To Trend Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

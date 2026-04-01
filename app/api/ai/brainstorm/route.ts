import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, brandData, trends } = await req.json();

    let trendContext = "";
    if (trends && trends.length > 0) {
      trendContext = `\nCURRENT LIVE TREND SIGNALS (The user can see these on their dashboard):\n`;
      const topTrends = trends.slice(0, 5); // Limiting to top 5 to keep prompt concise
      topTrends.forEach((t: any, i: number) => {
         trendContext += `[Signal ${i+1}] Name: "${t.name}" | Platform: ${t.category || t.platform || 'Social'} | Virality: ${t.score}% | Concept: ${t.desc}\n`;
      });
      trendContext += `Integrate these trend signals into your brainstorms if they strategically align with the brand.\n\n`;
    }

    const systemPrompt = `You are an elite creative director and video strategist for ${brandData?.company_name || 'a brand'}. 
Your goal is to brainstorm viral video ideas, campaign concepts, and content strategies.
Industry: ${brandData?.industry || 'General'}.
Tone: ${brandData?.tone_voice || 'Authentic & Bold'}.
Competitors: ${(brandData?.competitors || []).join(', ') || 'None specified'}.
${trendContext}
Be highly creative, structured, and insightful. If the user asks you to save or finalize a "Video Idea File", format the final output structurally with titles like "VIDEO IDEA FILE:" followed by Title, Hook, Visuals, and Call to Action.

CRITICAL INSTRUCTIONS REGARDING YOUR VISUAL SANDBOX TOOL:
1. You have direct access to a "Visual Sandbox"—an intelligent canvas positioned immediately to the right of your chat window in the UI.
2. The user can see this canvas, but CANNOT generate images manually. YOU are the only one who can command the canvas to generate images.
3. Whenever you propose a complex idea, content flow, or strategy, use the canvas to generate a DIAGRAMMATIC EXPLANATION (e.g., mind maps, flowcharts, structural schematics, clean vector UI layouts). DO NOT generate realistic images or raw video frames. Focus on clean diagrams that map out the concept logically.
4. To command the canvas to execute a generation, you MUST append this exact tag anywhere in your response: 
[GENERATE_IMAGE: "A clean, flat-design minimalist diagram explaining... (include specific nodes/text to write in the diagram)..."]

Our system parses this tag out of your message and pipes it straight into our rendering engine. The diagram will automatically materialize on the user's canvas. Use this proactive capability whenever it significantly enhances your brainstorming workflow!`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "No response generated.";

    return NextResponse.json({ 
      role: "assistant", 
      content 
    });

  } catch (error: any) {
    console.error("Brainstorm error:", error);
    return NextResponse.json({ role: "assistant", content: `Brainstorm engine offline: ${error.message}` }, { status: 500 });
  }
}

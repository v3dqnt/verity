import { NextResponse } from 'next/server';
import OpenAI from "openai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { content, criterion, score, totalScore } = await req.json();

        if (!content || !criterion) {
            return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const systemPrompt = `
      You are a specialized auditor explaining a specific score.
      
      CONTEXT:
      Content: "${content}"
      Overall Viral Score: ${totalScore}/100
      
      TARGET CRITERION: "${criterion}"
      SCORE GIVEN: ${score}/100
      
      TASK:
      Explain in 1-2 SHORT, ruthless sentences why this specific score was given for this criterion. 
      If the score is low, explain the flaw.
      If the score is high, explain the win.
      Be direct. No fluff. No "This score was given because...". Just the reason.
      
      Example Output:
      "The hook is weak because it uses a passive question. It should have started with a direct statement."
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Explain the score." }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        const reasoning = response.choices[0].message.content?.trim();

        return NextResponse.json({ reasoning });

    } catch (error: any) {
        console.error("Explain Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

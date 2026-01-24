import OpenAI from "openai";
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { content, criterion, score, totalScore } = await req.json();

        if (!content || !criterion) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `You are a Viral Content Auditor.
A user's script was just audited. 
Overall Virality Score: ${totalScore}/100.
Specific Criterion: "${criterion}"
Score for this Criterion: ${score}/100.

CONTENT TO ANALYZE:
"${content}"

TASK:
Provide a comprehensive explanation of why points were deducted from the "${criterion}" score.
You MUST quote specific phrases or sections from the script that caused the deduction. 
Explain exactly how those specific parts create friction, dilute authority, or bore the viewer.

FORMAT:
- Use 2-3 punchy sentences.
- Be extremely specific to the provided text.
- If the score is not 100, identify the specific "leaks".
- If the score is 100, explain why the execution is perfect for this criteria.

Example Quote usage: "The phrase '[Quote]' feels too formal, which triggers the 'Lecture Tax' and kills engagement immediately."`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Simpler/cheaper model
            messages: [
                { role: "system", content: "You are a concise viral mechanics expert." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
        });

        const reasoning = completion.choices[0].message.content;
        return NextResponse.json({ reasoning });

    } catch (error: any) {
        console.error("Explanation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

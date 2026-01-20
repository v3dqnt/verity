import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    const prompt = `Analyze this Gen Z marketing content: "${content}". 
    Return a valid JSON object ONLY, with no markdown formatting. The object must contain:
    - overallScore (number 0-100)
    - feedback (string, 1-2 sentences critique)
    - redFlags (array of strings, specific issues found)
    - improvedVersion (string, a rewritten version that is authentic and hits hard)
    `;

    // 1. PRIMARY: Try Google Gemini (Official SDK)
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

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
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-001",
        "messages": [{ "role": "user", "content": prompt }],
        "response_format": { "type": "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter Failed: ${await response.text()}`);
    }

    const data = await response.json();
    const aiContent = JSON.parse(data.choices[0].message.content);

    return Response.json(aiContent);

  } catch (error: any) {
    console.error("Critical Failure (All Providers):", error);
    return Response.json({
      overallScore: 0,
      feedback: "System Offline. Unable to audit content at this time.",
      redFlags: ["AI Service Unavailable", "Network Error"],
      improvedVersion: "Manual review required."
    }, { status: 500 });
  }
}
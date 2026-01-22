import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    const prompt = `Analyze this Gen Z marketing script or content: "${content}". 
    
    You are a Gen Z marketing specialist auditing content for "Trust" and "Resonance". 
    Evaluation Criteria (Weighted Equally - 20% each):
    1. Slang Authenticity: Is the vernacular current and natural? Avoid "corporate cringe".
    2. Readability & Simplicity: Is it punchy and easy to consume?
    3. UGC Usability: Is this "creatable" for a TikTok/Reel? Does it feel like a real person?
    4. Emotional Hook: Strength of the opening 2 seconds.
    5. Vibe & Irony: Self-awareness and humor resonance.

    MULTILINGUAL RULES:
    - Detect the language of the content.
    - If non-English, analyze based on local/regional Gen Z cultural nuances and slang (e.g., Hinglish, Spanish "Generación Z" trends).
    - Provide all feedback and red flags in English.

    Return a valid JSON object ONLY, with no markdown formatting. The object must contain:
    - overallScore (number 0-100)
    - breakdown (object with keys: slang, readability, usability, hook, vibe - each 0-100)
    - feedback (string, exactly 2 sentences explaining the main "vibe check" result)
    - redFlags (array of strings, exactly 3 specific "cringe" or "flop" moments, sorted by severity)
    - language (string, name of detected language)

    STRICTNESS: You must be extremely consistent. If analyzed twice, the output must be identical. Use concise, objective labels for red flags.
    `;

    // 1. PRIMARY: Try Google Gemini (Official SDK)
    const geminiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          generationConfig: { temperature: 0 }
        });

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
        "temperature": 0,
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
      breakdown: { slang: 0, readability: 0, usability: 0, hook: 0, vibe: 0 },
      feedback: "System Offline. Unable to audit content at this time.",
      redFlags: ["AI Service Unavailable", "Network Error"],
      language: "Unknown"
    }, { status: 500 });
  }
}
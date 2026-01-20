import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, trendData } = await req.json();
    const systemPrompt = `You are a strategic AI. Trend: ${trendData?.name}. Strategic status: ${trendData?.status}.`;

    // Updated 2026 Free Model Rotation
    const freeModels = [
      "xiaomi/mimo-v2-flash:free",           // High performance, top for Jan 2026
      "mistralai/devstral-2-2512:free",      // Great for technical/coding logic
      "google/gemini-2.5-flash-lite:free",   // Very fast and stable
      "meta-llama/llama-3.3-70b-instruct:free" // Reliable fallback
    ];

    let lastError = "";

    for (const modelId of freeModels) {
      try {
        console.log(`>>> Trying model: ${modelId}`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Verity Radar",
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            max_tokens: 500,
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data = await response.json();

        if (response.ok && data.choices?.[0]?.message?.content) {
          return NextResponse.json({ 
            role: "assistant", 
            content: data.choices[0].message.content 
          });
        }
        
        lastError = data.error?.message || "Endpoint unavailable";
        console.warn(`${modelId} failed: ${lastError}`);
      } catch (e: any) {
        lastError = e.message;
      }
    }

    return NextResponse.json({ 
      role: "assistant", 
      content: `All channels jammed. Last error: ${lastError}. Check your Privacy Settings on OpenRouter.` 
    });

  } catch (error: any) {
    return NextResponse.json({ role: "assistant", content: "Critical Failure." }, { status: 500 });
  }
}
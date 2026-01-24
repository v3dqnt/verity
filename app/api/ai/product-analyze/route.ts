import { NextResponse } from 'next/server';
import OpenAI from "openai";

const openaiKey = process.env.OPENAI_API_KEY || '';

export async function POST(req: Request) {
    try {
        const { imageBase64, mimeType } = await req.json();
        if (!imageBase64 || !mimeType) return NextResponse.json({ error: "Image data and mimeType are required" }, { status: 400 });
        if (!openaiKey) return NextResponse.json({ error: "OpenAI API Key missing" }, { status: 500 });

        const openai = new OpenAI({ apiKey: openaiKey });

        const prompt = `
      Analyze this product image for a brand identity profile.
      
      Task: Extract visual DNA, quality signals, and "Vibe" from the product.
      
      Required Fields:
      1. product_name: What is this?
      2. visual_dna: 3-5 keywords describing the aesthetic (e.g., "Minimalist", "Raw", "Industrial").
      3. quality_signals: What makes this look premium or authentic?
      4. brand_vibe: How would you describe the brand personality based ONLY on this product?
      5. color_palette: 3 hex-like descriptions (e.g., "Matte Black", "Cobalt", "Neon Orange").

      Return ONLY a JSON object:
      {
        "product_name": "string",
        "visual_dna": ["string", "string", "string"],
        "quality_signals": "string",
        "brand_vibe": "string",
        "color_palette": ["string", "string", "string"]
      }
    `;

        console.log("Analyzing product image via GPT-4o Vision...");

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        const responseText = response.choices[0].message.content || "{}";
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");

        return NextResponse.json(JSON.parse(jsonMatch[0]));

    } catch (error: any) {
        console.error("PRODUCT_ANALYZE_ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

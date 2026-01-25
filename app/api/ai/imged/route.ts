import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio = "1:1", image, type = "image" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const enhancedPrompt = `${prompt}. photorealistic, 8k, cinematic lighting`;

    // --- PRIMARY: OPENROUTER (Gemini 2.5 Flash Image - Nano Banana) ---
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (OPENROUTER_API_KEY && type !== "video") {
      try {
        console.log(`Attempting OpenRouter Gemini 2.5 Flash Image (Nano Banana) synthesis...`);

        const messages: any[] = [
          {
            role: "user",
            content: [
              { type: "text", text: enhancedPrompt }
            ]
          }
        ];

        if (image) {
          const base64Data = image.split(',')[1];
          const mimeType = image.split(';')[0].split(':')[1];
          messages[0].content.push({
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`
            }
          });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://verity-ai.vercel.app",
            "X-Title": "Verity AI"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview", // Nano Banana 2.5
            messages: messages,
            generation_config: {
              aspect_ratio: aspectRatio === "9:16" ? "9:16" : aspectRatio === "16:9" ? "16:9" : "1:1",
            }
          })
        });

        const data = await response.json();


        // 1. Check for images array (Specialized Image Models)
        if (data.images && data.images.length > 0) {
          console.log("OpenRouter (Images array) Successful.");
          return NextResponse.json({ url: data.images[0] });
        }

        const candidate = data.choices?.[0]?.message;

        // 2. Check for multimodal content parts
        if (candidate?.content && Array.isArray(candidate.content)) {
          for (const part of candidate.content) {
            if (part.type === "image" || part.image_url) {
              console.log("OpenRouter (Content Part) Successful.");
              const url = part.image_url?.url || part.url || part.image;
              if (url) return NextResponse.json({ url });
            }
          }
        }

        // 3. Last ditch: some models return URL directly in message or as a field
        if (candidate?.image_url) return NextResponse.json({ url: candidate.image_url.url });
        if (candidate?.url) return NextResponse.json({ url: candidate.url });

        console.warn("OpenRouter returned no image, falling back...");
      } catch (orError: any) {
        console.error("OpenRouter Synthesis Failed:", orError.message || orError);
      }
    }

    // --- SECONDARY: GEMINI SDK (Video: Veo 3.1 / Img: Native Fallback) ---
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (GOOGLE_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

        if (type === "video") {
          console.log("Attempting Gemini Video (Veo 3.1) synthesis...");
          const videoParams: any = {
            model: "veo-3.1-generate-preview",
            prompt: prompt,
            aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9"
          };

          if (image) {
            const base64Data = image.split(',')[1];
            const mimeType = image.split(';')[0].split(':')[1] || 'image/png';
            videoParams.image = { imageBytes: base64Data, mimeType: mimeType };
          }

          let operation = await ai.models.generateVideos(videoParams);
          let attempts = 0;
          while (!operation.done && attempts < 60) {
            await new Promise(r => setTimeout(r, 5000));
            operation = await ai.operations.getVideosOperation({ operation });
            attempts++;
          }

          if (operation.done && operation.response?.generatedVideos?.[0]?.video?.uri) {
            const videoUri = operation.response.generatedVideos[0].video.uri;
            const videoRes = await fetch(videoUri, { headers: { 'x-goog-api-key': GOOGLE_API_KEY } });
            const arrayBuffer = await videoRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return NextResponse.json({ url: `data:video/mp4;base64,${buffer.toString('base64')}` });
          }
          throw new Error("Video synthesis failed or timed out.");
        }
      } catch (geminiError: any) {
        console.error("Gemini SDK Failed:", geminiError.message);
      }
    }

    // --- TERTIARY/FALLBACK: POLLINATIONS.AI ---
    console.log("Using Pollinations fallback...");
    if (type === "video") {
      let width = 1344; let height = 768;
      if (aspectRatio === "9:16") { width = 768; height = 1344; }
      const model = image ? "seedance" : "veo";
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const videoUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}`;

      const vidRes = await fetch(videoUrl);
      if (vidRes.ok) {
        const arrayBuffer = await vidRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return NextResponse.json({ url: `data:video/mp4;base64,${buffer.toString('base64')}` });
      }
    }

    // Default Image Fallback
    let width = 1344; let height = 768;
    if (aspectRatio === "9:16") { width = 768; height = 1344; }
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&model=flux`;

    const imageRes = await fetch(imageUrl);
    if (imageRes.ok) {
      const arrayBuffer = await imageRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return NextResponse.json({ url: `data:image/jpeg;base64,${buffer.toString('base64')}` });
    }

    throw new Error("All synthesis providers failed.");

  } catch (error: any) {
    console.error("Synthesis Critical Failure:", error);
    return NextResponse.json({ error: error.message || "Failed to generate content." }, { status: 500 });
  }
}
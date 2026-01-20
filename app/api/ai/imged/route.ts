import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio = "1:1", image, type = "image" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const enhancedPrompt = `${prompt}. photorealistic, 8k, cinematic lighting`;

    // --- PRIMARY: GEMINI GEN 3 (Img: Nano Banana / Vid: Veo 3.1) ---
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (GOOGLE_API_KEY) {
      try {
        console.log(`Attempting Gemini ${type} synthesis...`);
        const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

        if (type === "video") {
          // VIDEO SYNTHESIS MODE (VEO 3.1)
          const videoParams: any = {
            model: "veo-3.1-generate-preview",
            prompt: prompt,
            // Adhere to selected aspect ratio (default to 16:9)
            aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9"
          };

          if (image) {
            const base64Data = image.split(',')[1];
            const mimeType = image.split(';')[0].split(':')[1] || 'image/png';
            videoParams.image = {
              imageBytes: base64Data,
              mimeType: mimeType
            };
          }

          let operation = await ai.models.generateVideos(videoParams);
          console.log("Video synthesis started:", operation.name);

          // Polling loop for video generation
          let attempts = 0;
          const maxAttempts = 60; // 60 * 5s = 300s max for video
          while (!operation.done && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            // Defensive polling: some SDK versions might prefer the name or the object
            operation = await ai.operations.getVideosOperation({ operation });
            attempts++;
            console.log(`Polling status... ${operation.done ? 'DONE' : 'IN_PROGRESS'} (Attempt ${attempts})`);
          }

          if (!operation.done) {
            throw new Error("Video synthesis timed out after 5 minutes.");
          }

          const response = operation.response;
          if (response?.generatedVideos && response.generatedVideos.length > 0) {
            const videoFile = response.generatedVideos[0].video;
            console.log("Video synthesis successful. Retrieving data...");

            if (videoFile?.uri) {
              const videoRes = await fetch(videoFile.uri, {
                headers: { 'x-goog-api-key': GOOGLE_API_KEY } // Use API key header for Google AI endpoints
              });

              if (!videoRes.ok) {
                // Try alternate header if first fails
                const altRes = await fetch(videoFile.uri, {
                  headers: { 'Authorization': `Bearer ${GOOGLE_API_KEY}` }
                });
                if (!altRes.ok) throw new Error(`Failed to fetch video data: ${altRes.status}`);
                const arrayBuffer = await altRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                return NextResponse.json({ url: `data:video/mp4;base64,${buffer.toString('base64')}` });
              }

              const arrayBuffer = await videoRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const base64Video = buffer.toString('base64');
              const dataUrl = `data:video/mp4;base64,${base64Video}`;
              return NextResponse.json({ url: dataUrl });
            }
          }
          throw new Error("No video data returned from Gemini.");
        } else {
          // IMAGE SYNTHESIS MODE (NANO BANANA)
          const contents: any[] = [{ text: enhancedPrompt }];
          if (image) {
            const base64Data = image.split(',')[1];
            const mimeType = image.split(';')[0].split(':')[1];
            contents.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            });
          }

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: contents,
            generationConfig: {
              aspectRatio: aspectRatio === "9:16" ? "9:16" : aspectRatio === "16:9" ? "16:9" : "1:1",
              number_of_images: 1,
            }
          } as any);

          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts;

          if (parts) {
            for (const part of parts) {
              if (part.inlineData) {
                console.log("Gemini (Nano Banana) Successful.");
                const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                return NextResponse.json({ url: dataUrl });
              }
            }
          }
        }
        console.warn("Gemini returned no valid data, falling back...");
      } catch (geminiError: any) {
        console.error("Gemini Synthesis Failed:", geminiError.message || geminiError);
        console.log("Falling back to Pollinations for video...");
      }
    }

    // --- FALLBACK: POLLINATIONS.AI (Supports both Image and Video) ---
    if (type === "video") {
      // Calculate Dimensions (Default to 16:9)
      let width = 1344;
      let height = 768;
      if (aspectRatio === "9:16") { width = 768; height = 1344; }
      if (aspectRatio === "16:9") { width = 1344; height = 768; }

      let imageUrlParam = "";
      if (image) {
        try {
          const base64Data = image.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const formData = new FormData();
          formData.append('file', new Blob([buffer]), 'reference.jpg');
          const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: formData });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            let tmpUrl = uploadData.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            imageUrlParam = `&image=${encodeURIComponent(tmpUrl)}`;
          }
        } catch (e) {
          console.error("Pollinations video upload error", e);
        }
      }

      const model = image ? "seedance" : "veo";
      const seed = Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      // Note: Pollinations video often returns a URL to a video file
      const videoUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}${imageUrlParam}`;

      // Proxy the video
      const vidRes = await fetch(videoUrl);
      if (vidRes.ok) {
        const arrayBuffer = await vidRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Video = buffer.toString('base64');
        const dataUrl = `data:video/mp4;base64,${base64Video}`;
        return NextResponse.json({ url: dataUrl });
      }
      throw new Error("Pollinations video fallback failed.");
    }

    // --- IMAGE FALLBACK (EXISTING) ---
    // 1. Handle Reference Image (Img2Img)
    let imageUrlParam = "";
    if (image) {
      try {
        console.log("Uploading reference image to temporary host...");
        const base64Data = image.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), 'reference.jpg');

        const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          let tmpUrl = uploadData.data.url;
          tmpUrl = tmpUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
          imageUrlParam = `&image=${encodeURIComponent(tmpUrl)}`;
          console.log("Reference image uploaded:", tmpUrl);
        }
      } catch (e) {
        console.error("Reference upload error", e);
      }
    }

    // 2. Calculate Dimensions
    let width = 1344;
    let height = 768;
    if (aspectRatio === "9:16") { width = 768; height = 1344; }
    if (aspectRatio === "16:9") { width = 1344; height = 768; }

    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const model = imageUrlParam ? "flux" : "flux";
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${model}${imageUrlParam}`;

    const apiKey = process.env.POLLINATIONS_API_KEY;
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const imageRes = await fetch(imageUrl, { headers });
    const contentType = imageRes.headers.get('content-type');

    if (!imageRes.ok || (contentType && !contentType.startsWith('image/'))) {
      throw new Error(`Pollinations API Error: ${imageRes.status}`);
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = contentType || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    return NextResponse.json({ url: dataUrl });

  } catch (error: any) {
    console.error("Critical Failure:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image." },
      { status: 500 }
    );
  }
}
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config({ path: ".env.local" });

async function testVideo() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("GOOGLE_API_KEY missing");
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = "A cat running in a field, cinematic, high quality";

    try {
        console.log("Starting video generation...");
        let operation = await ai.models.generateVideos({
            model: "veo-3.1-generate-preview",
            prompt: prompt,
        });

        console.log("Operation started:", operation.name);

        while (!operation.done) {
            console.log("Waiting...");
            await new Promise(r => setTimeout(r, 5000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        console.log("Operation complete!");
        console.log("Response:", JSON.stringify(operation.response, null, 2));

        if (operation.response && operation.response.generatedVideos && operation.response.generatedVideos.length > 0) {
            const video = operation.response.generatedVideos[0].video;
            console.log("Video File metadata:", JSON.stringify(video, null, 2));
        }
    } catch (err) {
        console.error("Error during test:", err);
    }
}

testVideo();

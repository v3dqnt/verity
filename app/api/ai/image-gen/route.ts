export async function POST(req: Request) {
  try {
    const { prompt, seed } = await req.json();

    // Use the seed provided by the orchestrator, or fallback to random
    const activeSeed = seed || Math.floor(Math.random() * 1000000);

    const baseUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
    const finalUrl = `${baseUrl}?width=1024&height=1024&seed=${activeSeed}&model=flux&nologo=true&enhance=true`;

    const response = await fetch(finalUrl, {
      headers: { "Authorization": `Bearer ${process.env.POLLINATIONS_API_KEY}` }
    });

    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    return new Response(
      JSON.stringify({
        imageUrl: `data:image/png;base64,${base64Image}`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Image gen failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
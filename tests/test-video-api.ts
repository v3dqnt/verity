import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch'; // Next.js test environment usually requires this or global fetch

async function runTest() {
    const videoFile = 'tests/sample.mp4';

    if (!fs.existsSync(videoFile)) {
        console.error(`Please place a sample video at ${videoFile} to run this test.`);
        // We can still write the file and let the user create the sample.
        return;
    }

    console.log(`Testing with ${videoFile}...`);

    const formData = new FormData();
    formData.append('video', fs.createReadStream(videoFile));

    try {
        const response = await fetch('http://localhost:3000/api/ai/vision', {
            method: 'POST',
            body: formData as any
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status}`);
            fs.writeFileSync('tests/error.html', await response.text());
            console.error('Saved error page to tests/error.html');
            return;
        }

        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (err: any) {
        console.error("Test failed:", err?.message || err);
    }
}

runTest();

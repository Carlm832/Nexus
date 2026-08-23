const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { GoogleGenAI } = require('@google/genai');

const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
const geminiModel = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const elevenKey = (process.env.ELEVENLABS_API_KEY || '').trim();
const elevenModel = (process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5').trim();
const elevenVoiceId = (process.env.ELEVENLABS_VOICE_ID || '').trim();

async function checkGemini() {
    if (!geminiKey) {
        console.log('Gemini: missing GEMINI_API_KEY');
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: 'Reply with OK only.'
        });
        console.log(`Gemini: OK using ${geminiModel} -> ${String(response.text).trim()}`);
    } catch (error) {
        console.log(`Gemini: FAILED using ${geminiModel}`);
        console.log(String(error.message));
    }
}

async function checkElevenLabs() {
    if (!elevenKey) {
        console.log('ElevenLabs: missing ELEVENLABS_API_KEY');
        return;
    }

    try {
        const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': elevenKey }
        });

        const voices = voicesResponse.data.voices || [];
        const categoryCounts = voices.reduce((counts, voice) => {
            counts[voice.category] = (counts[voice.category] || 0) + 1;
            return counts;
        }, {});

        console.log(`ElevenLabs: voices available -> ${JSON.stringify(categoryCounts)}`);

        if (!elevenVoiceId) {
            console.log('ElevenLabs: missing ELEVENLABS_VOICE_ID');
            console.log('Set ELEVENLABS_VOICE_ID to a generated/default voice you own. Premade/library voices are blocked on free-tier API access.');
            return;
        }

        const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`;
        const response = await axios.post(url, {
            text: 'Test audio.',
            model_id: elevenModel,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        }, {
            headers: {
                'xi-api-key': elevenKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            responseType: 'arraybuffer'
        });

        console.log(`ElevenLabs: OK using ${elevenModel} with voice ${elevenVoiceId} -> ${response.data.length} bytes`);
    } catch (error) {
        const detail = Buffer.isBuffer(error.response?.data)
            ? error.response.data.toString('utf8')
            : JSON.stringify(error.response?.data || error.message);
        console.log('ElevenLabs: FAILED');
        console.log(detail);
    }
}

async function main() {
    await checkGemini();
    await checkElevenLabs();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});

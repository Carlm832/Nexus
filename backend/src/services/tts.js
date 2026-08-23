/* =========================================================================
 * TTS Service (ElevenLabs Integration)
 * 
 * Responsible for authenticating with the ElevenLabs API, sending 
 * the text payload synthesized by Gemini, and downloading the resulting 
 * high-fidelity .mp3 file to the local filesystem.
 * ========================================================================= */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const TTS_API_KEY = (process.env.ELEVENLABS_API_KEY || '').trim();
const VOICE_ID = (process.env.ELEVENLABS_VOICE_ID || '').trim();
const MODEL_ID = (process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5').trim();

function getApiUrl() {
    return `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
}

/**
 * Generates speech from text using ElevenLabs Text-to-Speech API
 * and streams it directly to disk as an MP3 file.
 * 
 * @param {string} text - The text to synthesize (Title + Summary + Significance).
 * @param {string} outputPath - The absolute path where the .mp3 file should be saved.
 * @returns {Promise<boolean>} True if successfully generated and saved to disk, false otherwise.
 */
async function generateSpeech(text, outputPath) {
    if (!TTS_API_KEY) {
        console.warn("WARNING: ELEVENLABS_API_KEY not found in environment. Skipping audio generation.");
        return false;
    }

    if (!VOICE_ID) {
        console.warn("WARNING: ELEVENLABS_VOICE_ID not set. Configure a generated/default voice to enable audio generation.");
        return false;
    }

    try {
        // Use a configurable modern model because older v1 models are blocked on free tier.
        const payload = {
            text: text,
            model_id: MODEL_ID,
            voice_settings: {
                stability: 0.5,       // Balance between expressiveness and consistency
                similarity_boost: 0.75 // Keeps the voice sounding like the original sample
            }
        };

        // Fire the core request
        const response = await axios.post(getApiUrl(), payload, {
            headers: {
                'xi-api-key': TTS_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            // CRITICAL: Must use arraybuffer to catch the raw binary audio stream, 
            // otherwise axios will attempt to parse the audio file as JSON/Text and corrupt the mp3.
            responseType: 'arraybuffer'
        });

        if (response.status !== 200) {
            throw new Error(`ElevenLabs API responded with status: ${response.status}`);
        }

        // Ensure directory exists before saving
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, response.data);
        return true;
    } catch (error) {
        const detail = Buffer.isBuffer(error.response?.data)
            ? error.response.data.toString('utf8')
            : JSON.stringify(error.response?.data || '');
        console.error('Error generating speech with ElevenLabs:', detail || error.message);
        return false;
    }
}

module.exports = {
    generateSpeech
};

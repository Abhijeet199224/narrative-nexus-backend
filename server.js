const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Nexus Memory (MongoDB) Connected"))
  .catch(err => console.error("❌ Connection Error:", err));

// Story Schema
const storySchema = new mongoose.Schema({
    title: String,
    bible: Object,
    lastProse: String,
    updatedAt: { type: Date, default: Date.now }
});
const Story = mongoose.model('Story', storySchema);

// The Main Narrative Nexus Endpoint
app.post('/generate-nexus', async (req, res) => {
    const { bible, soulLevel, lastContext, storyId } = req.body;

    // Logic: Interruption frequency based on Soul-Check Slider
    const maxTokens = soulLevel > 50 ? 300 : 800; 

    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-5-sonnet-20241022",
            max_tokens: maxTokens,
            messages: [{ 
                role: "user", 
                content: `Using this Lore Codex: ${JSON.stringify(bible)}, continue the story from: "${lastContext}". 
                If the Soul-Check level is ${soulLevel}%, ensure you stop to ask for emotional input.` 
            }]
        }, {
            headers: { 
                'x-api-key': process.env.CLAUDE_KEY, 
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json' 
            }
        });

        const newProse = response.data.content[0].text;

        // Auto-save to MongoDB
        await Story.findByIdAndUpdate(storyId, { lastProse: newProse, updatedAt: Date.now() }, { upsert: true });

        res.json({ prose: newProse, triggerSoulCheck: soulLevel > 50 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ... existing imports
app.post('/generate-nexus', async (req, res) => {
    const { bible, soulLevel, lastContext, storyId } = req.body;
    const maxTokens = soulLevel > 50 ? 300 : 800;

    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-5-sonnet-20241022",
            max_tokens: maxTokens,
            // WE MOVE THE BIBLE TO THE SYSTEM PROMPT FOR CACHING
            system: [
                {
                    type: "text",
                    text: `You are a co-writer using this Lore Codex: ${JSON.stringify(bible)}`,
                    cache_control: { type: "ephemeral" } // THIS TRIGGERS THE 90% SAVINGS
                }
            ],
            messages: [{ 
                role: "user", 
                content: `Continue the story from: "${lastContext}". Interruption Level: ${soulLevel}%` 
            }]
        }, {
            headers: { 
                'x-api-key': process.env.CLAUDE_KEY, 
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'prompt-caching-2024-07-31', // REQUIRED BETA HEADER
                'Content-Type': 'application/json' 
            }
        });

        const newProse = response.data.content[0].text;
        // Tracking usage for your logs
        console.log(`Cache Hits: ${response.data.usage.cache_read_input_tokens}`);

        res.json({ prose: newProse, triggerSoulCheck: soulLevel > 50 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
const PORT = process.env.PORT || 10000; // Render expects this port
app.listen(PORT, () => console.log(`🚀 Nexus Brain active on port ${PORT}`));

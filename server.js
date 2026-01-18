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
  .then(() => console.log("✅ Nexus Memory Connected"))
  .catch(err => console.error("❌ Connection Error:", err));

// Story Schema
const storySchema = new mongoose.Schema({
    title: String,
    bible: Object,
    lastProse: String,
    updatedAt: { type: Date, default: Date.now }
});
const Story = mongoose.model('Story', storySchema);

// SINGLE Optimized Endpoint
app.post('/generate-nexus', async (req, res) => {
    const { bible, soulLevel, lastContext, storyId } = req.body;

    // Safety check: if no storyId is provided, MongoDB will fail
    if (!storyId) {
        return res.status(400).json({ error: "storyId is required for auto-save." });
    }

    const maxTokens = soulLevel > 50 ? 300 : 800;

    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-5-sonnet-20241022",
            max_tokens: maxTokens,
            system: [
                {
                    type: "text",
                    text: `You are a co-writer using this Lore Codex: ${JSON.stringify(bible)}`,
                    cache_control: { type: "ephemeral" } 
                }
            ],
            messages: [{ 
                role: "user", 
                content: `Continue from: "${lastContext}". Soul-Check Level: ${soulLevel}%` 
            }]
        }, {
            headers: { 
                'x-api-key': process.env.CLAUDE_KEY, 
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'prompt-caching-2024-07-31', 
                'Content-Type': 'application/json' 
            }
        });

        const newProse = response.data.content[0].text;

        // Auto-save & return the NEWEST version of the doc
        const updatedStory = await Story.findByIdAndUpdate(
            storyId, 
            { lastProse: newProse, updatedAt: Date.now() }, 
            { upsert: true, new: true } 
        );

        res.json({ 
            prose: newProse, 
            triggerSoulCheck: soulLevel > 50,
            usage: response.data.usage // Good for debugging cache hits
        });

    } catch (err) {
        console.error("AI Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ error: "Nexus Brain failed to process." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Nexus Brain active on port ${PORT}`));
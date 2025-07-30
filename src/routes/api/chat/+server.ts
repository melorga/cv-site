import { json } from '@sveltejs/kit';
import Groq from 'groq-sdk';

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, v) => sum + v*v, 0));
  const normB = Math.sqrt(b.reduce((sum, v) => sum + v*v, 0));
  return dot / (normA * normB);
}

export async function POST({ request, platform }) {
  try {
    console.log('Chat API called');
    
    // Parse request
    const { message, turnstileToken } = await request.json();
    console.log('Received message:', message);
    
    if (!message || typeof message !== 'string') {
      console.error('Invalid message:', message);
      return json({ error: 'Message is required and must be a string' }, { status: 400 });
    }

    // Validate environment variables
    if (!platform?.env?.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not found in environment');
      return json({ error: 'GROQ API key not configured' }, { status: 500 });
    }

    if (!platform?.env?.PROFILE_VECTORS) {
      console.error('PROFILE_VECTORS KV binding not found');
      return json({ error: 'Profile vectors not available' }, { status: 500 });
    }

    console.log('Environment check passed');

    // Initialize Groq client
    const groq = new Groq({
      apiKey: platform.env.GROQ_API_KEY,
    });

    console.log('Groq client initialized');

    // For now, let's try a simple approach first - get all stored vectors
    // In production, you'd want to implement proper vector search
    const kvKeys = await platform.env.PROFILE_VECTORS.list();
    console.log('Found KV keys:', kvKeys.keys.length);
    
    let contextChunks = [];
    
    // Get all stored vectors and their content
    for (const key of kvKeys.keys.slice(0, 10)) { // Limit to first 10 for now
      try {
        const stored = await platform.env.PROFILE_VECTORS.get(key.name);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.content) {
            contextChunks.push(data.content);
          }
        }
      } catch (e) {
        console.warn('Failed to parse stored data for key:', key.name);
      }
    }

    console.log('Retrieved context chunks:', contextChunks.length);

    // Build context from retrieved chunks
    const context = contextChunks.join('\n\n');
    
    const systemPrompt = `You are an AI assistant representing Mariano Elorga, an AWS Solutions Architect. 
Use the following information about his professional background to answer questions accurately and professionally.

PROFESSIONAL INFORMATION:
${context}

Respond as if you are representing Mariano's professional profile to potential employers or recruiters. Be helpful, accurate, and professional. If asked about something not covered in the provided information, acknowledge that politely and offer to clarify what information is available.`;

    console.log('Sending request to Groq API');

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 1000
    });

    console.log('Groq API response received');

    const response = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response at this time.';
    
    return json({
      response: response,
      contextUsed: contextChunks.length > 0
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

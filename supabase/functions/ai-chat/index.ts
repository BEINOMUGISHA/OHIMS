// supabase/functions/ai-chat/index.ts
// Supabase Edge Function — proxies Gemini API for OHIMS AI Chat Assistant.
// Deploy: supabase functions deploy ai-chat
// Set secret: supabase secrets set GEMINI_API_KEY=your_key_here

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ reply: 'AI service is not configured. Please set the GEMINI_API_KEY secret.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation history for Gemini
    const contents = [
      {
        role: 'user',
        parts: [{ text: 'You are an OHIMS Uganda health insurance underwriting AI assistant. Help users understand their plan benefits, exclusions, claims process, and coverage details. Be concise, professional, and helpful. Always refer to Uganda shillings (UGX) for amounts.' }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am your OHIMS Uganda AI assistant. How can I help you with your health insurance coverage today?' }],
      },
      ...(history || []).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      ?? 'I apologize, I was unable to generate a response. Please try again.';

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ reply: `Service error: ${error.message}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

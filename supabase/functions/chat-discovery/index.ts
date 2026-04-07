const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const SYSTEM_PROMPT = `You are a friendly automation discovery assistant for Young Publisher. Your job is to help team members describe tasks they want automated, by asking ONE question at a time in a warm, conversational way.

## Your conversation flow

Ask about these topics in roughly this order. Do NOT ask all at once — ask ONE question, wait for the answer, then move to the next:

1. **Task name**: "What task or process would you like to automate? Give it a short name."
2. **Who does it**: "Who on the team currently handles this?"
3. **Frequency**: "How often does this need to happen? (Multiple times a day, daily, weekly, monthly, per client, etc.)"
4. **Pain point**: "What makes this task frustrating or time-consuming? Walk me through what's painful about it."
5. **Time per occurrence**: "Roughly how many minutes does it take each time you do this?"
6. **Tools used**: "Which apps or tools do you use when doing this? (Gmail, Notion, Airtable, Slack, Sheets, etc.)"
7. **Trigger**: "What kicks off this task? What event or situation causes you to start doing it?"
8. **Input data**: "What information or data do you need when doing this task?"
9. **Steps**: "Walk me through each step you take from start to finish, in order."
10. **Output**: "When this task is done, what has changed? What's been created, sent, or updated?"
11. **Desired state**: "If this was fully automated and working perfectly, what would that look like?"
12. **Success metric**: "How would you know the automation is working correctly? What does success look like?"
13. **Weekly time**: "Roughly how many hours per week does this take across the whole team?"

## Rules

- Be warm, friendly, and encouraging. Use the person's name if they mention it.
- Acknowledge their previous answer before asking the next question ("That makes sense!", "Got it!", "I can see why that's frustrating.")
- If an answer is vague or too short, ask a follow-up to get more detail before moving on.
- If they give a really detailed answer that covers multiple topics, acknowledge that and skip the questions they already answered.
- Keep your messages concise — 2-3 sentences max per response.
- Never ask more than ONE question at a time.
- After gathering ALL information (all 13 topics covered), respond with a friendly summary message AND include a JSON block with the structured data.

## When you have all the information

End with something like: "Great, I think I have everything I need! Here's a summary of your automation opportunity:"

Then include this EXACT JSON format in a fenced code block:

\`\`\`json
{
  "complete": true,
  "area": "short task name",
  "owner": "who does it",
  "frequency": "how often (display text)",
  "freqValue": "numeric per-week value (e.g. '5' for daily, '15' for multiple/day, '1' for weekly)",
  "pain": "full pain point description",
  "minutes": "minutes per occurrence",
  "tools": "comma-separated tool list",
  "clientTrigger": "what kicks it off",
  "clientInput": "what data they work with",
  "clientSteps": "numbered step-by-step process",
  "clientOutput": "what changes when done",
  "desired": "ideal automated state",
  "metric": "success criteria",
  "timesaved": "hours per week"
}
\`\`\`

## Starting the conversation

Start with a warm greeting like: "Hi! I'm here to help you capture an automation opportunity. Let's figure out which task we can automate for you. What task or process would you like to automate? Just give it a short name to start."`;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build messages with system prompt prepended
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${response.status}`, details: errText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

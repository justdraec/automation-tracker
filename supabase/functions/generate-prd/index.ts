const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

Deno.serve(async (req: Request) => {
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
    const { opportunity, format } = await req.json();

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isMarkdown = format !== 'plain';

    const systemPrompt = `You are a senior automation architect and technical writer. Your job is to take a captured automation opportunity and produce a comprehensive, production-ready PRD (Product Requirements Document) that a developer or automation builder can use to build the workflow immediately.

Write with precision and clarity. Be specific — avoid vague language. Fill in reasonable technical assumptions where data is incomplete, and flag assumptions clearly. The PRD should read like a senior engineer wrote it after a thorough client discovery.

${isMarkdown ? 'Output in clean Markdown with clear headings, tables, and code blocks where appropriate.' : 'Output in plain text with clear section labels. No markdown formatting.'}

The PRD must cover:
1. Problem statement and context
2. Scope and constraints
3. Technical specification (trigger, inputs, process steps, outputs)
4. Data flow
5. Error handling strategy
6. AI components (if applicable)
7. Success criteria and metrics
8. ROI estimate
9. Testing strategy
10. Deployment and maintenance notes
11. Open questions and assumptions
12. Step-by-step build instructions for the chosen tool`;

    const userMessage = `Generate a complete PRD for this automation opportunity:

${JSON.stringify(opportunity, null, 2)}

Build tool: ${opportunity.tool || 'TBD'}
Priority: ${(opportunity.priority || 'medium').toUpperCase()}
Score: ${opportunity.score}/10 (Impact ${opportunity.impact}/5, Urgency ${opportunity.urgency}/5, Feasibility ${opportunity.feasibility}/5)`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic error: ${response.status}`, details: errText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const prd = data.content?.[0]?.text || 'Failed to generate PRD.';

    return new Response(
      JSON.stringify({ prd }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

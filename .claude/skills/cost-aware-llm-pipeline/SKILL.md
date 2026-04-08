# Cost-Aware LLM Pipeline Skill

Cost optimization for OpenAI GPT-4o usage in the chat discovery feature.

## Current Usage
- Model: GPT-4o via Supabase Edge Function
- Temperature: 0.7, max_tokens: 1024
- Average conversation: ~13 exchanges (one per discovery topic)
- System prompt: ~800 tokens

## Cost Controls
- max_tokens capped at 1024 per response
- System prompt sent once per conversation (not per message)
- File attachments truncated to 8,000 characters
- AI instructed to skip already-answered questions (fewer total exchanges)

## Optimization Opportunities
- Cache system prompt hash to avoid re-sending identical prompt
- Consider GPT-4o-mini for simple follow-up questions
- Add token counting on frontend to estimate cost per conversation
- Rate limit conversations per IP/session to prevent abuse
- Consider streaming responses for faster perceived performance

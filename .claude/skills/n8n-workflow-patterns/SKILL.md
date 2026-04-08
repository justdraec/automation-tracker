# n8n Workflow Patterns Skill

n8n workflow generation and deployment patterns for the Automation Opportunity Tracker.

## Workflow Builder
- `src/lib/workflow-builder.ts` generates n8n workflow JSON
- Maps tools to n8n node types (Gmail, Slack, Notion, Airtable, etc.)
- Maps trigger types to n8n trigger nodes (webhook, schedule, form, email, manual)
- Builds sequential connections between nodes
- Error handler node connected to the workflow

## Deployment Flow
1. Build workflow JSON from structured opportunity data
2. POST to `{n8n-url}/api/v1/workflows` with `X-N8N-API-KEY` header
3. On failure: show JSON import panel with copy button + manual import instructions
4. Store `workflowId`, `workflowUrl`, `workflowPlatform`, `deployedAt` on the entry

## Node Mapping
- Service nodes: gmail, slack, notion, airtable, googleSheets, stripe, hubspot
- AI nodes: anthropic (Claude), openAi (GPT)
- Utility nodes: set (data), code (custom), httpRequest (fallback)
- Trigger nodes: webhook, scheduleTrigger, formTrigger, emailReadImap, manualTrigger

#!/bin/bash
COMMAND="$1"

if ! echo "$COMMAND" | grep -qE 'git\s+(add|commit|push)'; then
  exit 0
fi

SECRET_PATTERNS=(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
  "supabase\.co"
  "SUPABASE_KEY\s*=\s*['\"]ey"
  "OPENAI_API_KEY\s*=\s*['\"]sk-"
  "sk-[a-zA-Z0-9]{40,}"
  "n8n_api_[a-zA-Z0-9]"
)

if echo "$COMMAND" | grep -qE 'git\s+(add|commit)'; then
  STAGED=$(git diff --cached --name-only 2>/dev/null)
  for FILE in $STAGED; do
    for PATTERN in "${SECRET_PATTERNS[@]}"; do
      if [ -f "$FILE" ] && grep -qE "$PATTERN" "$FILE" 2>/dev/null; then
        echo "BLOCKED: Possible secret in $FILE. Move credentials to .env." >&2
        exit 1
      fi
    done
  done
fi

if echo "$COMMAND" | grep -qE 'git\s+push'; then
  if git ls-files --error-unmatch .env 2>/dev/null; then
    echo "BLOCKED: .env is tracked by git. Run: git rm --cached .env" >&2
    exit 1
  fi
fi

exit 0

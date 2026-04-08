#!/bin/bash
COMMAND="$1"

if echo "$COMMAND" | grep -qE 'rm\s+-rf|rm\s+-fr'; then
  echo "BLOCKED: Recursive delete (rm -rf) is not allowed." >&2
  exit 1
fi

if echo "$COMMAND" | grep -qiE 'drop\s+table|truncate\s+table'; then
  echo "BLOCKED: Table drops must go through Supabase dashboard or migration files." >&2
  exit 1
fi

if echo "$COMMAND" | grep -qE 'rm\s+.*node_modules|rm\s+.*\.env'; then
  echo "BLOCKED: Do not delete node_modules or .env directly." >&2
  exit 1
fi

if echo "$COMMAND" | grep -qE 'git\s+push.*--force.*main|git\s+push.*-f.*main'; then
  echo "BLOCKED: Force-pushing to main is not allowed." >&2
  exit 1
fi

if echo "$COMMAND" | grep -qE 'pkill\s+-9\s+node|killall\s+node'; then
  echo "BLOCKED: Do not kill all node processes." >&2
  exit 1
fi

exit 0

#!/usr/bin/env bash
set -euo pipefail

BRANCH="${BRANCH:-main}"
REQUIRED_CHECK="${REQUIRED_CHECK:-check}"
REQUIRED_APPROVALS="${REQUIRED_APPROVALS:-0}"
ENFORCE_ADMINS="${ENFORCE_ADMINS:-true}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required. Install it and run gh auth login first." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh CLI is not authenticated. Run gh auth login first." >&2
  exit 1
fi

REPO="${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

if [[ -z "$REPO" ]]; then
  echo "Could not resolve repository. Set REPO=owner/name and retry." >&2
  exit 1
fi

payload="$(mktemp)"
trap 'rm -f "$payload"' EXIT

cat >"$payload" <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["${REQUIRED_CHECK}"]
  },
  "enforce_admins": ${ENFORCE_ADMINS},
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": ${REQUIRED_APPROVALS}
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON

gh api \
  --method PUT \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --input "$payload" \
  >/dev/null

echo "Branch protection configured for ${REPO}:${BRANCH}"
echo "- pull request required"
echo "- required status check: ${REQUIRED_CHECK}"
echo "- required approvals: ${REQUIRED_APPROVALS}"
echo "- branch must be up to date before merge"

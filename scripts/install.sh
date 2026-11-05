#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo 'Usage: bash install.sh [--organization NAME] [--auth interactive|azcli] [--replace]'
}

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

organization=''
auth=interactive
replace=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --organization) [[ $# -ge 2 ]] || fail 'Missing organization name.'; organization=$2; shift 2 ;;
    --auth) [[ $# -ge 2 ]] || fail 'Missing authentication mode.'; auth=$2; shift 2 ;;
    --replace) replace=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; fail "Unknown option: $1" ;;
  esac
done

[[ "$auth" == interactive || "$auth" == azcli ]] || fail 'Use --auth interactive or --auth azcli.'
for command_name in codex git node npx; do
  command -v "$command_name" >/dev/null || fail "Install $command_name and add it to PATH."
done
node -e 'process.exit(parseInt(process.versions.node, 10) >= 20 ? 0 : 1)' || fail 'Install Node.js 20 or later.'
if [[ "$auth" == azcli ]]; then
  command -v az >/dev/null || fail 'Install Azure CLI and run az login.'
fi

if [[ -z "$organization" ]]; then
  [[ -t 0 ]] || fail 'Pass --organization NAME when running without a terminal.'
  read -r -p 'Azure DevOps organization name: ' organization
fi
[[ "$organization" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$ ]] || fail 'Enter the organization name from dev.azure.com/NAME.'

server_args=(--yes @azure-devops/mcp@2.11.0 "$organization" --authentication "$auth" -d core work work-items repositories pipelines search)
servers=$(codex mcp list --json)
connection=$(node -e '
  const fs = require("node:fs");
  const servers = JSON.parse(fs.readFileSync(0, "utf8"));
  const server = servers.find(({name}) => name === "azure-devops");
  if (!server) {
    console.log("absent");
  } else {
    const {transport} = server;
    const matches = server.enabled && transport.type === "stdio" &&
      transport.command === "npx" && JSON.stringify(transport.args) === JSON.stringify(process.argv.slice(1));
    console.log(matches ? "match" : "different");
  }
' -- "${server_args[@]}" <<< "$servers")
if [[ "$connection" == different && "$replace" != true ]]; then
  fail 'A different azure-devops MCP connection exists. Use --replace to replace it.'
fi

codex plugin marketplace add JeanMarcMbouma/CodexPlugin
codex plugin marketplace upgrade azure-devops-local
codex plugin add azure-devops@azure-devops-local
if [[ "$connection" != match ]]; then
  codex mcp add azure-devops -- npx "${server_args[@]}"
fi
echo 'Start a new Codex session and ask: List the Azure DevOps projects I can access.'

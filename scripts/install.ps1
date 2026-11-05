#Requires -Version 5.1
[CmdletBinding()]
param(
    [string] $Organization,

    [ValidateSet('interactive', 'azcli')]
    [string] $Auth = 'interactive',

    [switch] $Replace
)

$ErrorActionPreference = 'Stop'

function Invoke-Codex {
    & codex @args
    if ($LASTEXITCODE -ne 0) {
        throw "Codex command failed with exit code $LASTEXITCODE."
    }
}

foreach ($commandName in 'codex', 'git', 'node', 'npx') {
    if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
        throw "Install $commandName and add it to PATH."
    }
}
& node -e 'process.exit(parseInt(process.versions.node, 10) >= 20 ? 0 : 1)'
if ($LASTEXITCODE -ne 0) {
    throw 'Install Node.js 20 or later.'
}
if ($Auth -eq 'azcli' -and -not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw 'Install Azure CLI and run az login.'
}

if (-not $Organization) {
    $Organization = Read-Host 'Azure DevOps organization name'
}
if ($Organization -notmatch '^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$') {
    throw 'Enter the organization name from dev.azure.com/NAME.'
}

$Auth = $Auth.ToLowerInvariant()
$serverArgs = @('--yes', '@azure-devops/mcp@2.11.0', $Organization, '--authentication', $Auth,
    '-d', 'core', 'work', 'work-items', 'repositories', 'pipelines', 'search')
$servers = (Invoke-Codex mcp list --json | Out-String) | ConvertFrom-Json
$existing = $servers | Where-Object { $_.name -ceq 'azure-devops' }
$matchesExisting = $existing -and $existing.enabled -and $existing.transport.type -ceq 'stdio' -and
    $existing.transport.command -ceq 'npx' -and
    (ConvertTo-Json -Compress -InputObject $existing.transport.args) -ceq
    (ConvertTo-Json -Compress -InputObject $serverArgs)
if ($existing -and -not $matchesExisting -and -not $Replace) {
    throw 'A different azure-devops MCP connection exists. Use -Replace to replace it.'
}

Invoke-Codex plugin marketplace add JeanMarcMbouma/CodexPlugin
Invoke-Codex plugin marketplace upgrade azure-devops-local
Invoke-Codex plugin add azure-devops@azure-devops-local
if (-not $matchesExisting) {
    $setupArgs = @('mcp', 'add', 'azure-devops', '--', 'npx') + $serverArgs
    Invoke-Codex @setupArgs
}
Write-Host 'Start a new Codex session and ask: List the Azure DevOps projects I can access.'

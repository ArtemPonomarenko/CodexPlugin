# Azure DevOps for Codex

Use Codex to triage Azure Boards work items, review Azure Repos pull requests, and diagnose Azure Pipelines failures. The installers add the plugin and configure Microsoft's local Azure DevOps MCP server in your user-level Codex settings.

## Install

You'll need the Codex CLI, Git, Node.js 20 or later, and access to an Azure DevOps Services organization. Run the installer on the same machine and under the same user account as Codex.

### Windows PowerShell

On a fresh Windows machine, install the prerequisites with WinGet, then open a new PowerShell window.

```powershell
winget install --id OpenAI.Codex --exact --source winget
winget install --id Git.Git --exact --source winget
winget install --id OpenJS.NodeJS.LTS --exact --source winget
```

Install the plugin using [install.ps1](https://raw.githubusercontent.com/JeanMarcMbouma/CodexPlugin/main/scripts/install.ps1).

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/JeanMarcMbouma/CodexPlugin/main/scripts/install.ps1' -UseBasicParsing)))
```

### macOS or Linux

```sh
curl -fsSLo install.sh https://raw.githubusercontent.com/JeanMarcMbouma/CodexPlugin/main/scripts/install.sh && bash install.sh
```

Enter the organization name from your Azure DevOps URL. For `https://dev.azure.com/contoso`, enter `contoso`. Start a new Codex session and ask **“List the Azure DevOps projects I can access.”** Complete the Microsoft sign-in prompt on first use.

### Pass the organization or use Azure CLI sign-in

Append `-Organization contoso` to the PowerShell command or `--organization contoso` after `bash install.sh` to skip the prompt. If you already signed in with `az login`, use `-Auth azcli` or `--auth azcli`.

Run the installer again to refresh the plugin. It reuses a matching MCP configuration. To switch organizations or change authentication, rerun with `-Replace` or `--replace`. This replaces the user-level connection named `azure-devops`.

If you installed version 0.1 from a local checkout, remove that marketplace entry with `codex plugin marketplace remove azure-devops-local` before running the installer. Version 0.2 uses the installer-managed connection.

## Try it

- “Show me the active bugs assigned to me in project Dispatch.”
- “Review Azure Repos PR 42 in Dispatch/API and keep any comments as drafts.”
- “Investigate the latest failed Dispatch CI run on main and link me to the failed step.”

Azure DevOps applies the signed-in account's permissions. The workflow reads by default and writes on explicit request.

[Codex plugin packaging and installation](https://developers.openai.com/plugins/build/plugins) · [Microsoft’s local MCP setup for Codex](https://github.com/microsoft/azure-devops-mcp/blob/main/docs/GETTINGSTARTED.md#codex)

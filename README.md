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
irm 'https://raw.githubusercontent.com/JeanMarcMbouma/CodexPlugin/main/scripts/install.ps1' | iex
```
Or 
```powershell
az login
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/JeanMarcMbouma/CodexPlugin/main/scripts/install.ps1'))) -Organization 'YOUR_ORG' -Auth azcli -Replace
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

## Private ChatGPT connector

For ChatGPT web, see the [separate read-only connector](chatgpt/README.md). It supports multiple Azure DevOps organizations with a separate server-side PAT for each one.

## Scrum Master and backlog refinement

The plugin includes two skills that use your Azure Boards team and process.

| Skill | Example request |
| --- | --- |
| [Scrum Master support](plugins/azure-devops/skills/azure-devops-scrum-master/SKILL.md) | “Prepare a sprint briefing for Care Team in Fabrikam.” |
| [Backlog refinement](plugins/azure-devops/skills/azure-devops-backlog-refinement/SKILL.md) | “Review the next ten backlog items for grooming and draft acceptance criteria.” |

Both discover organization, project, team, backlog level, and process fields before analyzing work. Briefings identify missing evidence. Refinement produces proposed changes and questions for the team. The private ChatGPT connector exposes the same guidance through its `get_workflow_guidance` tool.

## Try it

- “Show me the active bugs assigned to me in project Dispatch.”
- “Review Azure Repos PR 42 in Dispatch/API and keep any comments as drafts.”
- “Investigate the latest failed Dispatch CI run on main and link me to the failed step.”

Azure DevOps applies the signed-in account's permissions. The workflow reads by default and writes on explicit request.

[Codex plugin packaging and installation](https://developers.openai.com/plugins/build/plugins) · [Microsoft’s local MCP setup for Codex](https://github.com/microsoft/azure-devops-mcp/blob/main/docs/GETTINGSTARTED.md#codex)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, testing, and pull request guidance.

## License

Licensed under the [MIT License](LICENSE).

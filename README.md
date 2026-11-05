# Azure DevOps for Codex

A local Codex plugin for Azure DevOps Services. It bundles the configuration for Microsoft's local MCP server and a workflow for Azure Boards, Repos, and Pipelines. Codex starts the server through npm. Azure DevOps applies the signed-in identity's permissions.

## Install

```sh
git clone https://github.com/JeanMarcMbouma/CodexPlugin.git
cd CodexPlugin
```

1. Install Node.js 20 or later and make sure `npx --version` runs on the machine that runs Codex. You also need an account with access to your Azure DevOps Services organization.
2. Clone the repository to a permanent local folder. Open `plugins/azure-devops/mcp.json` and replace `YOUR_ORGANIZATION` with the name after `dev.azure.com/` in your organization URL. For `https://dev.azure.com/contoso`, enter `contoso`. Leave the value in quotes and keep this edit local.
3. Run the following from the `CodexPlugin` checkout, then restart the ChatGPT desktop app.

   ```sh
   codex plugin marketplace add .
   ```

4. Open **Plugins** in Codex in the ChatGPT desktop app. Find **Azure DevOps** in **Azure DevOps Local** and install it. Start a fresh Codex conversation and ask **“List the Azure DevOps projects I can access.”** Complete the Microsoft sign-in prompt the first time you use an Azure DevOps tool.

With Codex CLI, you can install directly after adding the marketplace.

```sh
codex plugin add azure-devops@azure-devops-local
```

The first launch may need to download `@azure-devops/mcp@2.11.0` from npm. If you already configured Microsoft's local MCP server separately, use a single Azure DevOps connection in the session so Codex targets the intended organization.

## Use an existing Azure CLI sign-in

Run `az login` with the account that can access your Azure DevOps organization. Before installing, insert `"--authentication", "azcli"` immediately after the organization name and before `"-d"` in `mcp.json`. Make sure Codex can find `az`. Keep tokens outside the package.

If you change the organization or authentication settings after installing, reinstall from the updated local marketplace and start a fresh session.

## Try it

- “Show me the active bugs assigned to me in project Dispatch.”
- “Review Azure Repos PR 42 in Dispatch/API and keep any comments as drafts.”
- “Investigate the latest failed Dispatch CI run on main and link me to the failed step.”

The included server domains expose tools that can modify Azure DevOps resources. The workflow reads by default and only writes on explicit request. Azure DevOps permissions control what the signed-in identity can change.

[Codex plugin packaging and local installation](https://developers.openai.com/plugins/build/plugins) · [Microsoft’s local MCP setup for Codex](https://github.com/microsoft/azure-devops-mcp/blob/main/docs/GETTINGSTARTED.md#codex)

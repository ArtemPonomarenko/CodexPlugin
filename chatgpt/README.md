# Private Azure DevOps connector for ChatGPT

This read-only pilot serves Azure Boards, Repos, and Pipelines through a remote MCP endpoint. WorkOS AuthKit signs in one allowlisted user. The connector calls Azure DevOps REST with a separate personal access token (PAT) for each configured organization. No Entra app registration is needed for this setup.

## Configure the pilot

1. Choose a host that exposes an HTTPS URL ending in `/mcp`, such as `https://ado.example.com/mcp`. Run the Node service behind the host's HTTPS endpoint.
2. In WorkOS AuthKit, enable MCP authentication and register the exact public MCP URL as a Resource Indicator. Create or invite the pilot user and copy their immutable WorkOS user ID. Enable Client ID Metadata Document (CIMD) in WorkOS under **Connect → Configuration** for ChatGPT’s OAuth client. If ChatGPT asks for a redirect URI allowlist entry, use the exact callback shown by ChatGPT.
3. Create a separate, short-lived PAT for each organization with **Project and Team (Read)**, **Work Items (Read)**, **Code (Read)**, and **Build (Read)** as needed. Use the PAT owner's Azure DevOps project permissions to limit which projects the connector can access.
4. Set the following environment variables on the host. Store the PAT mapping using the host's secret manager.

| Variable | Value |
| --- | --- |
| `MCP_PUBLIC_URL` | Exact public MCP URL, including `/mcp` |
| `AUTHKIT_ISSUER` | AuthKit issuer origin, for example `https://your-domain.authkit.app` |
| `AUTHKIT_ALLOWED_USER_ID` | The single pilot user's WorkOS user ID |
| `AZURE_DEVOPS_ORGANIZATIONS` | JSON object keyed by Azure DevOps organization name |
| `PORT` | HTTP listener port. Defaults to `3000` |

Example shape for the organization secret with placeholder values.

```json
{"contoso":"CONTOSO_READ_PAT","fabrikam":"FABRIKAM_READ_PAT"}
```

Set PATs on the host only. Keep the organization secret out of source control, container images, and ChatGPT. To add or rotate a connection, update the mapping and restart the service. The allowlisted AuthKit user can access all configured organizations within the respective PAT owner's Azure DevOps permissions.

## Run and connect

From this directory, run `npm ci` followed by `npm start` on Node.js 24. For a container deployment, build from the repository root with `docker build -f chatgpt/Dockerfile -t azure-devops-chatgpt .` and inject the same environment variables at runtime. Route HTTPS traffic to the app's port. Use `/healthz` for host health checks.

In a ChatGPT workspace that permits custom MCP connections, add the public URL as a remote MCP server with OAuth and sign in as the pilot user. Start with **“List the connected Azure DevOps organizations.”** Then try **“List projects in Contoso”** or **“Read work item 42 in Fabrikam.”** For a pipeline run, provide its project and build ID or the full Azure DevOps results link.

An organization name or Azure DevOps link can select the connection for an individual request. With multiple configured organizations, a request without an organization gets an error before any Azure DevOps call. An explicit organization outside the configured list also gets an error. Each tool result identifies the organization it used.

The pilot exposes thirteen read tools. Alongside organization and project discovery, work item details, PR summaries, and pipeline runs, it includes team discovery, sprint membership, backlog levels and membership, work item type fields and states, and batched work item details with relations. `get_workflow_guidance` returns the same Scrum Master, refinement, or Jira bridge skill used by the Codex plugin.

For sprint requests, resolve the team and iteration, read `get_iteration_items`, then hydrate IDs with `get_work_items`. For grooming, discover backlog levels with `list_backlogs`, read `get_backlog_items`, and hydrate the IDs. `list_backlogs` includes the team's process field mappings, column fields, and mapped workflow states. `get_work_item_type` discovers custom field names and states.

Membership results are bounded pages of links with `nextOffset` and `totalRelations`. Links can repeat work item IDs and include parents. Deduplicate before reporting counts. Each batched read accepts at most 50 IDs and reports unavailable IDs in `missingIds`. Text fields longer than 8,000 characters are truncated and identified in `truncatedFields`; the legacy description summary remains capped at 4,000 characters. Live membership can change between pages.

A sprint briefing reports evidence, goal risks, and discussion points. A refinement worksheet includes linked items, observed gaps, draft acceptance criteria or splits, and team questions. Historical velocity, carry-over, and cycle-time trends require revision or analytics evidence beyond these current-state tools. The sign-in allowlist is for a single pilot user.

## Verify locally

Run `npm ci` and `npm test`. Tests exercise the HTTP authorization challenge, signed tokens, MCP tool discovery, and cross-organization routing with mocked Azure DevOps responses. A deployed smoke test requires the configured AuthKit user and live read PATs.

[WorkOS AuthKit MCP setup](https://workos.com/docs/authkit/mcp) · [ChatGPT MCP setup](https://developers.openai.com/plugins/quickstart) · [Azure DevOps PAT setup](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops)

## Follow synchronized Jira records

For a Jira reference or a cross-platform comparison, call `get_workflow_guidance` with `workflow: "jira-bridge"`. The guidance resolves the configured counterpart link and field ownership before comparing or proposing changes. Connect the Atlassian plugin or an existing Jira MCP server in the same client to read the Jira side. This connector supplies Azure DevOps reads and guidance.

Keep the sync mapping and cross-reference fields intact. Confirm the owning system before edits, let the sync tool propagate them, and identify unverified propagation. Treat incomplete references, missing Jira access, conflicting mappings, and differences in sprint or status semantics as unresolved evidence.

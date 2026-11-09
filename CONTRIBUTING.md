# Contributing

Contributions to the Azure DevOps plugin and private ChatGPT connector are welcome. For substantial changes, open an issue describing the problem and intended behavior before starting implementation.

## Get started

Fork the repository, create a branch from `main`, and keep each pull request focused on one change. Use Node.js 24 for the private connector. Its setup guide is in [chatgpt/README.md](chatgpt/README.md).

From the repository root, install dependencies and run the connector checks.

```sh
npm --prefix chatgpt ci
npm --prefix chatgpt test
git diff --check
```

Installer changes also need testing on the affected operating systems and clients. Check the Bash script with `bash -n scripts/install.sh`. Validate PowerShell changes with PowerShell and describe the version and operating system used. Test installers in an isolated environment, since they modify the current user's Codex or Claude Code configuration. For Claude Code, set `CLAUDE_CONFIG_DIR` to an empty directory and pass `--source` with your checkout.

## Plugin manifests

The plugin ships one skill set with two manifests: `plugins/azure-devops/plugin.json` for Codex and `plugins/azure-devops/.claude-plugin/plugin.json` for Claude Code. The Codex marketplace is `.agents/plugins/marketplace.json`; the Claude Code marketplace is `.claude-plugin/marketplace.json`. Keep the name, version, description, and keywords identical; `npm --prefix chatgpt test` checks this. Validate Claude Code changes with `claude plugin validate --strict plugins/azure-devops` and `claude plugin validate --strict .`.

## Skills and workflow guidance

Keep skills under `plugins/azure-devops/skills/<skill-name>/SKILL.md`. Give each skill a lowercase, hyphenated name and a description that explains the requests it handles.

Keep skill guidance concise and reuse the shared [Boards context](plugins/azure-devops/skills/azure-devops-workflow/references/boards-context.md). Resolve relative links within the plugin directory, since Codex distributes that directory as a package. The private connector reads these same files through its guidance tool.

Exercise a changed skill against a realistic example. Include incomplete data or ambiguity where relevant and describe the observed result in the pull request. Preserve the distinction between recorded evidence, assumptions, and proposals.

## Connector changes

Follow existing code style and reuse the organization routing and tool helpers. Keep the organization explicit when more than one connection could match. Preserve existing callers' behavior and expose pagination, missing data, and truncation.

Add or update tests for behavior changes, especially authorization, organization isolation, request validation, and Azure DevOps API handling. Use mocked responses for automated tests. Describe any live verification separately and obtain authorization before accessing someone else's organization.

Keep PATs, access tokens, and private organization data out of source files, fixtures, screenshots, logs, and pull requests. Use the host's secret manager for deployment credentials. Preserve the private connector's read-only behavior unless a write capability is explicitly agreed as part of the change.

If changing container packaging, build from the repository root.

```sh
docker build -f chatgpt/Dockerfile -t azure-devops-chatgpt .
```

## Submit a pull request

Explain the problem, resulting behavior, and validation performed. Identify any checks that remain pending and any setup or compatibility changes. Update the relevant documentation alongside the code.

Follow maintainer guidance for release version changes. Preserve the root `LICENSE` and the matching copy bundled in `plugins/azure-devops/LICENSE`.

By submitting a contribution, you agree that your contribution is provided under this repository's [MIT license](LICENSE). Include attribution and compatible license notices for any third-party material you add.

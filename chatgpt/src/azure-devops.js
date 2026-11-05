const azureOrigin = 'https://dev.azure.com';
export const organizationPattern = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/i;

export function readOrganizations(value) {
  let entries;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error();
    }
    entries = Object.entries(parsed);
  } catch {
    throw new Error('AZURE_DEVOPS_ORGANIZATIONS must be a JSON object mapping organization names to PATs.');
  }

  const organizations = new Map();
  for (const [name, pat] of entries) {
    const key = name.toLowerCase();
    if (!organizationPattern.test(name) || organizations.has(key) ||
        typeof pat !== 'string' || !pat || /\s/.test(pat)) {
      throw new Error('AZURE_DEVOPS_ORGANIZATIONS has an invalid organization or PAT.');
    }
    organizations.set(key, {
      name,
      authorization: 'Basic ' + Buffer.from(':' + pat).toString('base64'),
    });
  }
  if (!organizations.size) throw new Error('Configure at least one Azure DevOps organization.');
  return organizations;
}

export function createAzureDevOps(organizations, fetcher = fetch) {
  const names = [...organizations.values()].map(({ name }) => name);

  async function get(organization, path, query = {}, signal) {
    const selected = organization
      ? organizations.get(organization.toLowerCase())
      : organizations.size === 1 ? organizations.values().next().value : undefined;
    if (!selected) {
      return { error: organization
        ? 'That organization is not connected. Use list_organizations to see the available names.'
        : 'Specify an organization. Use list_organizations to see the available names.' };
    }

    const url = new URL(azureOrigin + '/' + selected.name + '/' + path);
    url.search = new URLSearchParams({ 'api-version': '7.1', ...query });
    try {
      const timeout = AbortSignal.timeout(15000);
      const response = await fetcher(url, {
        method: 'GET',
        redirect: 'error',
        headers: { Accept: 'application/json', Authorization: selected.authorization },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (!response.ok) {
        const details = {
          401: 'Check the configured PAT and its expiry.',
          403: 'Check the PAT scopes and Azure DevOps permissions.',
          404: 'Check the organization, project, and resource ID.',
          429: 'Azure DevOps rate limited the request. Try again later.',
        };
        return { error: 'Azure DevOps returned HTTP ' + response.status + '. ' + (details[response.status] ?? '') };
      }
      return {
        data: await response.json(),
        baseUrl: azureOrigin + '/' + selected.name,
        organization: selected.name,
        continuationToken: response.headers.get('x-ms-continuationtoken') ?? undefined,
      };
    } catch {
      return { error: 'Could not read Azure DevOps. Retry or check the server connection.' };
    }
  }

  return { get, names };
}

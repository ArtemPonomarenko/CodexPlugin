import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { generateKeyPair, SignJWT } from 'jose';
import { createAzureDevOps, readOrganizations } from '../src/azure-devops.js';
import { createConnector, readConfig } from '../src/main.js';

const config = readConfig({
  MCP_PUBLIC_URL: 'https://mcp.example.test/mcp',
  AUTHKIT_ISSUER: 'https://login.example.test',
  AUTHKIT_ALLOWED_USER_ID: 'pilot-user',
  AZURE_DEVOPS_ORGANIZATIONS: '{"Contoso":"test-a","Fabrikam":"test-b"}',
});
const { privateKey, publicKey } = await generateKeyPair('RS256');

async function bearer({ sub = config.subject, aud = config.resource.href, exp = '5m', iss = config.issuer } = {}) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'RS256' })
    .setSubject(sub).setIssuer(iss).setAudience(aud).setExpirationTime(exp).sign(privateKey);
  return 'Bearer ' + token;
}

async function start(t, fetcher) {
  const server = createConnector(config, { keys: publicKey, fetcher }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  });
  return 'http://127.0.0.1:' + server.address().port;
}

async function send(base, auth, method, params = {}, origin) {
  return fetch(base + '/mcp', {
    method: 'POST',
    headers: {
      ...(auth && { Authorization: auth }),
      ...(origin && { Origin: origin }),
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-11-25',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}

async function call(base, auth, name, args) {
  const response = await send(base, auth, 'tools/call', { name, arguments: args });
  assert.equal(response.status, 200);
  const { result, error } = await response.json();
  assert.ok(result, JSON.stringify(error));
  return { isError: result.isError, body: JSON.parse(result.content[0].text) };
}

test('challenges anonymous callers and rejects tokens with invalid claims', async t => {
  const base = await start(t, () => assert.fail('Unexpected Azure DevOps request'));
  const response = await send(base, undefined, 'tools/list');
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('www-authenticate'),
    'Bearer resource_metadata="https://mcp.example.test/.well-known/oauth-protected-resource/mcp"');
  const metadata = await fetch(base + '/.well-known/oauth-protected-resource/mcp');
  assert.deepEqual(await metadata.json(), {
    resource: config.resource.href,
    authorization_servers: [config.issuer],
    bearer_methods_supported: ['header'],
  });
  for (const claims of [{ aud: 'https://other.example.test' }, { exp: '1 second ago' }, { iss: 'https://other.example.test' }]) {
    assert.equal((await send(base, await bearer(claims), 'tools/list')).status, 401);
  }
  assert.equal((await send(base, await bearer({ sub: 'other-user' }), 'tools/list')).status, 403);
  assert.equal((await send(base, await bearer(), 'tools/list', {}, 'https://other.example.test')).status, 403);
});

test('MCP exposes only read tools and routes each concurrent request to its own organization and PAT', async t => {
  const seen = [];
  const base = await start(t, (url, request) => {
    seen.push([url.href, request]);
    if (url.pathname.endsWith('/_apis/projects')) {
      return Response.json({ value: [{ id: 'project-id', name: 'A Project', state: 'wellFormed' }] },
        { headers: { 'x-ms-continuationtoken': 'next' } });
    }
    if (url.pathname.endsWith('/_apis/git/pullrequests/42')) {
      return Response.json({ pullRequestId: 42, title: 'Fix', repository: { id: 'repo', project: { id: 'project' } } });
    }
    if (url.pathname.endsWith('/_apis/build/builds/42')) {
      return Response.json({ id: 42, status: 'completed', result: 'failed' });
    }
    return Response.json({ id: 42, fields: { 'System.Title': 'Task' } });
  });
  const auth = await bearer();
  const handshake = await send(base, auth, 'initialize', {
    protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' },
  });
  assert.equal(handshake.status, 200);
  assert.match((await handshake.json()).result.instructions, /ask the user/);
  const response = await send(base, auth, 'tools/list');
  const { result } = await response.json();
  assert.equal(result.tools.length, 5);
  assert.ok(result.tools.every(tool => tool.annotations.readOnlyHint));
  assert.deepEqual((await call(base, auth, 'list_organizations', {})).body.organizations, ['Contoso', 'Fabrikam']);
  assert.equal((await call(base, auth, 'get_work_item', { id: 42 })).isError, true);
  assert.equal((await call(base, auth, 'get_work_item', { id: 42, organization: 'unconnected' })).isError, true);
  assert.equal(seen.length, 0);

  const [item, projects, pr, run] = await Promise.all([
    call(base, auth, 'get_work_item', { id: 42, organization: 'contoso' }),
    call(base, auth, 'list_projects', { organization: 'Fabrikam', limit: 10, continuationToken: 'old' }),
    call(base, auth, 'get_pull_request', { id: 42, organization: 'Fabrikam' }),
    call(base, auth, 'get_pipeline_run', { id: 42, project: 'A Project', organization: 'Contoso' }),
  ]);
  assert.equal(item.body.organization, 'Contoso');
  assert.equal(projects.body.continuationToken, 'next');
  assert.equal(pr.body.url, 'https://dev.azure.com/Fabrikam/project/_git/repo/pullrequest/42');
  assert.equal(run.body.result, 'failed');
  assert.equal(seen.length, 4);
  const urls = seen.map(([href]) => href);
  assert.ok(urls.includes('https://dev.azure.com/Fabrikam/_apis/projects?api-version=7.1&%24top=10&continuationToken=old'));
  assert.ok(urls.includes('https://dev.azure.com/Contoso/A%20Project/_apis/build/builds/42?api-version=7.1'));
  for (const [href, request] of seen) {
    const pat = href.startsWith('https://dev.azure.com/Contoso/') ? 'test-a' : 'test-b';
    assert.equal(request.headers.Authorization, 'Basic ' + Buffer.from(':' + pat).toString('base64'));
    assert.equal(request.method, 'GET');
    assert.equal(request.redirect, 'error');
  }
});

test('one organization may be inferred and Azure error bodies are never forwarded', async () => {
  const azure = createAzureDevOps(readOrganizations('{"Contoso":"test-a"}'), url => {
    assert.match(url.href, /^https:\/\/dev\.azure\.com\/Contoso\//);
    return new Response('secret upstream response', { status: 401 });
  });
  const response = await azure.get(undefined, '_apis/projects');
  assert.match(response.error, /401/);
  assert.doesNotMatch(response.error, /secret upstream response/);
  assert.throws(() => readOrganizations('{"Contoso":"first","contoso":"second"}'), /invalid/);
});

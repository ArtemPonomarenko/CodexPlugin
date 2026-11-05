import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createAzureDevOps, readOrganizations } from './azure-devops.js';
import { createMcpServer } from './tools.js';

const mcpPath = '/mcp';
const metadataPath = '/.well-known/oauth-protected-resource';

function httpsUrl(value, expectedPath, label) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      url.pathname !== expectedPath) {
    throw new Error(label + ' must be an HTTPS URL with path ' + expectedPath + ' and no credentials or query.');
  }
  return url;
}

export function readConfig(env) {
  return {
    resource: httpsUrl(env.MCP_PUBLIC_URL, mcpPath, 'MCP_PUBLIC_URL'),
    issuer: httpsUrl(env.AUTHKIT_ISSUER, '/', 'AUTHKIT_ISSUER').origin,
    subject: env.AUTHKIT_ALLOWED_USER_ID?.trim(),
    organizations: readOrganizations(env.AZURE_DEVOPS_ORGANIZATIONS),
  };
}

export function createConnector(config, {
  keys = createRemoteJWKSet(new URL('/oauth2/jwks', config.issuer), { timeoutDuration: 5000 }),
  fetcher = fetch,
} = {}) {
  if (!config.subject) throw new Error('Set AUTHKIT_ALLOWED_USER_ID to the pilot user ID.');
  const azure = createAzureDevOps(config.organizations, fetcher);
  const resourceMetadata = new URL(metadataPath + mcpPath, config.resource).href;
  const challenge = 'Bearer resource_metadata="' + resourceMetadata + '"';

  function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(body));
  }

  return createServer(async (req, res) => {
    const path = req.url?.split('?')[0];
    if (req.method === 'GET' && path === '/healthz') {
      return send(res, 200, { status: 'ok' });
    }
    if (req.method === 'GET' && (path === metadataPath || path === metadataPath + mcpPath)) {
      return send(res, 200, {
        resource: config.resource.href,
        authorization_servers: [config.issuer],
        bearer_methods_supported: ['header'],
      });
    }
    if (path !== mcpPath) return send(res, 404, { error: 'Not found.' });

    res.setHeader('Cache-Control', 'no-store');
    if (req.headers.origin && ![config.resource.origin, 'https://chatgpt.com'].includes(req.headers.origin)) {
      return send(res, 403, { error: 'Origin is not allowed.' });
    }
    const token = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '')?.[1];
    if (!token) return send(res, 401, { error: 'Sign-in required.' }, { 'WWW-Authenticate': challenge });

    let payload;
    try {
      ({ payload } = await jwtVerify(token, keys, {
        issuer: config.issuer,
        audience: config.resource.href,
        algorithms: ['RS256'],
        requiredClaims: ['sub', 'exp'],
      }));
    } catch {
      return send(res, 401, { error: 'Sign-in required.' }, { 'WWW-Authenticate': challenge + ', error="invalid_token"' });
    }
    if (payload.sub !== config.subject) return send(res, 403, { error: 'This account is not enabled for the pilot.' });
    if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' }, { Allow: 'POST' });

    const mcp = createMcpServer(azure);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.once('close', () => { void mcp.close().catch(() => {}); });
    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) send(res, 500, { error: 'MCP request failed.' });
      else res.end();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  createConnector(readConfig(process.env)).listen(port, '0.0.0.0', () => {
    console.log('Azure DevOps MCP is listening on port ' + port);
  });
}

import { z } from 'zod';
import { organization, id, project, readOnly, result } from './tool-support.js';

const team = project.describe('Team name or ID within the selected project.');
const scope = { organization, project, team };
const paging = {
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(50).default(25),
};

function teamPath(input) {
  return encodeURIComponent(input.project) + '/' + encodeURIComponent(input.team) + '/_apis/work/';
}

export function workItemDetails(item, baseUrl) {
  const truncatedFields = [];
  const fields = Object.fromEntries(Object.entries(item.fields ?? {}).map(([name, value]) => {
    if (typeof value === 'string' && value.length > 8000) {
      truncatedFields.push(name);
      return [name, value.slice(0, 8000)];
    }
    return [name, value];
  }));
  return {
    id: item.id,
    revision: item.rev,
    title: fields['System.Title'],
    state: fields['System.State'],
    type: fields['System.WorkItemType'],
    project: fields['System.TeamProject'],
    description: typeof fields['System.Description'] === 'string'
      ? fields['System.Description'].slice(0, 4000) : undefined,
    fields,
    truncatedFields,
    relations: item.relations ?? [],
    url: baseUrl + '/_workitems/edit/' + item.id,
  };
}

function relationPage(response, relations, input) {
  const page = relations.slice(input.offset, input.offset + input.limit);
  const ids = [...new Set(page.flatMap(link => [link.source?.id, link.target?.id]).filter(Number.isInteger))];
  return result({
    organization: response.organization,
    project: input.project,
    team: input.team,
    relations: page,
    workItemIds: ids,
    totalRelations: relations.length,
    nextOffset: input.offset + page.length < relations.length ? input.offset + page.length : undefined,
    note: 'This page contains links, not work item details. Read the IDs with get_work_items. Membership can change between requests.',
  });
}

export function registerBoardsTools(mcp, azure) {
  mcp.registerTool('list_teams', {
    title: 'List Azure Boards teams',
    description: 'Discover teams in a project. A full page may have a subsequent page.',
    inputSchema: { organization, project, ...paging },
    annotations: readOnly,
  }, async (input, { signal }) => {
    const response = await azure.get(input.organization,
      '_apis/projects/' + encodeURIComponent(input.project) + '/teams',
      { $top: String(input.limit), $skip: String(input.offset) }, signal);
    if (response.error) return result(response);
    const teams = response.data.value.map(({ id, name, description }) => ({ id, name, description }));
    return result({
      organization: response.organization, project: input.project, teams,
      nextOffset: teams.length === input.limit ? input.offset + input.limit : undefined,
    });
  });

  mcp.registerTool('list_iterations', {
    title: 'List team iterations',
    description: 'Discover a team’s iteration IDs, paths, dates, and time frames. Use currentOnly to find the active sprint.',
    inputSchema: { ...scope, currentOnly: z.boolean().default(false) },
    annotations: readOnly,
  }, async (input, { signal }) => {
    const response = await azure.get(input.organization, teamPath(input) + 'teamsettings/iterations',
      input.currentOnly ? { $timeframe: 'current' } : {}, signal);
    if (response.error) return result(response);
    return result({
      organization: response.organization, project: input.project, team: input.team,
      iterations: response.data.value.map(({ id, name, path, attributes }) => ({ id, name, path, attributes })),
    });
  });

  mcp.registerTool('list_backlogs', {
    title: 'Discover team backlog levels',
    description: 'Discover the team’s backlog IDs, participating work item types, and field mappings. Use these IDs without assuming Agile or Scrum defaults.',
    inputSchema: scope,
    annotations: readOnly,
  }, async (input, { signal }) => {
    const response = await azure.get(input.organization, teamPath(input) + 'backlogconfiguration', {}, signal);
    if (response.error) return result(response);
    return result({
      organization: response.organization, project: input.project, team: input.team,
      typeFields: response.data.typeFields,
      workItemTypeMappedStates: response.data.workItemTypeMappedStates,
      backlogs: [response.data.requirementBacklog, response.data.taskBacklog, ...(response.data.portfolioBacklogs ?? [])]
        .filter(Boolean)
        .map(({ id, name, rank, type, workItemTypes, defaultWorkItemType, columnFields, workItemCountLimit }) =>
          ({ id, name, rank, type, workItemTypes, defaultWorkItemType, columnFields, workItemCountLimit })),
    });
  });

  mcp.registerTool('get_backlog_items', {
    title: 'Read team backlog membership',
    description: 'Read a bounded page of a discovered backlog’s links and work item IDs. Hydrate the IDs with get_work_items. Link order alone does not establish product priority.',
    inputSchema: { ...scope, backlogId: project, ...paging },
    annotations: readOnly,
  }, async (input, { signal }) => {
    const response = await azure.get(input.organization,
      teamPath(input) + 'backlogs/' + encodeURIComponent(input.backlogId) + '/workItems', {}, signal);
    if (response.error) return result(response);
    return relationPage(response, response.data.workItems, input);
  });

  mcp.registerTool('get_iteration_items', {
    title: 'Read sprint membership',
    description: 'Read a bounded page of an iteration’s work item links and IDs, scoped to the team. Hydrate them with get_work_items.',
    inputSchema: { ...scope, iterationId: z.uuid(), ...paging },
    annotations: readOnly,
  }, async (input, { signal }) => {
    const response = await azure.get(input.organization,
      teamPath(input) + 'teamsettings/iterations/' + input.iterationId + '/workitems', {}, signal);
    if (response.error) return result(response);
    return relationPage(response, response.data.workItemRelations, input);
  });

  mcp.registerTool('get_work_item_type', {
    title: 'Discover a work item type’s fields and states',
    description: 'Read project-specific field references and state categories for a work item type discovered from a backlog or item.',
    inputSchema: { organization, project, type: project },
    annotations: readOnly,
  }, async (input, { signal }) => {
    const response = await azure.get(input.organization,
      encodeURIComponent(input.project) + '/_apis/wit/workitemtypes/' + encodeURIComponent(input.type), {}, signal);
    if (response.error) return result(response);
    return result({
      organization: response.organization, project: input.project,
      name: response.data.name,
      fields: response.data.fields.map(({ name, referenceName, alwaysRequired, defaultValue }) =>
        ({ name, referenceName, alwaysRequired, defaultValue })),
      states: response.data.states,
    });
  });

  mcp.registerTool('get_work_items', {
    title: 'Read work item details and relations',
    description: 'Read up to 50 work items in one organization, including custom fields, acceptance criteria, estimates, and parent/dependency links. Returned text may be truncated as indicated.',
    inputSchema: { organization, ids: z.array(id).min(1).max(50) },
    annotations: readOnly,
  }, async (input, { signal }) => {
    const ids = [...new Set(input.ids)];
    const response = await azure.get(input.organization, '_apis/wit/workitems',
      { ids: ids.join(','), $expand: 'Relations', errorPolicy: 'Omit' }, signal);
    if (response.error) return result(response);
    const items = response.data.value.map(item => workItemDetails(item, response.baseUrl));
    const returned = new Set(items.map(item => item.id));
    return result({
      organization: response.organization,
      items,
      missingIds: ids.filter(itemId => !returned.has(itemId)),
    });
  });
}

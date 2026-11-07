import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { readOnly, result } from './tool-support.js';

const skillsRoot = new URL('../../plugins/azure-devops/skills/', import.meta.url);
const sharedContext = readFileSync(new URL('azure-devops-workflow/references/boards-context.md', skillsRoot), 'utf8');
const guidance = {
  'scrum-master': readFileSync(new URL('azure-devops-scrum-master/SKILL.md', skillsRoot), 'utf8'),
  'backlog-refinement': readFileSync(new URL('azure-devops-backlog-refinement/SKILL.md', skillsRoot), 'utf8'),
};

export function registerWorkflowGuidance(mcp) {
  mcp.registerTool('get_workflow_guidance', {
    title: 'Read Scrum or refinement workflow guidance',
    description: 'Read the plugin skill and shared Boards context before preparing a sprint briefing, Scrum event, or backlog refinement worksheet.',
    inputSchema: { workflow: z.enum(['scrum-master', 'backlog-refinement']) },
    annotations: { ...readOnly, openWorldHint: false },
  }, ({ workflow }) => result({ workflow, instructions: guidance[workflow], boardsContext: sharedContext }));
}

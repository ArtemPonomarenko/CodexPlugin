import { z } from 'zod';
import { organizationPattern } from './azure-devops.js';

export const organization = z.string().trim().regex(organizationPattern).optional()
  .describe('Connected organization from the user or the Azure DevOps URL. Required when multiple organizations are connected.');
export const id = z.number().int().min(1).max(2147483647);
export const project = z.string().trim().min(1).max(128)
  .refine(value => value !== '.' && value !== '..' && !/[\/\\]/.test(value), 'Enter a project name or ID.');
export const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function result(value) {
  return {
    ...(value.error && { isError: true }),
    content: [{ type: 'text', text: JSON.stringify(value) }],
  };
}

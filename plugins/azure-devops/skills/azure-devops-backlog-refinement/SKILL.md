---
name: azure-devops-backlog-refinement
description: Prepare Azure Boards backlog refinement or grooming. Use to review stories, product backlog items, bugs, or requirements for clarity, acceptance criteria, dependencies, possible duplication, useful splits, and questions for the Product Owner and Developers.
---

# Backlog refinement

Read [Azure Boards context](../azure-devops-workflow/references/boards-context.md) before fetching work. Follow its organization selection, process discovery, evidence, and edit rules.

For synchronized Jira counterparts, use the [Jira bridge](../azure-devops-jira-bridge/SKILL.md) to resolve identity and edit ownership before refining or grouping items.

Resolve the intended backlog level and item selection. For "the next ten items," establish the team's ordering field or use an ordering supplied by the user. Follow parent links when needed to understand the product outcome.

For each selected item:

1. Identify the intended beneficiary, outcome, scope, and business context. Preserve the intent of bug reports and requirements when a user-story format would lose information.
2. Review the description and actual acceptance-criteria field. Separate missing information from unclear or contradictory information. Treat the team's readiness checklist as guidance and record questions where no checklist exists.
3. Draft observable acceptance criteria grounded in the supplied requirements. Include relevant failure cases suggested by those requirements. Label assumptions and proposed behavior for confirmation. When the supplied behavior is too sparse, ask targeted questions and leave replacement criteria pending.
4. Suggest smaller slices when the item spans several independent outcomes or unresolved decisions. Describe the value and acceptance criteria of each proposed slice and retain parent traceability.
5. Read the linked dependencies and note decisions needed before planning. Flag possible duplicates with links and the reason for similarity. Assess duplication only within the inspected scope.
6. Prepare sizing questions for the Developers. Preserve existing estimates and flag their uncertainty when appropriate. Ask the Product Owner to confirm ordering and trade-offs.

Return a refinement worksheet with item links, observed gaps, proposed improvements or slices, dependencies, and open questions. For each proposed change, show the existing text or value and the draft replacement. Include the scope reviewed and evidence limitations. Summarize decisions needed for the refinement session.

Keep drafts in the response until the user requests supported edits. When asked to apply a proposal, apply only the requested changes and report the resulting work item links and revisions.

Example requests include "Prepare the next ten backlog items for grooming" and "Suggest acceptance criteria and smaller slices for these stories."

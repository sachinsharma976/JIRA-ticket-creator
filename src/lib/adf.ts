import "server-only";
import type { TicketDraft } from "@/lib/types";

// Builds a Jira Atlassian Document Format (ADF) document for the issue
// description field: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
export function draftToAdf(draft: TicketDraft) {
  const heading = (text: string) => ({
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text }],
  });

  const paragraph = (text: string) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  });

  const acceptanceCriteriaList = {
    type: "bulletList",
    content: draft.acceptanceCriteria.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };

  return {
    type: "doc",
    version: 1,
    content: [
      heading("Problem"),
      paragraph(draft.description.problem),
      heading("Scope"),
      paragraph(draft.description.scope),
      heading("Acceptance Criteria"),
      acceptanceCriteriaList,
    ],
  };
}

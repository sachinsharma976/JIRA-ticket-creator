import "server-only";
import { env } from "@/lib/env";
import { draftToAdf } from "@/lib/adf";
import type { AssignableUser, IssueType, TicketDraft } from "@/lib/types";

export class JiraError extends Error {
  constructor(message: string, readonly status?: number, readonly details?: unknown) {
    super(message);
    this.name = "JiraError";
  }
}

const authHeader = `Basic ${Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64")}`;

async function jiraFetch(path: string, init: RequestInit = {}) {
  // When the body is FormData, fetch must set its own multipart Content-Type
  // (with the boundary) — setting it manually here would break the upload.
  const isFormData = init.body instanceof FormData;

  const res = await fetch(`${env.JIRA_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      details = await res.text().catch(() => undefined);
    }

    if (res.status === 401 || res.status === 403) {
      throw new JiraError("Jira authentication failed. Check JIRA_EMAIL and JIRA_API_TOKEN.", res.status, details);
    }
    throw new JiraError(`Jira request to ${path} failed with status ${res.status}.`, res.status, details);
  }

  if (res.status === 204) return undefined;
  return res.json();
}

interface ActiveSprint {
  id: number;
  name: string;
}

export async function getActiveSprint(): Promise<ActiveSprint> {
  const data = (await jiraFetch(
    `/rest/agile/1.0/board/${env.JIRA_BOARD_ID}/sprint?state=active`,
  )) as { values?: ActiveSprint[] };

  const sprint = data.values?.[0];
  if (!sprint) {
    throw new JiraError(
      `No active sprint found on board ${env.JIRA_BOARD_ID}. Start a sprint in Jira before creating tickets.`,
    );
  }
  return sprint;
}

interface JiraUserResult {
  accountId: string;
  displayName: string;
  avatarUrls?: Record<string, string>;
}

export async function getAssignableUsers(query?: string): Promise<AssignableUser[]> {
  const params = new URLSearchParams({ project: env.JIRA_PROJECT_KEY, maxResults: "50" });
  if (query) params.set("query", query);

  const data = (await jiraFetch(
    `/rest/api/3/user/assignable/search?${params.toString()}`,
  )) as JiraUserResult[];

  return data.map((u) => ({
    accountId: u.accountId,
    displayName: u.displayName,
    avatarUrl: u.avatarUrls?.["32x32"],
  }));
}

interface CreateMetaField {
  key: string;
  name: string;
}

// Field keys for custom fields (like "Start date") are assigned per Jira
// site and aren't stable across instances, so they're looked up by display
// name via create-issue metadata rather than hardcoded. Cached per issue
// type for the life of the process — this schema rarely changes, and a
// restart picks up any changes made in Jira's field configuration.
const createMetaFieldsCache = new Map<IssueType, Record<string, CreateMetaField>>();

async function getCreateMetaFields(issueType: IssueType): Promise<Record<string, CreateMetaField>> {
  const cached = createMetaFieldsCache.get(issueType);
  if (cached) return cached;

  const params = new URLSearchParams({
    projectKeys: env.JIRA_PROJECT_KEY,
    issuetypeNames: issueType,
    expand: "projects.issuetypes.fields",
  });
  const data = (await jiraFetch(`/rest/api/3/issue/createmeta?${params.toString()}`)) as {
    projects?: { issuetypes?: { fields?: Record<string, CreateMetaField> }[] }[];
  };

  const fields = data.projects?.[0]?.issuetypes?.[0]?.fields ?? {};
  createMetaFieldsCache.set(issueType, fields);
  return fields;
}

async function findFieldKeyByName(issueType: IssueType, fieldName: string): Promise<string | undefined> {
  const fields = await getCreateMetaFields(issueType);
  const match = Object.values(fields).find((f) => f.name.toLowerCase() === fieldName.toLowerCase());
  return match?.key;
}

interface CreateIssueOptions {
  assigneeAccountId?: string;
  startDate: string;
  dueDate?: string;
}

async function createIssue(
  draft: TicketDraft,
  issueType: IssueType,
  options: CreateIssueOptions,
): Promise<{ key: string; id: string }> {
  const fields: Record<string, unknown> = {
    project: { key: env.JIRA_PROJECT_KEY },
    summary: draft.title,
    description: draftToAdf(draft),
    issuetype: { name: issueType },
  };

  if (options.assigneeAccountId) {
    fields.assignee = { id: options.assigneeAccountId };
  }
  if (options.dueDate) {
    fields.duedate = options.dueDate;
  }

  // "Start date" isn't a standard field and isn't guaranteed to exist on
  // every project's create screen — skip it silently rather than failing
  // the whole ticket creation if it's missing.
  const startDateFieldKey = await findFieldKeyByName(issueType, "Start date");
  if (startDateFieldKey) {
    fields[startDateFieldKey] = options.startDate;
  }

  const data = (await jiraFetch("/rest/api/3/issue", {
    method: "POST",
    body: JSON.stringify({ fields }),
  })) as { key: string; id: string };

  return data;
}

export async function uploadAttachment(
  issueKey: string,
  file: File,
): Promise<{ id: string; filename: string }> {
  const body = new FormData();
  body.append("file", file, file.name);

  const data = (await jiraFetch(`/rest/api/3/issue/${issueKey}/attachments`, {
    method: "POST",
    // Required by Jira to bypass XSRF protection on this specific endpoint.
    headers: { "X-Atlassian-Token": "no-check" },
    body,
  })) as { id: string; filename: string }[];

  return data[0];
}

async function moveIssueToSprint(sprintId: number, issueKey: string): Promise<void> {
  await jiraFetch(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
    method: "POST",
    body: JSON.stringify({ issues: [issueKey] }),
  });
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createTicketInActiveSprint(
  draft: TicketDraft,
  issueType: IssueType,
  options: { assigneeAccountId?: string; dueDate?: string } = {},
): Promise<{ jiraKey: string; jiraUrl: string; startDate: string }> {
  // Resolve the sprint first so we never create an orphaned backlog issue
  // when there's no active sprint to put it in.
  const sprint = await getActiveSprint();
  const startDate = todayUtc();

  const issue = await createIssue(draft, issueType, {
    assigneeAccountId: options.assigneeAccountId,
    dueDate: options.dueDate,
    startDate,
  });
  await moveIssueToSprint(sprint.id, issue.key);

  return {
    jiraKey: issue.key,
    jiraUrl: `${env.JIRA_BASE_URL}/browse/${issue.key}`,
    startDate,
  };
}

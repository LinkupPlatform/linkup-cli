import type { Command } from 'commander';
import type {
  LinkupClient,
  ListResearchParams,
  ListTasksParams,
  ResearchParams,
  SearchParams,
} from 'linkup-sdk';
import type { Mock } from 'vitest';
import * as clientModule from '../../client.js';

type MockedFn<TArgs extends unknown[], TResult> = Mock<(...args: TArgs) => TResult>;

type FakeClient = {
  search: MockedFn<[SearchParams], Promise<unknown>>;
  fetch: MockedFn<[Record<string, unknown>], Promise<unknown>>;
  research: MockedFn<[ResearchParams], Promise<unknown>>;
  getResearch: MockedFn<[string], Promise<unknown>>;
  listResearch: MockedFn<[ListResearchParams?], Promise<unknown>>;
  createTasks: MockedFn<[unknown[]], Promise<unknown[]>>;
  getTask: MockedFn<[string], Promise<unknown>>;
  listTasks: MockedFn<[ListTasksParams?], Promise<unknown>>;
};

export function createFakeClient(): FakeClient {
  return {
    createTasks: vi.fn(),
    fetch: vi.fn(),
    getResearch: vi.fn(),
    getTask: vi.fn(),
    listResearch: vi.fn(),
    listTasks: vi.fn(),
    research: vi.fn(),
    search: vi.fn(),
  };
}

function asLinkupClient(client: FakeClient): LinkupClient {
  return client as unknown as LinkupClient;
}

export function mockGlobals(fakeClient: FakeClient): void {
  vi.spyOn(clientModule, 'resolveGlobals').mockImplementation((command: Command) => ({
    client: asLinkupClient(fakeClient),
    json: Boolean(command.optsWithGlobals<{ json?: boolean }>().json),
  }));
}

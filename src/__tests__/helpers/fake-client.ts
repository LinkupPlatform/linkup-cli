import type { Command } from 'commander';
import type {
  LinkupClient,
  ListResearchParams,
  ListTasksParams,
  ResearchParams,
  SearchParams,
} from 'linkup-sdk';
import * as clientModule from '../../client';

type MockedFn<TArgs extends unknown[], TResult> = jest.Mock<TResult, TArgs>;

export type FakeClient = {
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
    createTasks: jest.fn(),
    fetch: jest.fn(),
    getResearch: jest.fn(),
    getTask: jest.fn(),
    listResearch: jest.fn(),
    listTasks: jest.fn(),
    research: jest.fn(),
    search: jest.fn(),
  };
}

export function asLinkupClient(client: FakeClient): LinkupClient {
  return client as unknown as LinkupClient;
}

export function mockGlobals(fakeClient: FakeClient): void {
  jest.spyOn(clientModule, 'resolveGlobals').mockImplementation((command: Command) => ({
    client: asLinkupClient(fakeClient),
    json: Boolean(command.optsWithGlobals<{ json?: boolean }>().json),
  }));
}

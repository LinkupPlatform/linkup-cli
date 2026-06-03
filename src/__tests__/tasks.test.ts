import {
  buildListTasksParams,
  parseTaskRequests,
  parseTaskStatusList,
  parseTaskTypeList,
} from '../commands/tasks';

describe('parseTaskRequests', () => {
  it('accepts a single task request object', () => {
    expect(
      parseTaskRequests(
        JSON.stringify({
          input: { outputType: 'sourcedAnswer', query: 'q' },
          type: 'search',
        }),
      ),
    ).toEqual([{ input: { outputType: 'sourcedAnswer', query: 'q' }, type: 'search' }]);
  });

  it('accepts an array of task requests', () => {
    expect(
      parseTaskRequests(
        JSON.stringify([
          { input: { url: 'https://example.com' }, type: 'fetch' },
          { input: { outputType: 'sourcedAnswer', query: 'q' }, type: 'research' },
        ]),
      ),
    ).toHaveLength(2);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseTaskRequests('{nope')).toThrow('Could not parse tasks JSON');
  });

  it('rejects invalid task types', () => {
    expect(() => parseTaskRequests(JSON.stringify({ input: {}, type: 'crawl' }))).toThrow(
      'type "search", "fetch", or "research"',
    );
  });

  it('rejects requests without an input object', () => {
    expect(() => parseTaskRequests(JSON.stringify({ type: 'search' }))).toThrow('input object');
  });
});

describe('task list parsers', () => {
  it('parses comma-separated statuses', () => {
    expect(parseTaskStatusList('pending,processing')).toEqual(['pending', 'processing']);
  });

  it('parses comma-separated task types', () => {
    expect(parseTaskTypeList('search,research')).toEqual(['search', 'research']);
  });

  it('rejects invalid statuses', () => {
    expect(() => parseTaskStatusList('queued')).toThrow('invalid status');
  });

  it('rejects invalid types', () => {
    expect(() => parseTaskTypeList('crawl')).toThrow('invalid type');
  });
});

describe('buildListTasksParams', () => {
  it('omits undefined fields', () => {
    expect(buildListTasksParams({})).toEqual({});
  });

  it('maps pagination, sorting, and filters', () => {
    expect(
      buildListTasksParams({
        page: 2,
        pageSize: 25,
        sortBy: 'updatedAt',
        sortDirection: 'asc',
        status: ['pending', 'processing'],
        type: ['search', 'research'],
      }),
    ).toEqual({
      page: 2,
      pageSize: 25,
      sortBy: 'updatedAt',
      sortDirection: 'asc',
      status: ['pending', 'processing'],
      type: ['search', 'research'],
    });
  });
});

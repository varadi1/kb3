// Mock for kb3 module
const mockOrchestrator = {
  processUrl: jest.fn().mockResolvedValue({
    url: 'test',
    status: 'completed',
    content: 'test content'
  }),
  processUrlBatch: jest.fn().mockResolvedValue([]),
  getUrlRepository: jest.fn().mockReturnValue({
    getAll: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    add: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    findByTags: jest.fn().mockResolvedValue([]),
    addTags: jest.fn().mockResolvedValue(true),
    removeTags: jest.fn().mockResolvedValue(true)
  }),
  getTagRepository: jest.fn().mockReturnValue({
    getAll: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true)
  }),
  getKnowledgeStore: jest.fn().mockReturnValue({
    add: jest.fn().mockResolvedValue('id'),
    get: jest.fn().mockResolvedValue(null),
    search: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    getStats: jest.fn().mockResolvedValue({
      totalEntries: 0,
      totalSize: 0,
      averageSize: 0
    })
  }),
  getProcessedFileStorage: jest.fn().mockReturnValue({
    getAll: jest.fn().mockResolvedValue([]),
    getByUrl: jest.fn().mockResolvedValue(null),
    getByHash: jest.fn().mockResolvedValue(null)
  }),
  getContentFetcher: jest.fn().mockReturnValue({
    setUrlParameters: jest.fn()
  }),
  getConfigManager: jest.fn().mockReturnValue({
    getCleaners: jest.fn().mockResolvedValue([]),
    addCleaner: jest.fn(),
    removeCleaner: jest.fn()
  })
};

const KnowledgeBaseFactory = {
  createKnowledgeBase: jest.fn().mockReturnValue(mockOrchestrator)
};

const createSqlConfiguration = jest.fn((config) => config);
const createUnifiedConfiguration = jest.fn((config) => config);

module.exports = {
  KnowledgeBaseFactory,
  createSqlConfiguration,
  createUnifiedConfiguration,
  IKnowledgeBaseOrchestrator: {},
  ProcessingResult: {},
  ITag: {},
  IConfiguration: {}
};
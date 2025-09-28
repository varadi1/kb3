/**
 * Central export for factory components
 * All factories now consolidated into KnowledgeBaseFactory
 */

export {
  KnowledgeBaseFactory,
  // Backward compatibility exports
  KnowledgeBaseFactoryWithTags,
  KnowledgeBaseFactoryWithFileTracking,
  // Type exports
  KnowledgeBaseConfigExtended,
  KnowledgeBaseConfigWithTags,
  KnowledgeBaseConfigWithFileTracking,
  KnowledgeBaseWithFullFeatures,
  KnowledgeBaseWithFileTracking
} from './KnowledgeBaseFactory';
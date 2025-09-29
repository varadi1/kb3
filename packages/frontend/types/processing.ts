export interface ProcessingItem {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress?: number;
}

export interface ProcessingQueueStatus {
  isProcessing: boolean;
  queue: ProcessingItem[];
  stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}
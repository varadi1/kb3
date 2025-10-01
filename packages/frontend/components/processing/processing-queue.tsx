'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useKb3Store } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'
import { ProcessingItem } from '@/types/processing'
import {
  Play,
  Pause,
  RotateCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  X,
} from 'lucide-react'

// Helper function to safely count items by status
function safeCountByStatus(items: unknown, status: string): number {
  try {
    // Ensure items is an array
    if (!Array.isArray(items)) {
      console.warn('safeCountByStatus: items is not an array', typeof items)
      return 0
    }

    // Filter and count with extra safety checks
    const filtered = items.filter((item) => {
      // Ensure item is an object and not null
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return false
      }
      // Check status property
      return item.status === status
    })

    // Ensure we have a valid array with a numeric length
    const count = filtered?.length ?? 0

    // Extra safety: ensure count is a number
    if (typeof count !== 'number' || isNaN(count)) {
      console.warn('safeCountByStatus: count is not a valid number', count)
      return 0
    }

    return count
  } catch (error) {
    console.error('safeCountByStatus error:', error)
    return 0
  }
}

export function ProcessingQueue() {
  const [queue, setQueue] = useState<ProcessingItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  })

  const { fetchQueue, fetchStats, startProcessing, stopProcessing, retryItem, clearCompleted } = useKb3Store()
  const { toast } = useToast()

  useEffect(() => {
    loadQueueData()
    const interval = setInterval(loadQueueData, 2000) // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [])

  const loadQueueData = async () => {
    try {
      // Fetch both queue items and statistics
      const [items, stats] = await Promise.all([
        fetchQueue(),
        fetchStats()
      ])
      
      // Ensure items is an array and filter out any non-object items
      const validItems = Array.isArray(items)
        ? items.filter(item =>
            item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            typeof item.id === 'string' &&
            typeof item.url === 'string'
          )
        : []
      setQueue(validItems)
      setIsProcessing(validItems.some(item => item?.status === 'processing'))
      
      // Update queue stats from the API response
      if (stats) {
        setQueueStats({
          pending: stats.pending || 0,
          processing: stats.processing || 0,
          completed: stats.completed || 0,
          failed: stats.failed || 0
        })
      }
    } catch (error) {
      console.error('Failed to load queue data:', error)
      setQueue([]) // Always set to array on error
    }
  }

  const handleStartProcessing = async () => {
    try {
      await startProcessing()
      setIsProcessing(true)
      toast({
        title: 'Processing started',
        description: 'Queue processing has been started',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start processing',
        variant: 'destructive',
      })
    }
  }

  const handleStopProcessing = async () => {
    try {
      await stopProcessing()
      setIsProcessing(false)
      toast({
        title: 'Processing stopped',
        description: 'Queue processing has been stopped',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop processing',
        variant: 'destructive',
      })
    }
  }

  const handleRetry = async (id: string) => {
    try {
      await retryItem(id)
      await loadQueueData()
      toast({
        title: 'Retry scheduled',
        description: 'Item has been queued for retry',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retry item',
        variant: 'destructive',
      })
    }
  }

  const handleClearCompleted = async () => {
    try {
      await clearCompleted()
      await loadQueueData()
      toast({
        title: 'Cleared',
        description: 'Completed items have been cleared',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear completed items',
        variant: 'destructive',
      })
    }
  }

  const getStatusIcon = (status: ProcessingItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null // Always return something, never undefined
    }
  }

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime()
    const endTime = end ? new Date(end).getTime() : Date.now()
    const duration = Math.floor((endTime - startTime) / 1000)

    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {isProcessing ? (
            <Button onClick={handleStopProcessing} variant="secondary">
              <Pause className="mr-2 h-4 w-4" />
              Stop Processing
            </Button>
          ) : (
            <Button onClick={handleStartProcessing}>
              <Play className="mr-2 h-4 w-4" />
              Start Processing
            </Button>
          )}

          <Button
            onClick={handleClearCompleted}
            variant="outline"
            disabled={queueStats.completed === 0}
          >
            Clear Completed
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {String(queueStats.pending)} pending,{' '}
          {String(queueStats.processing)} processing,{' '}
          {String(queueStats.completed)} completed,{' '}
          {String(queueStats.failed)} failed
        </div>
      </div>

      <div className="border rounded-md">
        {queue.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No items in the processing queue
          </div>
        ) : (
          <div className="divide-y">
            {queue.map((item) => {
              // Ensure item is valid before rendering
              if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return null
              }
              return (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-accent/50"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="font-medium text-sm truncate max-w-md">
                      {item.url}
                    </div>
                    {item.error && (
                      <div className="text-xs text-red-500 mt-1">
                        {typeof item.error === 'string'
                          ? item.error
                          : 'Processing failed'}
                      </div>
                    )}
                    {item.startedAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.status === 'processing'
                          ? `Processing for ${String(formatDuration(item.startedAt))}`
                          : item.completedAt
                          ? `Completed in ${String(formatDuration(item.startedAt, item.completedAt))}`
                          : ''}
                      </div>
                    )}
                  </div>
                  {item.progress !== undefined && item.status === 'processing' && (
                    <div className="w-32">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-center mt-1">{item.progress}%</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(item.id)}
                    >
                      <RotateCw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
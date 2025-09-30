'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useToast } from '@/components/ui/use-toast'
import { useKb3Store } from '@/lib/store'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()
  const { updateProcessingTask, fetchUrls, fetchStats } = useKb3Store()

  useEffect(() => {
    const socketInstance = io('http://localhost:4000', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to WebSocket server')
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from WebSocket server')
    })

    // Handle processing events
    socketInstance.on('processing:started', (data) => {
      // Ensure we have a valid URL string
      const url = typeof data.url === 'string' ? data.url : 'Unknown URL'

      updateProcessingTask({
        id: url,
        url: url,
        status: 'processing',
        progress: 0,
        startedAt: new Date().toISOString()
      })

      toast({
        title: 'Processing Started',
        description: `Processing URL: ${url}`,
      })
    })

    socketInstance.on('processing:progress', (data) => {
      updateProcessingTask({
        id: data.url,
        url: data.url,
        status: 'processing',
        progress: data.progress || 50,
        message: data.message
      })
    })

    socketInstance.on('processing:completed', (data) => {
      // Ensure we have a valid URL string
      const url = typeof data.url === 'string' ? data.url :
                  (data.result && typeof data.result.url === 'string' ? data.result.url : 'Unknown URL')

      updateProcessingTask({
        id: url,
        url: url,
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString()
      })

      toast({
        title: 'Processing Completed',
        description: `Successfully processed: ${url}`,
      })

      // Refresh URLs list
      fetchUrls()
    })

    socketInstance.on('processing:failed', (data) => {
      // Ensure we have a valid URL string and error message
      const url = typeof data.url === 'string' ? data.url : 'Unknown URL'
      const errorMessage = typeof data.error?.message === 'string' ? data.error.message : 'Processing failed'

      updateProcessingTask({
        id: url,
        url: url,
        status: 'failed',
        progress: 0,
        message: errorMessage
      })

      toast({
        title: 'Processing Failed',
        description: errorMessage || `Failed to process: ${url}`,
        variant: 'destructive',
      })
    })

    // Handle batch events
    socketInstance.on('batch:completed', (data) => {
      toast({
        title: 'Batch Processing Completed',
        description: `Processed ${data.count} URLs. Success: ${data.results.filter((r: any) => r.success).length}, Failed: ${data.results.filter((r: any) => !r.success).length}`,
      })

      fetchUrls()
    })

    // Handle URL events
    socketInstance.on('url:added', () => {
      fetchUrls()
    })

    socketInstance.on('urls:added', (data) => {
      toast({
        title: 'URLs Added',
        description: `Added ${data.count} URLs to the knowledge base`,
      })
      fetchUrls()
    })

    // Handle tag events
    socketInstance.on('tag:created', (data) => {
      toast({
        title: 'Tag Created',
        description: `Tag "${data.name}" has been created`,
      })
    })

    socketInstance.on('tag:updated', (data) => {
      toast({
        title: 'Tag Updated',
        description: `Tag has been updated`,
      })
    })

    socketInstance.on('tag:deleted', () => {
      toast({
        title: 'Tag Deleted',
        description: `Tag has been deleted`,
      })
    })

    // Handle stats updates
    socketInstance.on('stats:update', (stats) => {
      fetchStats()
    })

    // Handle errors
    socketInstance.on('error', (error) => {
      // Ensure error message is a string
      const errorMessage = typeof error?.message === 'string' ? error.message :
                          typeof error === 'string' ? error :
                          'An error occurred'

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    })

    setSocket(socketInstance)

    return () => {
      // CRITICAL: Remove all event listeners to prevent memory leak
      socketInstance.off('connect')
      socketInstance.off('disconnect')
      socketInstance.off('processing:started')
      socketInstance.off('processing:progress')
      socketInstance.off('processing:completed')
      socketInstance.off('processing:failed')
      socketInstance.off('url:added')
      socketInstance.off('urls:batch-added')
      socketInstance.off('stats:updated')
      socketInstance.disconnect()
    }
  }, [toast, updateProcessingTask, fetchUrls, fetchStats])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  // Return a default value instead of throwing an error during SSR/hydration
  // This prevents React rendering errors when the context isn't available yet
  if (!context) {
    return { socket: null, isConnected: false }
  }
  return context
}
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
      updateProcessingTask({
        id: data.url,
        url: data.url,
        status: 'processing',
        progress: 0,
        startedAt: new Date().toISOString()
      })

      toast({
        title: 'Processing Started',
        description: `Processing URL: ${data.url}`,
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
      updateProcessingTask({
        id: data.url,
        url: data.url,
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString()
      })

      toast({
        title: 'Processing Completed',
        description: `Successfully processed: ${data.url}`,
      })

      // Refresh URLs list
      fetchUrls()
    })

    socketInstance.on('processing:failed', (data) => {
      updateProcessingTask({
        id: data.url,
        url: data.url,
        status: 'failed',
        progress: 0,
        message: data.error?.message || 'Processing failed'
      })

      toast({
        title: 'Processing Failed',
        description: data.error?.message || `Failed to process: ${data.url}`,
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
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    })

    setSocket(socketInstance)

    return () => {
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
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
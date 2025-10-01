'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
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

  // Track last time we showed a toast for an event to prevent spam (2s dedupe window)
  const shownEventsRef = useRef<Map<string, number>>(new Map())
  const shouldToast = (key: string, ttlMs = 2000) => {
    const now = Date.now()
    const last = shownEventsRef.current.get(key) || 0
    if (now - last < ttlMs) return false
    shownEventsRef.current.set(key, now)
    return true
  }

  useEffect(() => {
    // Avoid creating multiple socket connections
    if (socket) return

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
      const url = typeof data?.url === 'string' ? data.url :
                  (data && typeof data === 'object' && 'url' in data) ? String(data.url) : 'Unknown URL'

      updateProcessingTask({
        id: url,
        url: url,
        status: 'processing',
        progress: 0,
        startedAt: new Date().toISOString()
      })

      if (shouldToast(`started:${url}`)) {
        toast({
          title: 'Processing Started',
          description: `Processing URL: ${url}`,
        })
      }
    })

    socketInstance.on('processing:progress', (data) => {
      const url = typeof data?.url === 'string' ? data.url : 'Unknown URL'
      const progress = typeof data?.progress === 'number' ? data.progress : 50
      const message = typeof data?.message === 'string' ? data.message :
                      data?.message ? String(data.message) : undefined

      updateProcessingTask({
        id: url,
        url: url,
        status: 'processing',
        progress: progress,
        message: message
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

      if (shouldToast(`completed:${url}`)) {
        toast({
          title: 'Processing Completed',
          description: `Successfully processed: ${url}`,
        })
      }

      // Refresh URLs list
      fetchUrls()
    })

    socketInstance.on('processing:failed', (data) => {
      // CRITICAL FIX: First check if data itself is a ProcessingItem that was sent by mistake
      if (data && typeof data === 'object' && 'id' in data && 'status' in data && 'startedAt' in data) {
        console.error('CRITICAL ERROR: ProcessingItem object passed as processing:failed event data!', data)
        // Extract URL from the ProcessingItem itself
        const url = typeof data.url === 'string' ? data.url : 'Unknown URL'

        updateProcessingTask({
          id: url,
          url: url,
          status: 'failed',
          progress: 0,
          message: 'Processing failed due to invalid error data'
        })

        if (shouldToast(`failed:${url}`)) {
          toast({
            title: 'Processing Failed',
            description: 'Processing failed due to system error',
            variant: 'destructive',
          })
        }
        return // Exit early to prevent further processing
      }

      // Ensure we have a valid URL string
      const url = typeof data?.url === 'string' ? data.url : 'Unknown URL'

      // Ultra-defensive error extraction to prevent objects from reaching React
      let errorMessage: string = 'Processing failed'

      try {
        if (data?.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error
          } else if (typeof data.error === 'number' || typeof data.error === 'boolean') {
            errorMessage = String(data.error)
          } else if (data.error && typeof data.error === 'object' && !Array.isArray(data.error)) {
            // Handle error objects safely
            if (data.error.message && typeof data.error.message === 'string') {
              errorMessage = data.error.message
            } else if (data.error.error && typeof data.error.error === 'string') {
              errorMessage = data.error.error
            } else if (data.error.toString && typeof data.error.toString === 'function') {
              try {
                const str = data.error.toString()
                if (typeof str === 'string' && str !== '[object Object]') {
                  errorMessage = str
                }
              } catch {
                // Ignore toString errors
              }
            }
            // Check for nested ProcessingItem that might have been sent by mistake
            if ('id' in data.error && 'url' in data.error && 'status' in data.error) {
              console.error('WARNING: ProcessingItem object sent as error!', data.error)
              errorMessage = 'Processing failed with invalid error object'
            }
          }
        }
      } catch (e) {
        console.error('Error extracting error message:', e)
        errorMessage = 'Processing failed'
      }

      // Triple-check: ensure errorMessage is ALWAYS a string primitive
      const safeErrorMessage = String(errorMessage || 'Processing failed')

      updateProcessingTask({
        id: url,
        url: url,
        status: 'failed',
        progress: 0,
        message: safeErrorMessage
      })

      if (shouldToast(`failed:${url}`)) {
        toast({
          title: 'Processing Failed',
          description: safeErrorMessage,
          variant: 'destructive',
        })
      }
    })

    // Handle batch events
    socketInstance.on('batch:completed', (data) => {
      // Safely handle batch completion data
      const count = typeof data?.count === 'number' ? data.count : 0
      const results = Array.isArray(data?.results) ? data.results : []
      const successCount = results.filter((r: any) => r?.success === true).length
      const failedCount = results.length - successCount

      toast({
        title: 'Batch Processing Completed',
        description: `Processed ${count} URLs. Success: ${successCount}, Failed: ${failedCount}`,
      })

      fetchUrls()
    })

    // Handle URL events
    socketInstance.on('url:added', () => {
      fetchUrls()
    })

    socketInstance.on('urls:added', (data) => {
      const count = typeof data?.count === 'number' ? data.count : 0
      toast({
        title: 'URLs Added',
        description: `Added ${count} URLs to the knowledge base`,
      })
      fetchUrls()
    })

    // Handle tag events
    socketInstance.on('tag:created', (data) => {
      const tagName = typeof data?.name === 'string' ? data.name : 'Unknown tag'
      toast({
        title: 'Tag Created',
        description: `Tag "${tagName}" has been created`,
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
      socketInstance.off('urls:added')
      socketInstance.off('stats:update')
      socketInstance.disconnect()
    }
  }, [])

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
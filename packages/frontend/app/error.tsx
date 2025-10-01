'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: any  // Changed from Error to any to handle non-Error objects
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for debugging, handling non-Error objects
    if (error instanceof Error) {
      console.error('Application error:', error.message)
    } else if (typeof error === 'object' && error !== null) {
      // Don't log objects directly to avoid React rendering errors
      console.error('Application error: Object-based error detected', error)
    } else {
      console.error('Application error:', String(error) || 'Unknown error')
    }
  }, [error])

  // Safely extract error message, ensuring no objects are rendered
  const getErrorMessage = () => {
    if (!error) return 'An unexpected error occurred'

    // Check if error itself is not an Error instance but some other object
    if (!(error instanceof Error)) {
      // If the entire error is an object (like ProcessingItem), handle it
      if (typeof error === 'object' && error !== null) {
        // Check if it looks like a ProcessingItem
        if ('id' in error && 'url' in error && 'status' in error) {
          return 'Processing error occurred'
        }
        try {
          return JSON.stringify(error)
        } catch {
          return 'An error occurred (could not display details)'
        }
      }
      return String(error)
    }

    // If error.message is a string, use it
    if (typeof error.message === 'string') {
      return error.message
    }

    // If error.message is an object, stringify it safely
    if (typeof error.message === 'object' && error.message !== null) {
      try {
        return JSON.stringify(error.message)
      } catch {
        return 'An error occurred (could not display details)'
      }
    }

    // Fallback for any other type
    return String(error.message || 'An unexpected error occurred')
  }

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-semibold">Something went wrong!</h2>
      <p className="text-muted-foreground max-w-md text-center">
        {getErrorMessage()}
      </p>
      <Button
        onClick={() => {
          // Reset the error boundary and retry rendering
          reset()
        }}
      >
        Try again
      </Button>
    </div>
  )
}
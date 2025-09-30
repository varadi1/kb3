"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

// Helper to safely convert any value to a string for rendering
function safeStringify(value: any): string {
  if (value === null || value === undefined) {
    return 'An error occurred'
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'object') {
    // Check if it's an Error object
    if (value instanceof Error) {
      return value.message || 'An error occurred'
    }
    // Check if it looks like a ProcessingItem or similar object
    if ('id' in value && 'url' in value && 'status' in value) {
      return 'Processing error occurred'
    }
    // Try to JSON stringify for debugging
    try {
      const str = JSON.stringify(value)
      // If it's just [object Object], return a generic message
      if (str === '{}' || str === '[object Object]') {
        return 'An error occurred'
      }
      return str
    } catch {
      return 'An error occurred'
    }
  }
  // Fallback for any other type
  return 'An error occurred'
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        // Ensure title and description are always strings
        const safeTitle = title ? safeStringify(title) : null
        const safeDescription = description ? safeStringify(description) : null

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {safeTitle && <ToastTitle>{safeTitle}</ToastTitle>}
              {safeDescription && <ToastDescription>{safeDescription}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
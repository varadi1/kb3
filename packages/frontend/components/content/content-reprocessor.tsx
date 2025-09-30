'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  RefreshCw,
  Settings2,
  Eye,
  Copy,
  Download,
  ArrowUp,
  ArrowDown,
  Sparkles
} from 'lucide-react'
import { type Url } from '@/lib/store'

interface ContentReprocessorProps {
  url: Url
  open: boolean
  onOpenChange: (open: boolean) => void
  originalContent: string
  currentCleanedContent: string
  onReprocess?: (cleanedContent: string) => void
}

interface CleanerOption {
  value: string
  label: string
  description: string
  enabled: boolean
  order: number
}

/**
 * ContentReprocessor Component
 * Allows users to iteratively adjust cleaning settings and reprocess content
 * Follows SRP - only responsible for iterative cleaning workflows
 */
export function ContentReprocessor({
  url,
  open,
  onOpenChange,
  originalContent,
  currentCleanedContent,
  onReprocess
}: ContentReprocessorProps) {
  const [cleaners, setCleaners] = useState<CleanerOption[]>([
    {
      value: 'sanitizehtml',
      label: 'Sanitize HTML',
      description: 'Remove dangerous HTML elements',
      enabled: true,
      order: 1
    },
    {
      value: 'xss',
      label: 'XSS Cleaner',
      description: 'Prevent XSS attacks',
      enabled: false,
      order: 2
    },
    {
      value: 'voca',
      label: 'Voca',
      description: 'Text normalization',
      enabled: false,
      order: 3
    },
    {
      value: 'remark',
      label: 'Remark',
      description: 'Markdown processing',
      enabled: false,
      order: 4
    },
    {
      value: 'readability',
      label: 'Readability',
      description: 'Extract main content',
      enabled: true,
      order: 5
    }
  ])

  const [previewContent, setPreviewContent] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState('config')
  const [history, setHistory] = useState<Array<{
    id: string
    cleaners: string[]
    reduction: number
    timestamp: Date
    content: string
  }>>([])

  const { toast } = useToast()

  useEffect(() => {
    // Load the URL's current cleaner configuration
    if (url.cleaners) {
      setCleaners(prevCleaners =>
        prevCleaners.map(cleaner => ({
          ...cleaner,
          enabled: url.cleaners?.includes(cleaner.value) || false
        }))
      )
    }
    setPreviewContent(currentCleanedContent)
  }, [url, currentCleanedContent])

  const handleCleanerToggle = (cleanerValue: string, checked: boolean) => {
    setCleaners(prevCleaners =>
      prevCleaners.map(cleaner =>
        cleaner.value === cleanerValue
          ? { ...cleaner, enabled: checked }
          : cleaner
      )
    )
  }

  const handleOrderChange = (cleanerValue: string, direction: 'up' | 'down') => {
    setCleaners(prevCleaners => {
      const sorted = [...prevCleaners].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex(c => c.value === cleanerValue)

      if (direction === 'up' && index > 0) {
        [sorted[index], sorted[index - 1]] = [sorted[index - 1], sorted[index]]
      } else if (direction === 'down' && index < sorted.length - 1) {
        [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]]
      }

      return sorted.map((cleaner, i) => ({ ...cleaner, order: i + 1 }))
    })
  }

  const handleReprocess = async () => {
    setIsProcessing(true)
    setActiveTab('preview')

    const enabledCleaners = cleaners
      .filter(c => c.enabled)
      .sort((a, b) => a.order - b.order)
      .map(c => c.value)

    try {
      // Call the reprocessing API
      const response = await fetch(`/api/content/${url.id}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleaners: enabledCleaners,
          content: originalContent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reprocess content')
      }

      const data = await response.json()
      const newContent = data.data.cleanedContent

      setPreviewContent(newContent)

      // Add to history
      const reduction = Math.round(
        ((originalContent.length - newContent.length) / originalContent.length) * 100
      )

      setHistory(prev => [...prev, {
        id: `attempt-${prev.length + 1}`,
        cleaners: enabledCleaners,
        reduction,
        timestamp: new Date(),
        content: newContent
      }])

      toast({
        title: 'Success',
        description: `Content reprocessed with ${reduction}% reduction`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reprocess content',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApplyConfiguration = async () => {
    const enabledCleaners = cleaners
      .filter(c => c.enabled)
      .sort((a, b) => a.order - b.order)
      .map(c => c.value)

    try {
      // Update the URL's cleaner configuration
      const response = await fetch(`/api/urls/${url.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleaners: enabledCleaners
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update configuration')
      }

      // Process the URL with the new configuration
      const processResponse = await fetch(`/api/urls/${url.id}/process`, {
        method: 'POST'
      })

      if (!processResponse.ok) {
        throw new Error('Failed to process URL')
      }

      if (onReprocess) {
        onReprocess(previewContent)
      }

      toast({
        title: 'Success',
        description: 'Configuration applied and content reprocessed',
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply configuration',
        variant: 'destructive',
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied',
        description: 'Content copied to clipboard',
      })
    })
  }

  const getContentStats = (content: string) => ({
    characters: content.length,
    words: content.split(/\s+/).filter(Boolean).length,
    lines: content.split('\n').length
  })

  const currentStats = getContentStats(previewContent)
  const originalStats = getContentStats(originalContent)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Content Reprocessor
          </DialogTitle>
          <DialogDescription>
            Adjust cleaning settings and preview the results before applying
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cleaning Pipeline</CardTitle>
                <CardDescription>
                  Enable and reorder cleaners to customize the processing pipeline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {cleaners
                  .sort((a, b) => a.order - b.order)
                  .map((cleaner, index) => (
                    <div
                      key={cleaner.value}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={cleaner.value}
                          checked={cleaner.enabled}
                          onCheckedChange={(checked) =>
                            handleCleanerToggle(cleaner.value, checked as boolean)
                          }
                        />
                        <div className="grid gap-1">
                          <Label
                            htmlFor={cleaner.value}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {cleaner.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {cleaner.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOrderChange(cleaner.value, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOrderChange(cleaner.value, 'down')}
                          disabled={index === cleaners.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Badge variant="secondary" className="text-xs">
                          {cleaner.order}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleReprocess}
                disabled={isProcessing || !cleaners.some(c => c.enabled)}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview Result
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Content Preview</CardTitle>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Characters: {currentStats.characters} ({originalStats.characters})</span>
                  <span>Words: {currentStats.words} ({originalStats.words})</span>
                  <span>Lines: {currentStats.lines} ({originalStats.lines})</span>
                  <Badge variant="secondary">
                    {Math.round(((originalStats.characters - currentStats.characters) / originalStats.characters) * 100)}% reduction
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <pre className="text-sm whitespace-pre-wrap">{previewContent}</pre>
                </ScrollArea>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(previewContent)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Processing History</CardTitle>
                <CardDescription>
                  Review previous processing attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No processing history yet. Try different configurations to build history.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => setPreviewContent(item.content)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {item.cleaners.join(' → ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.timestamp.toLocaleTimeString()} • {item.reduction}% reduction
                            </p>
                          </div>
                          <Badge variant="outline">
                            {item.cleaners.length} cleaners
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplyConfiguration} disabled={isProcessing}>
            <Settings2 className="mr-2 h-4 w-4" />
            Apply Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
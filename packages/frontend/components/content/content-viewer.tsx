'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import {
  FileText,
  Download,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  GitCompare
} from 'lucide-react'
import { useKb3Store, type Url } from '@/lib/store'
import { ContentReprocessor } from './content-reprocessor'

interface ContentViewerProps {
  url: Url
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * ContentViewer Component
 * Displays original and cleaned content side-by-side
 * Follows SRP - only responsible for content viewing
 */
export function ContentViewer({ url, open, onOpenChange }: ContentViewerProps) {
  const [originalContent, setOriginalContent] = useState<string>('')
  const [cleanedContent, setCleanedContent] = useState<string>('')
  const [metadata, setMetadata] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [activeTab, setActiveTab] = useState('cleaned')
  const [reprocessorOpen, setReprocessorOpen] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false)

  const { toast } = useToast()
  const fetchUrls = useKb3Store(state => state.fetchUrls)

  useEffect(() => {
    if (open && url) {
      fetchContent()
    }
  }, [open, url])

  const fetchContent = async () => {
    setLoading(true)
    try {
      // Fetch both original and cleaned content
      const [originalRes, cleanedRes, metadataRes] = await Promise.all([
        fetch(`/api/content/${url.id}/original`),
        fetch(`/api/content/${url.id}/cleaned`),
        fetch(`/api/content/${url.id}/metadata`)
      ])

      if (originalRes.ok) {
        const originalData = await originalRes.text()
        setOriginalContent(originalData)
      }

      if (cleanedRes.ok) {
        const cleanedData = await cleanedRes.text()
        setCleanedContent(cleanedData)
      }

      if (metadataRes.ok) {
        const metadataData = await metadataRes.json()
        setMetadata(metadataData.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load content',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied',
        description: 'Content copied to clipboard',
      })
    }).catch((error) => {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      })
    })
  }

  const downloadContent = (content: string, type: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${url.id}-${type}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  }

  const getContentStats = (content: string) => ({
    characters: content.length,
    words: content.split(/\s+/).filter(Boolean).length,
    lines: content.split('\n').length
  })

  const originalStats = getContentStats(originalContent)
  const cleanedStats = getContentStats(cleanedContent)

  const calculateReduction = () => {
    if (originalContent.length === 0) return 0
    return Math.round(((originalContent.length - cleanedContent.length) / originalContent.length) * 100)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Content Viewer</DialogTitle>
          <DialogDescription>
            View and compare original and cleaned content
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="cleaned" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Cleaned
                </TabsTrigger>
                <TabsTrigger value="original" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Original
                </TabsTrigger>
                <TabsTrigger value="comparison" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Compare
                </TabsTrigger>
                <TabsTrigger value="metadata" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Metadata
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReprocessorOpen(true)}
                  disabled={!originalContent}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Reprocess
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setComparisonMode(!comparisonMode)}
                >
                  <GitCompare className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchContent()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="cleaned" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Cleaned Content</CardTitle>
                      <CardDescription>
                        Processed and sanitized content
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {cleanedStats.words} words
                      </Badge>
                      <Badge variant="outline">
                        {cleanedStats.lines} lines
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(cleanedContent)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadContent(cleanedContent, 'cleaned')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReprocessorOpen(true)}
                      disabled={!originalContent}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Reprocess
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {cleanedContent || 'No cleaned content available'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="original" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Original Content</CardTitle>
                      <CardDescription>
                        Raw content as fetched from source
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {originalStats.words} words
                      </Badge>
                      <Badge variant="outline">
                        {originalStats.lines} lines
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(originalContent)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadContent(originalContent, 'original')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {originalContent || 'No original content available'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Content Comparison</CardTitle>
                      <CardDescription>
                        Side-by-side comparison of original and cleaned content
                      </CardDescription>
                    </div>
                    <Badge className={calculateReduction() > 0 ? 'bg-green-100 text-green-800' : ''}>
                      {calculateReduction()}% reduction
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {comparisonMode ? (
                    // Enhanced comparison view with diff highlighting
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-2 border rounded">
                          <div className="text-muted-foreground">Original</div>
                          <div className="font-bold">{originalStats.characters.toLocaleString()}</div>
                          <div className="text-xs">characters</div>
                        </div>
                        <div className="text-center p-2 border rounded bg-green-50 dark:bg-green-950">
                          <div className="text-muted-foreground">Reduction</div>
                          <div className="font-bold text-green-600">
                            {calculateReduction()}%
                          </div>
                          <div className="text-xs">
                            ({(originalStats.characters - cleanedStats.characters).toLocaleString()} chars)
                          </div>
                        </div>
                        <div className="text-center p-2 border rounded">
                          <div className="text-muted-foreground">Cleaned</div>
                          <div className="font-bold">{cleanedStats.characters.toLocaleString()}</div>
                          <div className="text-xs">characters</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-sm">Original</h4>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <span>{originalStats.words} words</span>
                              <span>•</span>
                              <span>{originalStats.lines} lines</span>
                            </div>
                          </div>
                          <ScrollArea className="h-[400px] w-full border rounded-md p-4 bg-red-50/50 dark:bg-red-950/20">
                            <pre className="text-xs whitespace-pre-wrap font-mono">
                              {originalContent || 'No original content'}
                            </pre>
                          </ScrollArea>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-sm">Cleaned</h4>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <span>{cleanedStats.words} words</span>
                              <span>•</span>
                              <span>{cleanedStats.lines} lines</span>
                            </div>
                          </div>
                          <ScrollArea className="h-[400px] w-full border rounded-md p-4 bg-green-50/50 dark:bg-green-950/20">
                            <pre className="text-xs whitespace-pre-wrap font-mono">
                              {cleanedContent || 'No cleaned content'}
                            </pre>
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Simple side-by-side view
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Original</h4>
                        <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                          <pre className="text-xs whitespace-pre-wrap font-mono">
                            {originalContent || 'No original content'}
                          </pre>
                        </ScrollArea>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Cleaned</h4>
                        <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                          <pre className="text-xs whitespace-pre-wrap font-mono">
                            {cleanedContent || 'No cleaned content'}
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Processing Metadata</CardTitle>
                  <CardDescription>
                    Details about how this content was processed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full">
                    <div className="space-y-4">
                      {metadata.scraperUsed && (
                        <div>
                          <h4 className="font-semibold mb-2">Scraper</h4>
                          <Badge>{metadata.scraperUsed}</Badge>
                        </div>
                      )}

                      {metadata.cleanersUsed && (
                        <div>
                          <h4 className="font-semibold mb-2">Cleaners Applied</h4>
                          <div className="flex flex-wrap gap-2">
                            {metadata.cleanersUsed.map((cleaner: string) => (
                              <Badge key={cleaner} variant="secondary">
                                {cleaner}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {metadata.processingTime && (
                        <div>
                          <h4 className="font-semibold mb-2">Processing Time</h4>
                          <p className="text-sm text-muted-foreground">
                            {metadata.processingTime}ms
                          </p>
                        </div>
                      )}

                      {metadata.statistics && (
                        <div>
                          <h4 className="font-semibold mb-2">Statistics</h4>
                          <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded">
                            {JSON.stringify(metadata.statistics, null, 2)}
                          </pre>
                        </div>
                      )}

                      {metadata.errors && metadata.errors.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Errors</h4>
                          <div className="space-y-2">
                            {metadata.errors.map((error: string, idx: number) => (
                              <Badge key={idx} variant="destructive">
                                {error}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>

    {/* Content Reprocessor Dialog */}
    <ContentReprocessor
      url={url}
      open={reprocessorOpen}
      onOpenChange={setReprocessorOpen}
      originalContent={originalContent}
      currentCleanedContent={cleanedContent}
      onReprocess={(newContent) => {
        setCleanedContent(newContent)
        toast({
          title: 'Content Updated',
          description: 'The cleaned content has been updated with your new configuration',
        })
      }}
    />
    </>
  )
}
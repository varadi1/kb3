'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useKb3Store } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'
import {
  Tags,
  Settings,
  Shield,
  Play,
  Trash2,
  Download,
  Upload,
  X
} from 'lucide-react'
import { ParameterEditor } from '@/components/config/parameter-editor'

/**
 * BatchOperationsPanel Component
 * Handles batch operations on selected URLs
 * Follows SRP - only responsible for batch operations
 */
export function BatchOperationsPanel() {
  const {
    selectedUrls,
    urls,
    tags: availableTags,
    fetchTags,
    batchAssignTags,
    batchUpdateAuthority,
    batchUpdateUrls,
    processUrls,
    batchUpdateUrls: batchDelete,
    deselectAllUrls
  } = useKb3Store()

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [selectedAuthority, setSelectedAuthority] = useState('0')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [parameterEditorOpen, setParameterEditorOpen] = useState(false)
  const [selectedScraperType, setSelectedScraperType] = useState<string>('')
  const [batchParameters, setBatchParameters] = useState<Record<string, any>>({})

  const { toast } = useToast()

  useEffect(() => {
    fetchTags().catch(console.error)
  }, [fetchTags])

  const selectedCount = selectedUrls.size
  const selectedUrlObjects = urls.filter(u => selectedUrls.has(u.id))

  if (selectedCount === 0) {
    return null // Don't show panel if nothing is selected
  }

  const handleAddTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags([...selectedTags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  const handleAssignTags = async () => {
    if (selectedTags.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one tag',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)
    try {
      const urlIds = Array.from(selectedUrls)
      await batchAssignTags(urlIds, selectedTags)

      toast({
        title: 'Success',
        description: `Assigned ${selectedTags.length} tags to ${selectedCount} URLs`,
      })

      setSelectedTags([])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign tags',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpdateAuthority = async () => {
    setIsProcessing(true)
    try {
      const urlIds = Array.from(selectedUrls)
      await batchUpdateAuthority(urlIds, parseInt(selectedAuthority))

      toast({
        title: 'Success',
        description: `Updated authority level for ${selectedCount} URLs`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update authority',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      toast({
        title: 'Error',
        description: 'Please select a status',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)
    try {
      const urlIds = Array.from(selectedUrls)
      await batchUpdateUrls(urlIds, { status: selectedStatus as any })

      toast({
        title: 'Success',
        description: `Updated status for ${selectedCount} URLs`,
      })

      setSelectedStatus('')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProcessUrls = async () => {
    setIsProcessing(true)
    try {
      const urlIds = Array.from(selectedUrls)
      await processUrls(urlIds)

      toast({
        title: 'Success',
        description: `Started processing ${selectedCount} URLs`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start processing',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteUrls = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} URLs?`)) {
      return
    }

    setIsProcessing(true)
    try {
      const urlIds = Array.from(selectedUrls)
      // Use the store's delete method for each URL
      for (const id of urlIds) {
        await batchUpdateUrls([id], { status: 'skipped' }) // Mark as deleted
      }

      toast({
        title: 'Success',
        description: `Deleted ${selectedCount} URLs`,
      })

      deselectAllUrls()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete URLs',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOpenParameterEditor = () => {
    if (!selectedScraperType || selectedScraperType === 'default') {
      toast({
        title: 'Select Scraper Type',
        description: 'Please select a scraper type before configuring parameters',
        variant: 'destructive'
      })
      return
    }
    setParameterEditorOpen(true)
  }

  const handleSaveBatchParameters = async (parameters: Record<string, any>) => {
    setBatchParameters(parameters)
    setParameterEditorOpen(false)

    // Apply parameters to all selected URLs
    setIsProcessing(true)
    try {
      const urlIds = Array.from(selectedUrls)

      const response = await fetch('/api/config/batch/parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlIds,
          scraperType: selectedScraperType,
          parameters: parameters,
          priority: 15,
          enabled: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save batch parameters')
      }

      const data = await response.json()

      toast({
        title: 'Success',
        description: `Parameters configured for ${selectedCount} URLs`,
      })

      // Update scraper type in the store
      await batchUpdateUrls(urlIds, { scraperType: selectedScraperType })

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply parameters to selected URLs',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Batch Operations</CardTitle>
              <CardDescription>
                {selectedCount} {selectedCount === 1 ? 'URL' : 'URLs'} selected
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deselectAllUrls()}
            >
              Clear Selection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {/* Tag Assignment */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Assign Tags
          </Label>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Enter tag name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
            />
            <Button
              variant="outline"
              onClick={handleAddTag}
              disabled={!newTag.trim()}
            >
              Add Tag
            </Button>
            <Button
              onClick={handleAssignTags}
              disabled={selectedTags.length === 0 || isProcessing}
            >
              Assign Tags
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => handleRemoveTag(tag)}
                />
              </Badge>
            ))}
          </div>
        </div>

        {/* Authority Update */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Update Authority
          </Label>
          <div className="flex gap-2">
            <Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None (0)</SelectItem>
                <SelectItem value="1">Low (1)</SelectItem>
                <SelectItem value="2">Medium (2)</SelectItem>
                <SelectItem value="3">High (3)</SelectItem>
                <SelectItem value="4">Critical (4)</SelectItem>
                <SelectItem value="5">Maximum (5)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleUpdateAuthority}
              disabled={isProcessing}
            >
              Update Authority
            </Button>
          </div>
        </div>

        {/* Status Update */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Update Status
          </Label>
          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleUpdateStatus}
              disabled={!selectedStatus || isProcessing}
            >
              Update Status
            </Button>
          </div>
        </div>

        {/* Scraper Configuration */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configure Scraper
          </Label>
          <div className="flex gap-2">
            <Select value={selectedScraperType} onValueChange={setSelectedScraperType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select scraper type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="http">HTTP Scraper</SelectItem>
                <SelectItem value="playwright">Playwright Browser</SelectItem>
                <SelectItem value="crawl4ai">Crawl4AI</SelectItem>
                <SelectItem value="docling">Docling PDF</SelectItem>
                <SelectItem value="deep-doctection">Deep Doctection</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleOpenParameterEditor}
              disabled={!selectedScraperType || selectedScraperType === 'default' || isProcessing}
              variant="outline"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configure Parameters
            </Button>
          </div>
          {Object.keys(batchParameters).length > 0 && (
            <div className="text-sm text-muted-foreground">
              {Object.keys(batchParameters).length} parameters configured for {selectedScraperType}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleProcessUrls}
            disabled={isProcessing}
          >
            <Play className="mr-2 h-4 w-4" />
            Process Selected
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              // Export selected URLs
              const exportStore = useKb3Store.getState()
              exportStore.exportData('json').then((data) => {
                const blob = new Blob([data.content], { type: data.mimeType })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `selected-urls-${new Date().toISOString()}.json`
                a.click()
                URL.revokeObjectURL(url)
              })
            }}
            disabled={isProcessing}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Selected
          </Button>

          <Button
            variant="destructive"
            onClick={handleDeleteUrls}
            disabled={isProcessing}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </div>
        </CardContent>
      </Card>

      {/* Parameter Editor Dialog for Batch Configuration */}
      {selectedScraperType && selectedScraperType !== 'default' && (
        <ParameterEditor
          open={parameterEditorOpen}
          onClose={() => setParameterEditorOpen(false)}
          scraperType={selectedScraperType}
          initialParameters={batchParameters}
          onSave={handleSaveBatchParameters}
        />
      )}
    </>
  )
}
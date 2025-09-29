'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useKb3Store } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { X, Settings } from 'lucide-react'
import type { Url } from '@/lib/store'
import { ParameterEditor } from '@/components/config/parameter-editor'

interface EditUrlDialogProps {
  url: Url
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Tag {
  id: string
  name: string
  parentId?: string | null
  children?: Tag[]
}

/**
 * EditUrlDialog Component
 * Responsible for editing a single URL's properties
 * Follows SRP - only handles URL editing
 */
export function EditUrlDialog({ url, open, onOpenChange }: EditUrlDialogProps) {
  const [editedUrl, setEditedUrl] = useState<Partial<Url>>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedExistingTag, setSelectedExistingTag] = useState<string>('')
  const [parameterEditorOpen, setParameterEditorOpen] = useState(false)
  const [scraperParameters, setScraperParameters] = useState<Record<string, any>>({})

  const { updateUrl, fetchConfig, configData, fetchTags } = useKb3Store()
  const { toast } = useToast()

  useEffect(() => {
    if (open && url) {
      setEditedUrl({
        ...url,
        authority: url.authority || 0,
        metadata: url.metadata || {}
      })
      setSelectedTags(url.tags || [])
      setScraperParameters({}) // Reset parameters

      // Fetch available tags
      fetchTags().then(tags => {
        setAvailableTags(tags || [])
      }).catch(console.error)

      // Fetch config if not loaded
      if (!configData) {
        fetchConfig().catch(console.error)
      }

      // Fetch existing parameters for this URL
      fetchUrlParameters(url.id)
    }
  }, [open, url, configData, fetchConfig, fetchTags])

  const fetchUrlParameters = async (urlId: string) => {
    try {
      const response = await fetch(`/api/config/url/${urlId}/parameters`)
      const data = await response.json()
      if (data.success && data.data?.parameters) {
        setScraperParameters(data.data.parameters)
      }
    } catch (error) {
      console.error('Failed to fetch URL parameters:', error)
    }
  }

  // Flatten hierarchical tags for dropdown
  const flattenTags = (tags: Tag[]): { value: string; label: string }[] => {
    const result: { value: string; label: string }[] = []
    const addTags = (tagList: Tag[], prefix = '') => {
      tagList.forEach(tag => {
        const label = prefix ? `${prefix} › ${tag.name}` : tag.name
        result.push({ value: tag.name, label })
        if (tag.children && tag.children.length > 0) {
          addTags(tag.children, label)
        }
      })
    }
    addTags(tags)
    return result
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const updatedData = {
        ...editedUrl,
        tags: selectedTags
      }

      await updateUrl(url.id, updatedData)

      // Save scraper parameters if configured
      if (Object.keys(scraperParameters).length > 0 && editedUrl.scraperType && editedUrl.scraperType !== 'default') {
        await saveUrlParameters()
      }

      toast({
        title: 'Success',
        description: 'URL updated successfully',
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update URL',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const saveUrlParameters = async () => {
    try {
      const response = await fetch(`/api/config/url/${url.id}/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scraperType: editedUrl.scraperType,
          parameters: scraperParameters,
          priority: 20, // URL-specific priority
          enabled: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save parameters')
      }
    } catch (error) {
      console.error('Failed to save URL parameters:', error)
      throw error
    }
  }

  const handleSaveParameters = async (parameters: Record<string, any>) => {
    setScraperParameters(parameters)
    toast({
      title: 'Parameters Updated',
      description: 'Scraper parameters have been configured. Save the URL to apply them.',
    })
  }

  const openParameterEditor = () => {
    if (!editedUrl.scraperType || editedUrl.scraperType === 'default') {
      toast({
        title: 'Select a Scraper First',
        description: 'Please select a scraper type before configuring parameters',
        variant: 'destructive',
      })
      return
    }
    setParameterEditorOpen(true)
  }

  const hasConfiguredParameters = () => {
    return Object.keys(scraperParameters).length > 0
  }

  const handleAddTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags(prev => [...prev, newTag.trim()])
      setNewTag('')
    }
  }

  const handleAddExistingTag = () => {
    if (selectedExistingTag && !selectedTags.includes(selectedExistingTag)) {
      setSelectedTags(prev => [...prev, selectedExistingTag])
      setSelectedExistingTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagToRemove))
  }

  const authorityLevels = [
    { value: '0', label: 'None (0)' },
    { value: '1', label: 'Low (1)' },
    { value: '2', label: 'Medium (2)' },
    { value: '3', label: 'High (3)' },
    { value: '4', label: 'Critical (4)' },
    { value: '5', label: 'Maximum (5)' }
  ]

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'skipped', label: 'Skipped' }
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
          <DialogTitle>Edit URL</DialogTitle>
          <DialogDescription>
            Modify URL properties, metadata, and processing configuration
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* URL (Read-only) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="url" className="text-right">
              URL
            </Label>
            <Input
              id="url"
              value={url.url}
              disabled
              className="col-span-3"
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              value={editedUrl.status}
              onValueChange={(value) => setEditedUrl(prev => ({ ...prev, status: value as Url['status'] }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Authority */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="authority" className="text-right">
              Authority
            </Label>
            <Select
              value={String(editedUrl.authority || 0)}
              onValueChange={(value) => setEditedUrl(prev => ({ ...prev, authority: parseInt(value) }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select authority level" />
              </SelectTrigger>
              <SelectContent>
                {authorityLevels.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="tags" className="text-right pt-2">
              Tags
            </Label>
            <div className="col-span-3 space-y-2">
              {/* Select existing tags */}
              <div className="flex gap-2">
                <Select
                  value={selectedExistingTag}
                  onValueChange={setSelectedExistingTag}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select existing tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {flattenTags(availableTags).map((tag) => (
                      <SelectItem
                        key={tag.value}
                        value={tag.value}
                        disabled={selectedTags.includes(tag.value)}
                      >
                        {tag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddExistingTag}
                  variant="outline"
                  disabled={!selectedExistingTag}
                >
                  Add
                </Button>
              </div>

              {/* Add new tag */}
              <div className="flex gap-2">
                <Input
                  id="new-tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Or create new tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Create
                </Button>
              </div>

              {/* Selected tags */}
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
          </div>

          {/* Scraper Type */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scraperType" className="text-right">
              Scraper
            </Label>
            <div className="col-span-3 flex gap-2">
              <Select
                value={editedUrl.scraperType || 'default'}
                onValueChange={(value) => {
                  setEditedUrl(prev => ({ ...prev, scraperType: value }))
                  // Reset parameters when scraper type changes
                  if (value !== editedUrl.scraperType) {
                    setScraperParameters({})
                  }
                }}
              >
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
                type="button"
                variant="outline"
                size="icon"
                onClick={openParameterEditor}
                disabled={!editedUrl.scraperType || editedUrl.scraperType === 'default'}
                className="relative"
              >
                <Settings className="h-4 w-4" />
                {hasConfiguredParameters() && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full" />
                )}
              </Button>
            </div>
            {hasConfiguredParameters() && (
              <div className="col-start-2 col-span-3 text-xs text-muted-foreground">
                {Object.keys(scraperParameters).length} parameter{Object.keys(scraperParameters).length === 1 ? '' : 's'} configured
              </div>
            )}
          </div>

          {/* Metadata (JSON) */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="metadata" className="text-right pt-2">
              Metadata
            </Label>
            <Textarea
              id="metadata"
              value={JSON.stringify(editedUrl.metadata || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setEditedUrl(prev => ({ ...prev, metadata: parsed }))
                } catch {
                  // Invalid JSON, let user continue typing
                }
              }}
              placeholder='{"key": "value"}'
              className="col-span-3 font-mono text-sm"
              rows={5}
            />
          </div>

          {/* Notes */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={editedUrl.metadata?.notes || ''}
              onChange={(e) => setEditedUrl(prev => ({
                ...prev,
                metadata: { ...prev.metadata, notes: e.target.value }
              }))}
              placeholder="Additional notes about this URL"
              className="col-span-3"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parameter Editor Dialog */}
      {editedUrl.scraperType && editedUrl.scraperType !== 'default' && (
        <ParameterEditor
          open={parameterEditorOpen}
          onClose={() => setParameterEditorOpen(false)}
          scraperType={editedUrl.scraperType}
          initialParameters={scraperParameters}
          onSave={handleSaveParameters}
          urlId={url.id}
        />
      )}
    </>
  )
}
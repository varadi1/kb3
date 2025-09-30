'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useKb3Store } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'

/**
 * BatchAddUrlsDialog Component
 * Allows users to add multiple URLs at once with optional tags
 * Follows SRP - only responsible for batch URL addition
 */
export function BatchAddUrlsDialog() {
  const [open, setOpen] = useState(false)
  const [urlsText, setUrlsText] = useState('')
  const [globalTags, setGlobalTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [parseResult, setParseResult] = useState<{
    valid: Array<{ url: string; tags: string[] }>
    invalid: string[]
  }>({ valid: [], invalid: [] })

  const { addUrls, fetchUrls } = useKb3Store()
  const { toast } = useToast()

  const parseUrls = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    const valid: Array<{ url: string; tags: string[] }> = []
    const invalid: string[] = []
    const globalTagList = globalTags.split(',').map(t => t.trim()).filter(Boolean)

    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      // Support format: URL [tag1, tag2, tag3]
      const tagMatch = trimmedLine.match(/^(.+?)\s*\[([^\]]+)\]$/)
      let url: string
      let tags: string[] = [...globalTagList]

      if (tagMatch) {
        url = tagMatch[1].trim()
        const lineTags = tagMatch[2].split(',').map(t => t.trim()).filter(Boolean)
        tags = [...tags, ...lineTags]
      } else {
        url = trimmedLine
      }

      // Basic URL validation
      try {
        new URL(url)
        valid.push({ url, tags: Array.from(new Set(tags)) }) // Remove duplicate tags
      } catch {
        // Try adding https:// if missing
        try {
          new URL(`https://${url}`)
          valid.push({ url: `https://${url}`, tags: Array.from(new Set(tags)) })
        } catch {
          invalid.push(trimmedLine)
        }
      }
    })

    setParseResult({ valid, invalid })
    return { valid, invalid }
  }

  const handleTextChange = (text: string) => {
    setUrlsText(text)
    if (text.trim()) {
      parseUrls(text)
    } else {
      setParseResult({ valid: [], invalid: [] })
    }
  }

  const handleSubmit = async () => {
    const { valid, invalid } = parseUrls(urlsText)

    if (valid.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid URLs found to add',
        variant: 'destructive',
      })
      return
    }

    if (invalid.length > 0) {
      const proceed = confirm(
        `Found ${invalid.length} invalid URL(s). Do you want to proceed with adding ${valid.length} valid URL(s)?`
      )
      if (!proceed) return
    }

    setLoading(true)
    try {
      await addUrls(valid)
      await fetchUrls() // Refresh the list

      toast({
        title: 'Success',
        description: `Added ${valid.length} URL(s) successfully`,
      })

      // Reset form
      setUrlsText('')
      setGlobalTags('')
      setParseResult({ valid: [], invalid: [] })
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add URLs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getSampleFormat = () => {
    return `https://example.com/page1
https://example.com/page2 [documentation, api]
https://example.com/page3 [tutorial, beginner]
example.com/page4
www.example.com/page5 [reference]`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Batch Add URLs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Batch Add URLs</DialogTitle>
          <DialogDescription>
            Add multiple URLs at once. Each URL on a new line, optionally with tags in brackets.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Global Tags */}
          <div className="space-y-2">
            <Label htmlFor="global-tags">
              Global Tags (apply to all URLs)
            </Label>
            <Textarea
              id="global-tags"
              value={globalTags}
              onChange={(e) => setGlobalTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              rows={2}
              className="font-mono text-sm"
            />
          </div>

          {/* URLs Input */}
          <div className="space-y-2">
            <Label htmlFor="urls">
              URLs (one per line)
            </Label>
            <Textarea
              id="urls"
              value={urlsText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={getSampleFormat()}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Format: URL [optional, tags, here]
            </p>
          </div>

          {/* Parse Results */}
          {(parseResult.valid.length > 0 || parseResult.invalid.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {parseResult.valid.length} valid URL(s)
                </span>
              </div>

              {parseResult.invalid.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">
                      {parseResult.invalid.length} invalid URL(s):
                    </span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {parseResult.invalid.slice(0, 3).map((url, i) => (
                      <p key={i} className="text-xs text-destructive">
                        • {url}
                      </p>
                    ))}
                    {parseResult.invalid.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        ...and {parseResult.invalid.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview of tags that will be applied */}
          {parseResult.valid.length > 0 && parseResult.valid.some(u => u.tags.length > 0) && (
            <div className="space-y-2">
              <Label>Preview of unique tags</Label>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(parseResult.valid.flatMap(u => u.tags))).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || parseResult.valid.length === 0}
          >
            {loading ? 'Adding...' : `Add ${parseResult.valid.length || 0} URL(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
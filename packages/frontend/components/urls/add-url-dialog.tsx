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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import { useKb3Store } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'

export function AddUrlDialog() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const { addUrl } = useKb3Store()
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!url) {
      toast({
        title: 'Error',
        description: 'Please enter a URL',
        variant: 'destructive',
      })
      return
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      toast({
        title: 'Error',
        description: 'Please enter a valid URL (e.g., https://example.com)',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
      await addUrl(url, tagList, notes)

      toast({
        title: 'Success',
        description: 'URL added successfully',
      })

      // Reset form
      setUrl('')
      setTags('')
      setNotes('')
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add URL',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add URL
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New URL</DialogTitle>
          <DialogDescription>
            Add a new URL to your knowledge base for processing
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="url" className="text-right">
              URL
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              Tags
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="docs, api, tutorial (comma-separated)"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this URL"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding...' : 'Add URL'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
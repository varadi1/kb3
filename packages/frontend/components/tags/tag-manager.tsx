'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useKb3Store } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, Edit2, Check, X, ChevronRight, ChevronDown } from 'lucide-react'

interface Tag {
  id: string
  name: string
  parentId?: string
  children?: Tag[]
  urlCount: number
}

export function TagManager() {
  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { fetchTags, createTag, updateTag, deleteTag } = useKb3Store()
  const { toast } = useToast()

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      const fetchedTags = await fetchTags()
      setTags(fetchedTags)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tags',
        variant: 'destructive',
      })
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      await createTag(newTagName)
      await loadTags()
      setNewTagName('')
      toast({
        title: 'Success',
        description: 'Tag created successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create tag',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateTag = async (id: string) => {
    if (!editingName.trim()) return

    try {
      await updateTag(id, editingName)
      await loadTags()
      setEditingId(null)
      toast({
        title: 'Success',
        description: 'Tag updated successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tag',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTag = async (id: string) => {
    try {
      await deleteTag(id)
      await loadTags()
      toast({
        title: 'Success',
        description: 'Tag deleted successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tag',
        variant: 'destructive',
      })
    }
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const renderTag = (tag: Tag, level = 0) => {
    const isEditing = editingId === tag.id
    const hasChildren = tag.children && tag.children.length > 0
    const isExpanded = expandedIds.has(tag.id)

    return (
      <div key={tag.id}>
        <div
          className="flex items-center justify-between py-2 px-2 hover:bg-accent rounded-md"
          style={{ paddingLeft: `${level * 24 + 8}px` }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6"
                onClick={() => toggleExpand(tag.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-6" />}

            {isEditing ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="flex-1 h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateTag(tag.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
              />
            ) : (
              <div className="flex-1">
                <span className="font-medium">{tag.name}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({tag.urlCount} URLs)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateTag(tag.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(tag.id)
                    setEditingName(tag.name)
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTag(tag.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {tag.children!.map((child) => renderTag(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="New tag name"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateTag()
          }}
        />
        <Button onClick={handleCreateTag}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tag
        </Button>
      </div>

      <div className="border rounded-md">
        {tags.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No tags yet. Create your first tag to get started.
          </div>
        ) : (
          <div className="p-2">
            {tags.map((tag) => renderTag(tag))}
          </div>
        )}
      </div>
    </div>
  )
}
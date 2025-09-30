'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useKb3Store, type Tag } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, Edit2, Check, X, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react'

const NO_PARENT = 'no-parent' // Sentinel value for no parent selection

export function TagManager() {
  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagParent, setNewTagParent] = useState<string>(NO_PARENT)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingParent, setEditingParent] = useState<string>(NO_PARENT)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

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
      await createTag(newTagName, newTagParent === NO_PARENT ? undefined : newTagParent)
      await loadTags()
      setNewTagName('')
      setNewTagParent(NO_PARENT)
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

  const handleUpdateTag = async (id: number) => {
    if (!editingName.trim()) return

    try {
      await updateTag(String(id), {
        name: editingName,
        parent_id: editingParent === NO_PARENT ? undefined : parseInt(editingParent)
      })
      await loadTags()
      setEditingId(null)
      setEditingParent(NO_PARENT)
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

  const handleDeleteTag = async (id: number) => {
    try {
      await deleteTag(String(id))
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

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  // Flatten tags for dropdown selection
  const flattenTags = (tagList: Tag[], exclude?: number, prefix = ''): Array<{ value: string; label: string; id: number }> => {
    const result: Array<{ value: string; label: string; id: number }> = []

    const addTags = (tags: Tag[], level = 0, parentPrefix = '') => {
      tags.forEach(tag => {
        if (tag.id !== exclude) {
          const label = parentPrefix ? `${parentPrefix} › ${tag.name}` : tag.name
          result.push({ value: String(tag.id), label, id: tag.id })

          if (tag.children && tag.children.length > 0) {
            addTags(tag.children, level + 1, label)
          }
        }
      })
    }

    addTags(tagList)
    return result
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
              <div className="flex-1 flex gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 h-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateTag(tag.id)
                    if (e.key === 'Escape') {
                      setEditingId(null)
                      setEditingParent(NO_PARENT)
                    }
                  }}
                />
                <Select value={editingParent} onValueChange={setEditingParent}>
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue placeholder="Parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>No parent</SelectItem>
                    {flattenTags(tags, tag.id).map(t => (
                      <SelectItem key={t.id} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                {hasChildren ? (
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Folder className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{tag.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({tag.urlCount || 0} URLs)
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
                    setEditingParent(tag.parent_id ? String(tag.parent_id) : NO_PARENT)
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
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateTag()
            }}
            className="flex-1"
          />
          <Select value={newTagParent} onValueChange={setNewTagParent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Parent (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT}>No parent</SelectItem>
              {flattenTags(tags).map(tag => (
                <SelectItem key={tag.id} value={tag.value}>
                  {tag.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreateTag}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tag
          </Button>
        </div>
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
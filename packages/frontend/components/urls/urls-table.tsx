'use client'

import React, { useEffect, useState } from 'react'
import { useKb3Store } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EditUrlDialog } from './edit-url-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { formatDate, truncate } from '@/lib/utils'
import {
  MoreHorizontal,
  Play,
  Edit,
  Trash,
  ExternalLink,
  Download,
  RefreshCw
} from 'lucide-react'

export function UrlsTable() {
  const {
    urls,
    selectedUrls,
    urlsLoading,
    fetchUrls,
    selectUrl,
    deselectUrl,
    selectAllUrls,
    deselectAllUrls,
    processUrl,
    deleteUrl,
    downloadContent
  } = useKb3Store()

  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [editingUrl, setEditingUrl] = useState<any>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    fetchUrls()
  }, [fetchUrls])

  const handleSelectAll = () => {
    if (selectedUrls.size === urls.length) {
      deselectAllUrls()
    } else {
      selectAllUrls()
    }
  }

  const handleSelectUrl = (id: string) => {
    if (selectedUrls.has(id)) {
      deselectUrl(id)
    } else {
      selectUrl(id)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (urlsLoading && urls.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw
          className="h-8 w-8 animate-spin text-muted-foreground"
          data-testid="loading-spinner"
        />
      </div>
    )
  }

  if (urls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground">No URLs found in the knowledge base</p>
        <p className="text-sm text-muted-foreground">Add some URLs to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedUrls.size === urls.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Scraper</TableHead>
              <TableHead>Cleaners</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {urls.map((url) => (
              <TableRow key={url.id}>
              <TableCell>
                <Checkbox
                  checked={selectedUrls.has(url.id)}
                  onCheckedChange={() => handleSelectUrl(url.id)}
                  aria-label={`Select ${url.url}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <span className="max-w-[400px] truncate">
                    {truncate(url.url, 60)}
                  </span>
                  <a
                    href={url.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(url.status)}>
                  {url.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(url.tags || []).slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {(url.tags || []).length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{(url.tags || []).length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {url.scraperType || 'default'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(url.cleaners || []).slice(0, 2).map((cleaner) => (
                    <Badge key={cleaner} variant="secondary" className="text-xs">
                      {cleaner}
                    </Badge>
                  ))}
                  {(url.cleaners || []).length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{(url.cleaners || []).length - 2}
                    </Badge>
                  )}
                  {(!url.cleaners || url.cleaners.length === 0) && (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {url.processedAt ? formatDate(url.processedAt) : 'Not processed'}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => processUrl(url.id)}
                      disabled={url.status === 'processing'}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Process
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingUrl(url)
                        setEditDialogOpen(true)
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => downloadContent(url.id, 'cleaned')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Cleaned
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => downloadContent(url.id, 'original')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Original
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteUrl(url.id)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Edit Dialog */}
    {editingUrl && (
      <EditUrlDialog
        url={editingUrl}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    )}
  </>
  )
}
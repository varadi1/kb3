'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useKb3Store } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'
import { Upload, Download, FileText, FileJson, FileSpreadsheet } from 'lucide-react'

type ImportFormat = 'json' | 'csv' | 'txt'
type ExportFormat = 'json' | 'csv' | 'txt'

export function ImportExportPanel() {
  const [importFormat, setImportFormat] = useState<ImportFormat>('json')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [importContent, setImportContent] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { importUrls, exportData } = useKb3Store()
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setImportContent(content)

      // Auto-detect format based on file extension
      if (file.name.endsWith('.json')) setImportFormat('json')
      else if (file.name.endsWith('.csv')) setImportFormat('csv')
      else if (file.name.endsWith('.txt')) setImportFormat('txt')
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide content to import',
        variant: 'destructive',
      })
      return
    }

    setIsImporting(true)
    try {
      const result = await importUrls(importContent, importFormat)

      toast({
        title: 'Import successful',
        description: `Imported ${result.count} URLs successfully`,
      })

      setImportContent('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import URLs',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await exportData(exportFormat)

      // Create download link
      const blob = new Blob([data.content], { type: data.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kb3-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export successful',
        description: `Exported ${data.count} items`,
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export data',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
        return <FileJson className="h-4 w-4" />
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />
      case 'txt':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getSampleContent = (format: ImportFormat) => {
    switch (format) {
      case 'json':
        return `[
  {
    "url": "https://example.com/doc1",
    "tags": ["documentation", "api"],
    "notes": "API documentation"
  },
  {
    "url": "https://example.com/doc2",
    "tags": ["tutorial"]
  }
]`
      case 'csv':
        return `url,tags,notes
https://example.com/doc1,"documentation,api","API documentation"
https://example.com/doc2,"tutorial",""
https://example.com/doc3,"",""Notes are optional"`
      case 'txt':
        return `https://example.com/doc1
https://example.com/doc2
https://example.com/doc3
# Lines starting with # are ignored
# One URL per line`
    }
  }

  return (
    <Tabs defaultValue="import" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="import">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </TabsTrigger>
        <TabsTrigger value="export">
          <Download className="mr-2 h-4 w-4" />
          Export
        </TabsTrigger>
      </TabsList>

      <TabsContent value="import" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Import URLs</CardTitle>
            <CardDescription>
              Import URLs from JSON, CSV, or plain text files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={importFormat}
                onValueChange={(value: ImportFormat) => setImportFormat(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      {getFormatIcon('json')}
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      {getFormatIcon('csv')}
                      CSV
                    </div>
                  </SelectItem>
                  <SelectItem value="txt">
                    <div className="flex items-center gap-2">
                      {getFormatIcon('txt')}
                      Plain Text
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder={getSampleContent(importFormat)}
                className="font-mono text-sm"
                rows={10}
              />
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || !importContent.trim()}
              >
                {isImporting ? 'Importing...' : 'Import URLs'}
              </Button>
            </div>

            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> For {importFormat.toUpperCase()} format, use the template shown in the placeholder above.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="export" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>
              Export your knowledge base data in various formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select
                value={exportFormat}
                onValueChange={(value: ExportFormat) => setExportFormat(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      {getFormatIcon('json')}
                      JSON (Full data with metadata)
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      {getFormatIcon('csv')}
                      CSV (Tabular format)
                    </div>
                  </SelectItem>
                  <SelectItem value="txt">
                    <div className="flex items-center gap-2">
                      {getFormatIcon('txt')}
                      Plain Text (URLs only)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                'Exporting...'
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export All Data
                </>
              )}
            </Button>

            <div className="rounded-md bg-muted p-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Export formats:</strong>
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>JSON:</strong> Complete data including URLs, tags, metadata, and processing results</li>
                <li><strong>CSV:</strong> Spreadsheet-compatible format with URLs, tags, and basic metadata</li>
                <li><strong>Text:</strong> Simple list of URLs, one per line</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
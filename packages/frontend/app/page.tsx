'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UrlsTable } from '@/components/urls/urls-table'
import { AddUrlDialog } from '@/components/urls/add-url-dialog'
import { BatchOperationsPanel } from '@/components/urls/batch-operations'
import { TagManager } from '@/components/tags/tag-manager'
import { ProcessingQueue } from '@/components/processing/processing-queue'
import { ConfigPanel } from '@/components/config/config-panel'
import { ImportExportPanel } from '@/components/import-export/import-export-panel'
import { useKb3Store } from '@/lib/store'
import {
  Link,
  Tags,
  Settings,
  Activity,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react'

export default function Dashboard() {
  const { stats, fetchStats } = useKb3Store()
  const [activeTab, setActiveTab] = useState('urls')

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchStats])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total URLs</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUrls || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.processedUrls || 0} processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processing || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.queue || 0} in queue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failedUrls || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tags</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tags || 0}</div>
            <p className="text-xs text-muted-foreground">
              Categories created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="urls" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URLs
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="processing" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="import-export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Import/Export
            </TabsTrigger>
          </TabsList>

          {activeTab === 'urls' && <AddUrlDialog />}
        </div>

        <TabsContent value="urls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>URL Management</CardTitle>
              <CardDescription>
                Manage your knowledge base URLs, assign tags, and configure processing settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UrlsTable />
              <BatchOperationsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tag Management</CardTitle>
              <CardDescription>
                Organize your URLs with hierarchical tags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Queue</CardTitle>
              <CardDescription>
                Monitor active processing tasks and manage the queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProcessingQueue />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scraper & Cleaner Configuration</CardTitle>
              <CardDescription>
                Configure scraping and cleaning tools for optimal results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import & Export</CardTitle>
              <CardDescription>
                Import URLs from files or export your knowledge base data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportExportPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
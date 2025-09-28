'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useKb3Store } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'
import { Save, Plus, Trash2 } from 'lucide-react'

interface ScraperConfig {
  type: string
  enabled: boolean
  priority: number
  parameters: Record<string, any>
}

interface CleanerConfig {
  type: string
  enabled: boolean
  order: number
  parameters: Record<string, any>
}

export function ConfigPanel() {
  const [scraperConfigs, setScraperConfigs] = useState<ScraperConfig[]>([])
  const [cleanerConfigs, setCleanerConfigs] = useState<CleanerConfig[]>([])
  const [selectedScraper, setSelectedScraper] = useState<string>('http')
  const [selectedCleaner, setSelectedCleaner] = useState<string>('sanitize-html')

  const { fetchConfig, updateConfig } = useKb3Store()
  const { toast } = useToast()

  const availableScrapers = [
    { value: 'http', label: 'HTTP Scraper' },
    { value: 'playwright', label: 'Playwright Browser' },
    { value: 'crawl4ai', label: 'Crawl4AI' },
    { value: 'docling', label: 'Docling PDF' },
    { value: 'deep-doctection', label: 'Deep Doctection' },
  ]

  const availableCleaners = [
    { value: 'sanitize-html', label: 'Sanitize HTML' },
    { value: 'xss', label: 'XSS Cleaner' },
    { value: 'voca', label: 'Voca Text Normalizer' },
    { value: 'remark', label: 'Remark Markdown' },
    { value: 'readability', label: 'Readability Extractor' },
  ]

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const config = await fetchConfig()
      setScraperConfigs(config.scrapers || [])
      setCleanerConfigs(config.cleaners || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load configuration',
        variant: 'destructive',
      })
    }
  }

  const handleSaveConfig = async () => {
    try {
      await updateConfig({
        scrapers: scraperConfigs,
        cleaners: cleanerConfigs,
      })
      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      })
    }
  }

  const addScraperConfig = () => {
    setScraperConfigs([
      ...scraperConfigs,
      {
        type: selectedScraper,
        enabled: true,
        priority: scraperConfigs.length + 1,
        parameters: {},
      },
    ])
  }

  const removeScraperConfig = (index: number) => {
    setScraperConfigs(scraperConfigs.filter((_, i) => i !== index))
  }

  const updateScraperConfig = (index: number, updates: Partial<ScraperConfig>) => {
    setScraperConfigs(
      scraperConfigs.map((config, i) =>
        i === index ? { ...config, ...updates } : config
      )
    )
  }

  const addCleanerConfig = () => {
    setCleanerConfigs([
      ...cleanerConfigs,
      {
        type: selectedCleaner,
        enabled: true,
        order: cleanerConfigs.length + 1,
        parameters: {},
      },
    ])
  }

  const removeCleanerConfig = (index: number) => {
    setCleanerConfigs(cleanerConfigs.filter((_, i) => i !== index))
  }

  const updateCleanerConfig = (index: number, updates: Partial<CleanerConfig>) => {
    setCleanerConfigs(
      cleanerConfigs.map((config, i) =>
        i === index ? { ...config, ...updates } : config
      )
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="scrapers">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scrapers">Scrapers</TabsTrigger>
          <TabsTrigger value="cleaners">Cleaners</TabsTrigger>
        </TabsList>

        <TabsContent value="scrapers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scraper Configuration</CardTitle>
              <CardDescription>
                Configure content fetching tools and their priorities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedScraper} onValueChange={setSelectedScraper}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select scraper" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableScrapers.map((scraper) => (
                      <SelectItem key={scraper.value} value={scraper.value}>
                        {scraper.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addScraperConfig}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Scraper
                </Button>
              </div>

              <div className="space-y-2">
                {scraperConfigs.map((config, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-md"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {availableScrapers.find((s) => s.value === config.type)?.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Priority: {config.priority}
                      </div>
                    </div>
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) =>
                          updateScraperConfig(index, { enabled: e.target.checked })
                        }
                      />
                      Enabled
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeScraperConfig(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleaners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cleaner Configuration</CardTitle>
              <CardDescription>
                Configure text cleaning and sanitization pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedCleaner} onValueChange={setSelectedCleaner}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select cleaner" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCleaners.map((cleaner) => (
                      <SelectItem key={cleaner.value} value={cleaner.value}>
                        {cleaner.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addCleanerConfig}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Cleaner
                </Button>
              </div>

              <div className="space-y-2">
                {cleanerConfigs.map((config, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-md"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {availableCleaners.find((c) => c.value === config.type)?.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Order: {config.order}
                      </div>
                    </div>
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) =>
                          updateCleanerConfig(index, { enabled: e.target.checked })
                        }
                      />
                      Enabled
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCleanerConfig(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSaveConfig} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        Save Configuration
      </Button>
    </div>
  )
}
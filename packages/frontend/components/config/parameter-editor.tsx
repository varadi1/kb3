'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Settings,
  Save,
  RotateCcw,
  AlertCircle,
  Info,
  Check,
  X
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface ParameterSchema {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'select'
  description: string
  required?: boolean
  default?: any
  options?: Array<{ value: any; label: string }>
  min?: number
  max?: number
  properties?: Record<string, ParameterSchema>
  items?: ParameterSchema
  group?: string
}

export interface ScraperParameterSchema {
  scraperType: string
  displayName: string
  description: string
  parameters: Record<string, ParameterSchema>
  groups?: Array<{ name: string; label: string; description?: string }>
}

interface ParameterEditorProps {
  open: boolean
  onClose: () => void
  scraperType: string
  initialParameters?: Record<string, any>
  onSave: (parameters: Record<string, any>) => Promise<void>
  urlId?: string
}

export function ParameterEditor({
  open,
  onClose,
  scraperType,
  initialParameters = {},
  onSave,
  urlId
}: ParameterEditorProps) {
  const [schema, setSchema] = useState<ScraperParameterSchema | null>(null)
  const [parameters, setParameters] = useState<Record<string, any>>(initialParameters)
  const [defaults, setDefaults] = useState<Record<string, any>>({})
  const [validation, setValidation] = useState<{ valid: boolean; errors?: string[] }>({ valid: true })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState<string>('basic')
  const { toast } = useToast()

  useEffect(() => {
    if (open && scraperType) {
      loadSchema()
      loadDefaults()
    }
  }, [open, scraperType])

  useEffect(() => {
    setParameters(initialParameters || {})
  }, [initialParameters])

  const loadSchema = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/config/scrapers/${scraperType}/schema`)
      const data = await response.json()
      if (data.success) {
        setSchema(data.data)
        // Set first group as active if groups exist
        if (data.data.groups && data.data.groups.length > 0) {
          setActiveGroup(data.data.groups[0].name)
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load parameter schema',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDefaults = async () => {
    try {
      const response = await fetch(`/api/config/scrapers/${scraperType}/defaults`)
      const data = await response.json()
      if (data.success) {
        setDefaults(data.data)
        // Merge defaults with initial parameters
        setParameters(prev => ({ ...data.data, ...prev }))
      }
    } catch (error) {
      console.error('Failed to load defaults:', error)
    }
  }

  const validateParameters = async () => {
    try {
      const response = await fetch(`/api/config/scrapers/${scraperType}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters })
      })
      const data = await response.json()
      setValidation({
        valid: data.data.valid,
        errors: data.data.errors
      })
      return data.data.valid
    } catch (error) {
      console.error('Validation error:', error)
      return false
    }
  }

  const handleSave = async () => {
    const isValid = await validateParameters()
    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await onSave(parameters)
      toast({
        title: 'Success',
        description: 'Parameters saved successfully',
      })
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save parameters',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setParameters(defaults)
    setValidation({ valid: true })
  }

  const updateParameter = (key: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }))
    // Clear validation errors when user makes changes
    setValidation({ valid: true })
  }

  const updateNestedParameter = (parentKey: string, childKey: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [childKey]: value
      }
    }))
    setValidation({ valid: true })
  }

  const renderParameterInput = (
    key: string,
    param: ParameterSchema,
    value: any,
    isNested = false,
    parentKey = ''
  ) => {
    const handleChange = (newValue: any) => {
      if (isNested && parentKey) {
        updateNestedParameter(parentKey, key, newValue)
      } else {
        updateParameter(key, newValue)
      }
    }

    switch (param.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor={key} className="text-sm font-medium">
                {param.name}
                {param.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">{param.description}</p>
            </div>
            <Switch
              id={key}
              checked={value || false}
              onCheckedChange={handleChange}
            />
          </div>
        )

      case 'number':
        if (param.min !== undefined && param.max !== undefined) {
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={key} className="text-sm font-medium">
                  {param.name}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <span className="text-sm text-muted-foreground">{value || param.default}</span>
              </div>
              <Slider
                id={key}
                min={param.min}
                max={param.max}
                step={1}
                value={[value || param.default || param.min]}
                onValueChange={([v]) => handleChange(v)}
              />
              <p className="text-xs text-muted-foreground">{param.description}</p>
            </div>
          )
        }
        return (
          <div className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {param.name}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={key}
              type="number"
              value={value || ''}
              onChange={(e) => handleChange(parseFloat(e.target.value))}
              min={param.min}
              max={param.max}
            />
            <p className="text-xs text-muted-foreground">{param.description}</p>
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {param.name}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={value || param.default} onValueChange={handleChange}>
              <SelectTrigger id={key}>
                <SelectValue placeholder={`Select ${param.name}`} />
              </SelectTrigger>
              <SelectContent>
                {param.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{param.description}</p>
          </div>
        )

      case 'object':
        if (param.properties) {
          return (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {param.name}
                {param.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <div className="pl-4 border-l-2 border-muted space-y-3">
                {Object.entries(param.properties).map(([childKey, childParam]) => (
                  <div key={childKey}>
                    {renderParameterInput(
                      childKey,
                      childParam,
                      value?.[childKey],
                      true,
                      key
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{param.description}</p>
            </div>
          )
        }
        return null

      case 'string':
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {param.name}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={key}
              type="text"
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={param.default || `Enter ${param.name}`}
            />
            <p className="text-xs text-muted-foreground">{param.description}</p>
          </div>
        )
    }
  }

  const renderGroupedParameters = () => {
    if (!schema) return null

    const groups = schema.groups || [{ name: 'general', label: 'General Settings' }]
    const parametersByGroup: Record<string, Array<[string, ParameterSchema]>> = {}

    // Group parameters
    Object.entries(schema.parameters).forEach(([key, param]) => {
      const groupName = param.group || 'general'
      if (!parametersByGroup[groupName]) {
        parametersByGroup[groupName] = []
      }
      parametersByGroup[groupName].push([key, param])
    })

    return (
      <Tabs value={activeGroup} onValueChange={setActiveGroup}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${groups.length}, 1fr)` }}>
          {groups.map((group) => (
            <TabsTrigger key={group.name} value={group.name}>
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((group) => (
          <TabsContent key={group.name} value={group.name}>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {group.description && (
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                )}
                {parametersByGroup[group.name]?.map(([key, param]) => (
                  <div key={key}>
                    {renderParameterInput(key, param, parameters[key])}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure {schema?.displayName || scraperType} Parameters
            {urlId && <Badge variant="outline">URL: {urlId}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {schema?.description || 'Configure advanced parameters for this scraper'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {validation.errors && validation.errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Validation Errors:</p>
                      <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
                        {validation.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {renderGroupedParameters()}
            </>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Parameters
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
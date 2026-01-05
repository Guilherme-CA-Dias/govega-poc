"use client"

import { useState } from "react"
import { useAuth } from "@/app/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

interface AddFieldButtonProps {
  recordType: string
  onFieldAdded: () => void
}

interface FieldData {
  name: string
  title: string
  type: string
  options: string
}

export function AddFieldButton({ recordType, onFieldAdded }: AddFieldButtonProps) {
  const { customerId } = useAuth()
  const [open, setOpen] = useState(false)
  const [fieldData, setFieldData] = useState<FieldData>({
    name: '',
    title: '',
    type: 'string',
    options: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!customerId) {
      console.error('No customer ID found')
      return
    }

    try {
      const formId = recordType.replace('get-', '')
      
      // Create the field payload
      const fieldPayload = {
        name: fieldData.name,
        title: fieldData.title,
        type: fieldData.type,
        // For select type, convert comma-separated options to enum array
        ...(fieldData.type === 'select' && {
          enum: fieldData.options
            .split(',')
            .map(opt => opt.trim())
            .filter(Boolean)
        })
      }

      const response = await fetch(`/api/schema/${formId}/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: fieldPayload })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      setOpen(false)
      setFieldData({
        name: '',
        title: '',
        type: 'string',
        options: ''
      })
      onFieldAdded()
    } catch (error) {
      console.error('Error adding field:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-primary hover:bg-primary-600 transition-colors">
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-gray-950 border-border z-50">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Add New Field</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
              Field Name
            </Label>
            <Input
              id="name"
              value={fieldData.name}
              onChange={(e) => setFieldData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., status"
              className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-700 dark:text-gray-300">
              Display Title
            </Label>
            <Input
              id="title"
              value={fieldData.title}
              onChange={(e) => setFieldData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Status"
              className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type" className="text-gray-700 dark:text-gray-300">
              Field Type
            </Label>
            <select
              id="type"
              className="flex h-9 w-full rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-1 text-sm 
                ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                text-gray-900 dark:text-gray-50"
              value={fieldData.type}
              onChange={(e) => setFieldData(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="string">Text</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="select">Select</option>
            </select>
          </div>

          {/* Show options input only for select type */}
          {fieldData.type === 'select' && (
            <div className="space-y-2">
              <Label htmlFor="options" className="text-gray-700 dark:text-gray-300">
                Options (comma-separated)
              </Label>
              <Input
                id="options"
                value={fieldData.options}
                onChange={(e) => setFieldData(prev => ({ ...prev, options: e.target.value }))}
                placeholder="e.g., Active, Inactive, Pending"
                className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                required
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter options separated by commas
              </p>
            </div>
          )}

          <Button 
            type="submit"
            className="w-full bg-primary hover:bg-primary-600 transition-colors"
          >
            Add Field
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 
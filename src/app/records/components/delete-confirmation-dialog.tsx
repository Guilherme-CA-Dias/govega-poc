import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from "@/components/ui/dialog"
  import { Button } from "@/components/ui/button"
  import { Loader2 } from "lucide-react"
  import { Record } from "@/types/record"
  import { useIntegrationApp, useIntegrations } from "@integration-app/react"
  import { getAuthHeaders } from "@/lib/fetch-utils"
  
  interface DeleteConfirmationDialogProps {
    record: Record | null
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    onRecordDeleted?: () => void
  }
  
  // Helper function to get the display ID (ExternalId from fields, or fallback to id)
  function getDisplayId(record: Record | null): string {
    if (!record) return '';
    if (record.fields?.ExternalId) {
      return record.fields.ExternalId;
    }
    return record.id || '';
  }

  export function DeleteConfirmationDialog({
    record,
    isOpen,
    onClose,
    onConfirm,
    onRecordDeleted
  }: DeleteConfirmationDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [selectedIntegrationKey, setSelectedIntegrationKey] = useState<string>("")
    const [error, setError] = useState<string | null>(null)

    const integrationApp = useIntegrationApp();
    const { integrations } = useIntegrations();

    // Filter integrations to only show those with connections
    const availableIntegrations = integrations.filter((integration) => integration.connection);

    // Set default integration key when dialog opens
    useEffect(() => {
      if (isOpen && availableIntegrations.length > 0 && !selectedIntegrationKey) {
        const firstIntegration = availableIntegrations[0];
        if (firstIntegration?.key) {
          setSelectedIntegrationKey(firstIntegration.key);
        }
      }
    }, [isOpen, availableIntegrations, selectedIntegrationKey]);
  
    const handleConfirm = async () => {
      if (!record) return
      
      if (!selectedIntegrationKey) {
        setError("Please select an integration");
        return;
      }
      
      setIsDeleting(true)
      setError(null)
      try {
        // Use the MongoDB id for deletion
        const recordId = record.id;
        
        // Delete using the new endpoint
        const response = await fetch(`/api/records/delete?id=${encodeURIComponent(recordId)}&integrationKey=${encodeURIComponent(selectedIntegrationKey)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        })
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete record');
        }
        
        // Notify parent components
        onRecordDeleted?.()
        onConfirm()
        onClose()
      } catch (error) {
        console.error('Error deleting record:', error)
        setError(error instanceof Error ? error.message : 'Failed to delete record')
      } finally {
        setIsDeleting(false)
      }
    }
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this record? This action cannot be undone.
              </p>
              <p className="mt-2 text-sm font-medium">
                Record ID: <span className="font-mono">{getDisplayId(record)}</span>
              </p>
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
            {availableIntegrations.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Integration</label>
                <select
                  value={selectedIntegrationKey}
                  onChange={(e) => setSelectedIntegrationKey(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  disabled={isDeleting}
                >
                  {availableIntegrations.map((integration) => (
                    <option key={integration.key} value={integration.key}>
                      {integration.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="bg-gray-100 text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="bg-red-100 text-red-700 hover:bg-red-200"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Record'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  } 
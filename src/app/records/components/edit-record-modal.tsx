import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSchema } from "@/hooks/useSchema";
import { Record } from "@/types/record";
import { Loader2 } from "lucide-react";
import { DataInput } from "@integration-app/react";
import type { DataSchema } from "@integration-app/sdk";
import { useIntegrationApp, useIntegrations } from "@integration-app/react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getAuthHeaders } from "@/lib/fetch-utils";
import { Minimizer } from "@/components/ui/minimizer";

interface EditRecordModalProps {
	record: Record;
	isOpen: boolean;
	onClose: () => void;
	onComplete: () => void;
}

interface FieldChange {
	fieldName: string;
	oldValue: any;
	newValue: any;
	timestamp: string;
}

export function EditRecordModal({
	record,
	isOpen,
	onClose,
	onComplete,
}: EditRecordModalProps) {
	const [formData, setFormData] = useState<Record>({ ...record });
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fieldChanges, setFieldChanges] = useState<FieldChange[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [selectedIntegrationKey, setSelectedIntegrationKey] =
		useState<string>("");

	const integrationApp = useIntegrationApp();
	const { integrations } = useIntegrations();

	// Get schema for the record type
	const {
		schema,
		isLoading: schemaLoading,
		error: schemaError,
	} = useSchema(record.recordType);

	// Filter integrations to only show those with connections
	const availableIntegrations = integrations.filter(
		(integration) => integration.connection
	);

	// Empty variables schema (can be extended later if needed)
	const variablesSchema: DataSchema = {
		type: "object",
		properties: {},
	};

	// Set default integration key when modal opens
	useEffect(() => {
		if (isOpen && availableIntegrations.length > 0 && !selectedIntegrationKey) {
			const firstIntegration = availableIntegrations[0];
			if (firstIntegration?.key) {
				setSelectedIntegrationKey(firstIntegration.key);
			}
		}
	}, [isOpen, availableIntegrations, selectedIntegrationKey]);

	// Reset form data when record changes
	useEffect(() => {
		setFormData({ ...record });
		setError(null); // Clear any previous errors
	}, [record]);

	const handleFieldChange = (value: unknown) => {
		if (!formData?.fields) return;

		const newFields = value as { [key: string]: any };

		// Compare old and new values to track changes
		Object.entries(newFields).forEach(([fieldName, newValue]) => {
			const oldValue = formData.fields?.[fieldName];
			if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
				setFieldChanges((prev) => [
					...prev,
					{
						fieldName,
						oldValue,
						newValue,
						timestamp: new Date().toISOString(),
					},
				]);
			}
		});

		setFormData({
			...formData,
			fields: newFields,
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (isSubmitting) return; // Prevent double submission

		if (!selectedIntegrationKey) {
			setError("Please select an integration");
			return;
		}

		setIsSubmitting(true);
		setError(null); // Clear any previous errors

		try {
			// Use ExternalId from fields if available, otherwise use id
			const accountId = record.fields?.ExternalId || record.id;

			// Call the update API endpoint
			const response = await fetch("/api/records/update", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...getAuthHeaders(),
				},
				body: JSON.stringify({
					integrationKey: selectedIntegrationKey,
					id: accountId,
					fields: formData.fields || {},
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to update account");
			}

			// Use setTimeout to avoid flushSync issues
			setTimeout(() => {
				onComplete();
				setFieldChanges([]);
				onClose();
			}, 0);
		} catch (error) {
			console.error("Error updating record:", error);
			setError(
				error instanceof Error ? error.message : "Failed to update record"
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (schemaError) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Error Loading Form</DialogTitle>
					</DialogHeader>
					<p className="text-red-500">
						{schemaError?.message || "Failed to load. Please try again."}
					</p>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[900px] h-[80vh] bg-white dark:bg-gray-800">
				<DialogHeader className="space-y-1.5">
					<DialogTitle className="text-lg font-semibold">
						Edit Record - ID:{" "}
						{formData?.fields?.ExternalId || formData?.id || "N/A"}
					</DialogTitle>
				</DialogHeader>
				{schemaLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				) : (
					<ScrollArea className="h-[calc(80vh-8rem)]">
						<form onSubmit={handleSubmit} className="space-y-4">
							{error && (
								<div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
									<p className="text-red-600 dark:text-red-400 text-sm">
										{error}
									</p>
								</div>
							)}
							{availableIntegrations.length > 0 && (
								<div className="space-y-2">
									<label className="text-sm font-medium">Integration</label>
									<select
										value={selectedIntegrationKey}
										onChange={(e) => setSelectedIntegrationKey(e.target.value)}
										className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
										disabled={isSubmitting}
									>
										{availableIntegrations.map((integration) => (
											<option key={integration.key} value={integration.key}>
												{integration.name}
											</option>
										))}
									</select>
								</div>
							)}
							{schema && formData && (
								<div className="space-y-2 pt-4">
									<Minimizer title="Edit Account Fields" defaultOpen={true}>
										<div
											className="relative z-[1] isolate"
											onFocus={(e) => e.stopPropagation()}
											onBlur={(e) => e.stopPropagation()}
										>
											<DataInput
												schema={schema as DataSchema}
												value={formData.fields || {}}
												variablesSchema={variablesSchema}
												onChange={handleFieldChange}
											/>
										</div>
									</Minimizer>
								</div>
							)}
							<DialogFooter className="gap-2 sm:gap-0">
								<Button
									type="button"
									variant="outline"
									className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-red-700 dark:hover:bg-red-700 dark:hover:text-red-100"
									onClick={onClose}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									className="bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100 hover:bg-blue-200 hover:text-blue-800 dark:hover:bg-blue-800 dark:hover:text-blue-100"
									disabled={isSubmitting || schemaLoading}
								>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Saving...
										</>
									) : (
										"Save Changes"
									)}
								</Button>
							</DialogFooter>
						</form>
					</ScrollArea>
				)}
			</DialogContent>
		</Dialog>
	);
}

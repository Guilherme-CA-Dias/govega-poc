"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useIntegrationApp, useIntegrations, DataInput } from "@integration-app/react";
import type { DataSchema } from "@integration-app/sdk";
import { useAuth } from "@/app/auth-provider";
import { useSchema } from "@/hooks/useSchema";
import { RECORD_ACTIONS } from "@/lib/constants";
import { getAuthHeaders } from "@/lib/fetch-utils";
import { Minimizer } from "@/components/ui/minimizer";

export default function CreateAccountPage() {
	const { customerId } = useAuth();
	const integrationApp = useIntegrationApp();
	const { integrations } = useIntegrations();
	const [selectedIntegrationKey, setSelectedIntegrationKey] = useState<string>("");
	const [formData, setFormData] = useState<Record<string, any>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [errorData, setErrorData] = useState<any>(null);
	const [success, setSuccess] = useState(false);
	const [successData, setSuccessData] = useState<any>(null);

	// Get the accounts schema
	const { schema, isLoading: schemaLoading, error: schemaError } = useSchema("get-accounts");

	// Filter integrations to only show those with connections
	const availableIntegrations = integrations.filter((integration) => integration.connection);

	// Filter out ID and read-only fields from the schema for the form
	const getFormSchema = () => {
		if (!schema) return null;

		const formSchema = { ...schema };
		if (formSchema.properties) {
			// Remove ID field and read-only fields
			const filteredProperties: Record<string, any> = {};
			Object.entries(formSchema.properties).forEach(([key, value]: [string, any]) => {
				if (key !== "id" && !value.readOnly) {
					filteredProperties[key] = value;
				}
			});
			formSchema.properties = filteredProperties;
		}
		return formSchema;
	};

	const formSchema = getFormSchema();

	// Empty variables schema (can be extended later if needed)
	const variablesSchema: DataSchema = {
		type: 'object',
		properties: {},
	};

	const handleFieldChange = (value: unknown) => {
		setFormData(value as Record<string, any>);
		setError(null);
		setErrorData(null);
		setSuccess(false);
		setSuccessData(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedIntegrationKey) {
			setError("Please select an integration");
			return;
		}

		if (!formData || Object.keys(formData).length === 0) {
			setError("Please fill in at least one field");
			return;
		}

		setIsSubmitting(true);
		setError(null);
		setSuccess(false);

		try {
			const response = await fetch("/api/records/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...getAuthHeaders(),
				},
				body: JSON.stringify({
					integrationKey: selectedIntegrationKey,
					fields: formData,
				}),
			});

		if (!response.ok) {
			const errorResponse = await response.json();
			setError(errorResponse.error || "Failed to create account");
			setErrorData(errorResponse.errorData || null);
			return;
		}

			const result = await response.json();
			setSuccess(true);
			setSuccessData(result.data || null);
			setFormData({});
			setSelectedIntegrationKey("");

			// Reset form after 5 seconds
			setTimeout(() => {
				setSuccess(false);
				setSuccessData(null);
			}, 5000);
		} catch (error) {
			console.error("Error creating account:", error);
			setError(error instanceof Error ? error.message : "Failed to create account");
			setErrorData(null);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="container mx-auto py-10 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
				<p className="text-muted-foreground mt-2">
					Create a new account in your connected third-party system
				</p>
			</div>

			{/* Integration Selection */}
			<div className="space-y-2">
				<Label htmlFor="integration-select">Select Integration</Label>
				<select
					id="integration-select"
					value={selectedIntegrationKey}
					onChange={(e) => {
						setSelectedIntegrationKey(e.target.value);
						setError(null);
						setErrorData(null);
						setSuccess(false);
						setSuccessData(null);
					}}
					className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
				>
					<option value="">Select an integration...</option>
					{availableIntegrations.map((integration) => (
						<option key={integration.key} value={integration.key}>
							{integration.name}
						</option>
					))}
				</select>
				{availableIntegrations.length === 0 && (
					<p className="text-sm text-muted-foreground">
						No connected integrations found. Please connect an integration first.
					</p>
				)}
			</div>

			{/* Form */}
			{selectedIntegrationKey && (
					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="space-y-2">
								<div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
									<p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
								</div>
								{errorData && (
									<Minimizer 
										title="Error Details" 
										defaultOpen={false}
										className="border-red-200 dark:border-red-800"
										titleClassName="bg-red-50 dark:bg-red-900/20"
										icon={<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
									>
										<div className="space-y-2">
											{errorData.data?.Fault?.Error && Array.isArray(errorData.data.Fault.Error) && (
												<div className="space-y-2">
													{errorData.data.Fault.Error.map((err: any, index: number) => (
														<div key={index} className="text-sm">
															{err.Message && (
																<p className="text-red-600 dark:text-red-400 font-medium mb-1">
																	{err.Message}
																</p>
															)}
															{err.Detail && (
																<p className="text-red-500 dark:text-red-500/80 text-xs mb-2">
																	{err.Detail}
																</p>
															)}
															{err.code && (
																<p className="text-red-400 dark:text-red-600 text-xs">
																	Error Code: {err.code}
																</p>
															)}
														</div>
													))}
												</div>
											)}
											<div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
												<p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Full Error Data:</p>
												<pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-96">
													{JSON.stringify(errorData, null, 2)}
												</pre>
											</div>
										</div>
									</Minimizer>
								)}
							</div>
						)}

						{success && (
							<div className="space-y-2">
								<div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
									<p className="text-green-600 dark:text-green-400 text-sm font-medium">
										Account created successfully!
									</p>
								</div>
								{successData && (
									<Minimizer 
										title="Response Data" 
										defaultOpen={false}
										className="border-green-200 dark:border-green-800"
										titleClassName="bg-green-50 dark:bg-green-900/20"
										icon={<CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
									>
										<div className="space-y-2">
											{successData.id && (
												<div className="text-sm">
													<p className="text-green-600 dark:text-green-400 font-medium mb-1">
														Account ID: <span className="font-mono">{successData.id}</span>
													</p>
												</div>
											)}
											<div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
												<p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Full Response Data:</p>
												<pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-96">
													{JSON.stringify(successData, null, 2)}
												</pre>
											</div>
										</div>
									</Minimizer>
								)}
							</div>
						)}

						{schemaLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin" />
							</div>
						) : schemaError ? (
							<div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
								<p className="text-red-600 dark:text-red-400 text-sm">
									{schemaError?.message || "Failed to load form schema"}
								</p>
							</div>
						) : formSchema ? (
							<div className='space-y-2 pt-4'>
								<Minimizer title="Configure Account" defaultOpen={true}>
									<div
										className='relative z-[1] isolate'
										onFocus={(e) => e.stopPropagation()}
										onBlur={(e) => e.stopPropagation()}
									>
										<DataInput
											schema={formSchema as DataSchema}
											value={formData}
											variablesSchema={variablesSchema}
											onChange={handleFieldChange}
										/>
									</div>
								</Minimizer>
							</div>
						) : null}

						<div className="flex gap-4">
							<Button
								type="submit"
								disabled={isSubmitting || schemaLoading || !selectedIntegrationKey}
								className="bg-blue-600 hover:bg-blue-700 text-white"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating...
									</>
								) : (
									"Create Account"
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
								onClick={() => {
									setFormData({});
									setError(null);
									setErrorData(null);
									setSuccess(false);
									setSuccessData(null);
								}}
								disabled={isSubmitting}
							>
								Reset
							</Button>
						</div>
					</form>
			)}
		</div>
	);
}

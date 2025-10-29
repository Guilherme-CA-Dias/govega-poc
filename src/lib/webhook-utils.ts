import { RECORD_ACTIONS } from "@/lib/constants";

interface WebhookPayloadData {
	id: string;
	name?: string;
	websiteUrl?: string;
	phones?: Array<{
		value: string;
		type: string;
	}>;
	primaryPhone?: string;
	description?: string;
	currency?: string;
	industry?: string;
	ownerId?: string;
	primaryAddress?: {
		type?: string;
		full?: string;
		street?: string;
		city?: string;
		state?: string;
		country?: string;
		zip?: string;
	};
	addresses?: Array<{
		type?: string;
		full?: string;
		street?: string;
		city?: string;
		state?: string;
		country?: string;
		zip?: string;
	}>;
	numberOfEmployees?: number;
	createdTime?: string;
	createdBy?: string;
	updatedTime?: string;
	updatedBy?: string;
	lastActivityTime?: string;
}

interface WebhookPayload {
	type: "created" | "updated" | "deleted";
	data: WebhookPayloadData;
	customerId: string;
	internalContactId?: string;
	externalContactId?: string;
}

// Define webhook URLs for default record types
const WEBHOOK_URLS = {
	contacts:
		"https://api.integration.app/webhooks/app-events/5cce9363-f191-489c-a738-a8e196be0b3e",
	companies:
		"https://api.integration.app/webhooks/app-events/cd9f4430-8f4e-45a4-badd-9d4666078540",
	// Default URL for custom objects
	custom:
		"https://api.integration.app/webhooks/app-events/19c8f829-0723-4030-9164-95398285f5da",
};

// Get default form types from RECORD_ACTIONS
const defaultFormTypes = RECORD_ACTIONS.filter(
	(action) => action.type === "default"
).map((action) => action.key.replace("get-", ""));

export async function sendToWebhook(payload: any) {
	try {
		// Determine if this is a default or custom record type
		const recordType = payload.data?.recordType || "";

		// Check if it's a default type by looking at the full action key
		const isDefaultType = RECORD_ACTIONS.some(
			(action) => action.key === recordType
		);

		// Get the form type (remove 'get-' prefix for webhook URL lookup)
		const formType = recordType.replace("get-", "");

		console.log(
			`Webhook routing - recordType: ${recordType}, formType: ${formType}, isDefaultType: ${isDefaultType}`
		);

		// Select the appropriate webhook URL
		let webhookUrl = WEBHOOK_URLS.custom;
		if (isDefaultType && formType in WEBHOOK_URLS) {
			webhookUrl = WEBHOOK_URLS[formType as keyof typeof WEBHOOK_URLS];
		}

		console.log(`Selected webhook URL: ${webhookUrl}`);

		// Validate webhook URL
		if (!webhookUrl || webhookUrl.trim() === "") {
			throw new Error(
				`No webhook URL configured for record type: ${recordType}`
			);
		}

		// For custom objects, add instanceKey to the payload
		let finalPayload = { ...payload };
		if (!isDefaultType) {
			finalPayload = {
				...finalPayload,
				instanceKey: formType,
			};
		}

		// Send the webhook
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(finalPayload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Webhook failed (${response.status}):`, errorText);
			throw new Error(
				`Webhook failed: ${response.status} ${response.statusText}`
			);
		}

		// Try to parse JSON response
		const contentType = response.headers.get("content-type");
		if (contentType && contentType.includes("application/json")) {
			return await response.json();
		} else {
			// If not JSON, return the text response
			return await response.text();
		}
	} catch (error) {
		console.error("Error sending webhook:", error);
		throw error;
	}
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";
import { getIntegrationClient } from "@/lib/integration-app-client";
import { RECORD_ACTIONS } from "@/lib/constants";

export async function POST(request: NextRequest) {
	try {
		const auth = getAuthFromRequest(request);
		if (!auth.customerId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { integrationKey, fields } = body;

		if (!integrationKey) {
			return NextResponse.json(
				{ error: "Integration key is required" },
				{ status: 400 }
			);
		}

		if (!fields || typeof fields !== "object") {
			return NextResponse.json(
				{ error: "Fields are required" },
				{ status: 400 }
			);
		}

		const client = await getIntegrationClient(auth);

		// Find connection by integration key
		const connectionsResponse = await client.connections.find();
		const connection = connectionsResponse.items?.find(
			(conn) => conn.integration?.key === integrationKey
		);

		if (!connection) {
			return NextResponse.json(
				{ error: `No connection found for integration: ${integrationKey}` },
				{ status: 404 }
			);
		}

		// Get the action key from RECORD_ACTIONS
		const recordAction = RECORD_ACTIONS.find(
			(action) => action.key === "get-accounts"
		);
		if (!recordAction) {
			return NextResponse.json(
				{ error: "Account action not found in configuration" },
				{ status: 500 }
			);
		}

		// Run the create action
		// The action name should be 'create-ledger-account' based on user's request
		const result = await client
			.connection(connection.id)
			.action("create-ledger-account")
			.run({ fields: fields });

		return NextResponse.json({
			success: true,
			data: result.output,
		});
	} catch (error) {
		console.error("Error creating account:", error);

		// Extract error data if it's an IntegrationApp error
		let errorData = null;
		let errorMessage =
			error instanceof Error ? error.message : "Failed to create account";

		if (
			error &&
			typeof error === "object" &&
			"isIntegrationAppError" in error &&
			error.isIntegrationAppError
		) {
			// Extract the full error data structure
			if ("data" in error && error.data) {
				errorData = error.data;

				// Try to extract a more user-friendly message from the error data
				// Handle QuickBooks-style error structure: data.data.Fault.Error[0].Message
				if (errorData && typeof errorData === "object" && "data" in errorData) {
					const innerData = errorData.data;
					if (
						innerData &&
						typeof innerData === "object" &&
						"Fault" in innerData
					) {
						const fault = innerData.Fault;
						if (
							fault &&
							typeof fault === "object" &&
							"Error" in fault &&
							Array.isArray(fault.Error) &&
							fault.Error.length > 0
						) {
							const firstError = fault.Error[0];
							if (
								firstError &&
								typeof firstError === "object" &&
								"Message" in firstError
							) {
								errorMessage = firstError.Message as string;
							}
						}
					}
				}
			}
		}

		return NextResponse.json(
			{
				error: errorMessage,
				errorData: errorData,
			},
			{ status: 500 }
		);
	}
}

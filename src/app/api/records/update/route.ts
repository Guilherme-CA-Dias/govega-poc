import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";
import { getIntegrationClient } from "@/lib/integration-app-client";

export async function PUT(request: NextRequest) {
	try {
		const auth = getAuthFromRequest(request);
		if (!auth.customerId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { integrationKey, id, fields } = body;

		if (!integrationKey) {
			return NextResponse.json(
				{ error: "Integration key is required" },
				{ status: 400 }
			);
		}

		if (!id) {
			return NextResponse.json(
				{ error: "Account ID is required" },
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

		// Run the update action
		// The action name should be 'update-ledger-account' based on user's request
		const result = await client
			.connection(connection.id)
			.action("update-ledger-account")
			.run({
				input: {
					id,
					fields,
				},
			});

		return NextResponse.json({
			success: true,
			data: result.output,
		});
	} catch (error) {
		console.error("Error updating account:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to update account",
			},
			{ status: 500 }
		);
	}
}


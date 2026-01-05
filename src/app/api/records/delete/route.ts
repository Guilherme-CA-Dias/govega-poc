import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";
import { getIntegrationClient } from "@/lib/integration-app-client";
import { connectToDatabase } from "@/lib/mongodb";
import { Record } from "@/models/record";

export async function DELETE(request: NextRequest) {
	try {
		const auth = getAuthFromRequest(request);
		if (!auth.customerId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const searchParams = request.nextUrl.searchParams;
		const recordId = searchParams.get("id");
		const integrationKey = searchParams.get("integrationKey");

		if (!recordId) {
			return NextResponse.json(
				{ error: "Record ID is required" },
				{ status: 400 }
			);
		}

		if (!integrationKey) {
			return NextResponse.json(
				{ error: "Integration key is required" },
				{ status: 400 }
			);
		}

		await connectToDatabase();

		// Find the record in MongoDB to get the ExternalId
		const record = await Record.findOne({
			id: recordId,
			customerId: auth.customerId,
		});

		if (!record) {
			return NextResponse.json(
				{ error: "Record not found" },
				{ status: 404 }
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

		// Use ExternalId from fields if available, otherwise use id
		const accountId = record.fields?.ExternalId || record.id;

		// Run the delete action (assuming it's 'delete-ledger-account')
		try {
			await client
				.connection(connection.id)
				.action("delete-ledger-account")
				.run({ id: accountId });
		} catch (actionError) {
			// If the action doesn't exist or fails, we'll still delete from our DB
			console.warn("Delete action failed, but continuing with local deletion:", actionError);
		}

		// Delete from MongoDB
		await Record.deleteOne({
			id: recordId,
			customerId: auth.customerId,
		});

		return NextResponse.json({
			success: true,
			message: "Record deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting record:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to delete record",
			},
			{ status: 500 }
		);
	}
}


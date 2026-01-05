export const DEFAULT_SCHEMAS = {
	accounts: {
		properties: {
			id: { type: "string", title: "ID", readOnly: true },
			name: { type: "string", title: "Name" },
			code: { type: "string", title: "Code" },
			description: { type: "string", title: "Description" },
			classification: {
				type: "string",
				title: "Classification",
				enum: ["Asset", "Liability", "Equity", "Revenue", "Expense"],
			},
			type: { type: "string", title: "Type" },
			status: {
				type: "string",
				title: "Status",
				enum: ["Active", "Inactive", "Archived"],
			},
			currentBalance: { type: "number", title: "Current Balance" },
			currency: { type: "string", title: "Currency" },
			taxRateId: { type: "string", title: "Tax Rate ID" },
			companyId: { type: "string", title: "Company ID" },
			createdTime: {
				type: "string",
				title: "Created Time",
				format: "date-time",
				readOnly: true,
			},
			createdBy: { type: "string", title: "Created By", readOnly: true },
			updatedTime: {
				type: "string",
				title: "Updated Time",
				format: "date-time",
				readOnly: true,
			},
			updatedBy: { type: "string", title: "Updated By", readOnly: true },
		},
		required: ["id", "name"],
	},
} as const;

export type DefaultFormType = keyof typeof DEFAULT_SCHEMAS;

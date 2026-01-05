export const RECORD_ACTIONS = [
	{
		key: "get-accounts",
		name: "Accounts",
		type: "default",
	},
] as const;

export type RecordActionKey = (typeof RECORD_ACTIONS)[number]["key"] | string;

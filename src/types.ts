export type RunInputEvent = [
	"input",
	{
		node: {
			id: string;
		};
		inputArguments: {
			schema: Schema;
		};
	},
	next: string
];

export function isRunInputEvent(event: RunEvent): event is RunInputEvent {
	return event[0] === "input";
}

export type RunOutputEvent = [
	"output",
	{
		node: {
			id: string;
			configuration?: {
				schema?: Schema;
			};
		};
		outputs: Record<string, unknown>;
	},
	next: string
];
export function isRunOutputEvent(event: RunEvent): event is RunOutputEvent {
	return event[0] === "output";
}

export function processRunEvent(event: RunInputEvent | RunOutputEvent): {
	event: Record<string, unknown>;
	next: string;
} {
	return {
		event: event[1],
		next: event[2],
	};
}

export function isInputOrOutputEvent(
	event: RunEvent
): event is RunInputEvent | RunOutputEvent {
	return isRunInputEvent(event) || isRunOutputEvent(event);
}

export type RunErrorEvent = ["error", message: string];
export function isRunErrorEvent(event: RunEvent): event is RunErrorEvent {
	return event[0] === "error";
}

export type RunEvent = RunInputEvent | RunOutputEvent | RunErrorEvent;
export function isRunEvent(event: RunEvent): event is RunEvent {
	return (
		isRunInputEvent(event) || isRunOutputEvent(event) || isRunErrorEvent(event)
	);
}

export interface Schema {
	title?: string;
	description?: string;
	type?: string | string[];
	properties?: Record<string, Schema>;
	required?: string[];
	behavior?: string[];
}

export interface LLMContent {
	role?: string;
	parts: Array<{
		text: string;
	}>;
}

export interface BoardListEntry {
	title: string;
	description?: string;
	path: string;
	username: string;
	readonly: boolean;
	mine: boolean;
	tags: string[];
}

export interface BreadboardConfig {
	baseUrl: string;
	apiKey: string;
}

export interface BoardRequest {
	user: string;
	board: string;
	data?: Record<string, unknown>;
	next?: string;
}

export interface BoardDescribeResponse {
	inputSchema: Schema;
	outputSchema: Schema;
	title?: string;
	description?: string;
	metadata?: Record<string, unknown>;
}

export interface BoardCreateResponse {
	path: string;
}

export interface BoardDeleteResponse {
	deleted: string;
}

export interface BoardUpdateResponse {
	created: string;
}

export interface BoardInvitesResponse {
	invites: string[];
}

export interface BoardInviteCreateResponse {
	invite: string;
}

export interface BoardInviteDeleteResponse {
	deleted: string;
}

/**
 * Response for assets/drive API request
 */
export interface AssetsDriveResponse {
	part: {
		fileData: {
			fileUri: string;
			mimeType: string;
		};
	};
}

export interface GraphDescriptor {
	title?: string;
	description?: string;
	metadata?: Record<string, unknown>;
	nodes: NodeDescriptor[];
	edges: EdgeDescriptor[];
	main?: string;
}

export interface NodeDescriptor {
	id: string;
	type: string;
	configuration?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
}

export interface EdgeDescriptor {
	from: string;
	to: string;
	out?: string;
	in?: string;
	metadata?: Record<string, unknown>;
}

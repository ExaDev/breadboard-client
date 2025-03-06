import {
	chunkRepairTransform,
	runEventDecoder,
	serverStreamEventDecoder,
} from "./transforms";
import {
	BoardDescribeResponse,
	BoardListEntry,
	BoardRequest,
	BreadboardConfig,
	GraphDescriptor,
	RunEvent,
} from "./types";

/**
 * BreadboardClient class for making API calls
 */
export class BreadboardClient {
	private baseUrl: string;
	private apiKey: string;

	constructor(config: BreadboardConfig) {
		this.baseUrl = config.baseUrl;
		this.apiKey = config.apiKey;
	}

	/**
	 * List available boards
	 */
	async listBoards(): Promise<BoardListEntry[]> {
		const response = await fetch(
			`${this.baseUrl}/boards?API_KEY=${this.apiKey}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to list boards: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Run a board and return a stream of events
	 */
	async runBoard({
		user,
		board,
		data = {},
		next,
	}: BoardRequest): Promise<ReadableStream<RunEvent>> {
		const response = await fetch(
			`${this.baseUrl}/boards/@${user}/${board}.api/run`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					$key: this.apiKey,
					$next: next,
					...data,
				}),
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to run board: ${response.statusText}`);
		}

		if (!response.body) {
			throw new Error("No response body received");
		}

		return response.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(chunkRepairTransform())
			.pipeThrough(serverStreamEventDecoder())
			.pipeThrough(runEventDecoder());
	}

	/**
	 * Run a board and collect all events
	 */
	async runBoardAndCollect({
		user,
		board,
		data = {},
		next,
	}: BoardRequest): Promise<RunEvent[]> {
		return BreadboardClient.collectStreamEvents(
			await this.runBoard({ user, board, data, next })
		);
	}

	/**
	 * Invoke a board (one-shot interaction)
	 */
	async invokeBoard({
		user,
		board,
		data,
	}: BoardRequest): Promise<ReadableStream<RunEvent>> {
		const response = await fetch(
			`${this.baseUrl}/boards/@${user}/${board}.api/invoke`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					$key: this.apiKey,
					...data,
				}),
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to invoke board: ${response.statusText}`);
		}

		if (!response.body) {
			throw new Error("No response body received");
		}

		return response.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(chunkRepairTransform())
			.pipeThrough(serverStreamEventDecoder())
			.pipeThrough(runEventDecoder());
	}

	/**
	 * Get a board's raw JSON
	 */
	async getBoard(user: string, board: string): Promise<GraphDescriptor> {
		const response = await fetch(
			`${this.baseUrl}/boards/@${user}/${board}.json`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					$key: this.apiKey,
				},
			}
		);
		if (!response.ok) {
			throw new Error(`Failed to get board: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Get board description and metadata
	 */
	async describeBoard({
		user,
		board,
	}: {
		user: string;
		board: string;
	}): Promise<BoardDescribeResponse> {
		board = board.endsWith(".json") ? board.slice(0, -5) : board;
		user = user.startsWith("@") ? user.slice(1) : user;
		board = board.replace(`@${user}/`, "");
		const describeBoardApiUrl = `${this.baseUrl}/boards/@${user}/${board}.api/describe`;
		const response = await fetch(describeBoardApiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				$key: this.apiKey,
			},
		});
		if (!response.ok) {
			throw new Error(
				`Failed to describe board: ${response.statusText} (${describeBoardApiUrl})`
			);
		}
		return response.json();
	}

	/**
	 * Get the next token from events
	 */
	static getNextToken(events: RunEvent[]): string | undefined {
		// Reverse the events to get the last input or output event with a next token
		for (let i = events.length - 1; i >= 0; i--) {
			const event = events[i];
			if ((event[0] === "input" || event[0] === "output") && event.length > 2) {
				return event[2];
			}
		}
		return undefined;
	}

	/**
	 * Collect all events from a stream
	 */
	static async collectStreamEvents(
		stream: ReadableStream<RunEvent>
	): Promise<RunEvent[]> {
		const reader = stream.getReader();
		const events: RunEvent[] = [];

		let done = false;
		while (!done) {
			const { value, done: isDone } = await reader.read();
			done = isDone;
			``;
			if (value) {
				events.push(value);
			}
		}

		return events;
	}
}

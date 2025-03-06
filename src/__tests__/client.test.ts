import { BreadboardClient } from "../client";
import type { RunEvent } from "../types";
import {
	BOARD_ID,
	BREADBOARD_API_KEY,
	BREADBOARD_SERVER_URL,
	BREADBOARD_USER,
} from "../util";

// Mock fetch for testing
global.fetch = jest.fn();

describe("BreadboardClient", () => {
	const config = {
		baseUrl: BREADBOARD_SERVER_URL,
		apiKey: BREADBOARD_API_KEY,
	};

	beforeEach(() => {
		(global.fetch as jest.Mock).mockClear();
	});

	test("should list boards", async () => {
		const mockResponse = [
			{
				title: "Test Board",
				path: "test/path",
				username: "user",
				readonly: false,
				mine: true,
				tags: [],
			},
		];

		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const client = new BreadboardClient(config);
		const result = await client.listBoards();

		expect(global.fetch).toHaveBeenCalledWith(
			`${config.baseUrl}/boards?API_KEY=${config.apiKey}`,
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					"Content-Type": "application/json",
				}),
			})
		);

		expect(result).toEqual(mockResponse);
	});

	test("should handle errors when listing boards", async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			statusText: "Not Found",
		});

		const client = new BreadboardClient(config);

		await expect(client.listBoards()).rejects.toThrow(
			"Failed to list boards: Not Found"
		);
	});

	test("should run a board", async () => {
		const mockReadableStream = new ReadableStream({
			start(controller) {
				controller.close();
			},
		});

		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			body: mockReadableStream,
		});

		const client = new BreadboardClient(config);
		await client.runBoard({
			user: BREADBOARD_USER,
			board: BOARD_ID,
			data: { input: "test" },
			next: "token123",
		});

		expect(global.fetch).toHaveBeenCalledWith(
			`${config.baseUrl}/boards/@${BREADBOARD_USER}/${BOARD_ID}.api/run`,
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					$key: config.apiKey,
					$next: "token123",
					input: "test",
				}),
			})
		);
	});

	test("should handle errors when running a board", async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			statusText: "Bad Request",
		});

		const client = new BreadboardClient(config);

		await expect(
			client.runBoard({
				user: BREADBOARD_USER,
				board: BOARD_ID,
			})
		).rejects.toThrow("Failed to run board: Bad Request");
	});

	test("should handle missing response body when running a board", async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			body: null,
		});

		const client = new BreadboardClient(config);

		await expect(
			client.runBoard({
				user: BREADBOARD_USER,
				board: BOARD_ID,
			})
		).rejects.toThrow("No response body received");
	});

	test("should run a board and collect events", async () => {
		const events: RunEvent[] = [
			[
				"input",
				{ node: { id: "test" }, inputArguments: { schema: {} } },
				"next1",
			],
			["output", { node: { id: "test" }, outputs: {} }, "next2"],
		];

		// Mock implementation of runBoard to return a stream with our test events
		const mockStream = new ReadableStream({
			start(controller) {
				events.forEach((event) => controller.enqueue(event));
				controller.close();
			},
		});

		const client = new BreadboardClient(config);
		const spy = jest.spyOn(client, "runBoard").mockResolvedValue(mockStream);

		const result = await client.runBoardAndCollect({
			user: BREADBOARD_USER,
			board: BOARD_ID,
			data: { input: "test" },
		});

		expect(spy).toHaveBeenCalled();
		expect(result).toEqual(events);

		spy.mockRestore();
	});

	test("should invoke a board", async () => {
		const mockReadableStream = new ReadableStream({
			start(controller) {
				controller.close();
			},
		});

		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			body: mockReadableStream,
		});

		const client = new BreadboardClient(config);
		await client.invokeBoard({
			user: BREADBOARD_USER,
			board: BOARD_ID,
			data: { input: "test" },
		});

		expect(global.fetch).toHaveBeenCalledWith(
			`${config.baseUrl}/boards/@${BREADBOARD_USER}/${BOARD_ID}.api/invoke`,
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					$key: config.apiKey,
					input: "test",
				}),
			})
		);
	});

	test("should handle errors when invoking a board", async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			statusText: "Bad Request",
		});

		const client = new BreadboardClient(config);

		await expect(
			client.invokeBoard({
				user: BREADBOARD_USER,
				board: BOARD_ID,
			})
		).rejects.toThrow("Failed to invoke board: Bad Request");
	});

	test("should handle missing response body when invoking a board", async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			body: null,
		});

		const client = new BreadboardClient(config);

		await expect(
			client.invokeBoard({
				user: BREADBOARD_USER,
				board: BOARD_ID,
			})
		).rejects.toThrow("No response body received");
	});

	test("should get a board", async () => {
		const mockResponse = {
			title: "Test Board",
			nodes: [],
			edges: [],
		};

		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const client = new BreadboardClient(config);
		const result = await client.getBoard(BREADBOARD_USER, BOARD_ID);

		expect(global.fetch).toHaveBeenCalledWith(
			`${config.baseUrl}/boards/@${BREADBOARD_USER}/${BOARD_ID}.json`,
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					"Content-Type": "application/json",
					$key: config.apiKey,
				}),
			})
		);

		expect(result).toEqual(mockResponse);
	});

	test("should handle errors when getting a board", async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			statusText: "Not Found",
		});

		const client = new BreadboardClient(config);

		await expect(client.getBoard(BREADBOARD_USER, BOARD_ID)).rejects.toThrow(
			"Failed to get board: Not Found"
		);
	});

	test("should describe a board", async () => {
		const mockResponse = {
			inputSchema: {},
			outputSchema: {},
			title: "Test Board",
		};

		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const client = new BreadboardClient(config);
		const result = await client.describeBoard({
			user: BREADBOARD_USER,
			board: BOARD_ID,
		});

		expect(global.fetch).toHaveBeenCalledWith(
			`${config.baseUrl}/boards/@${BREADBOARD_USER}/${BOARD_ID}.api/describe`,
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"Content-Type": "application/json",
					$key: config.apiKey,
				}),
			})
		);

		expect(result).toEqual(mockResponse);
	});

	test("should cleanup board ID and user when describing a board", async () => {
		const mockResponse = {
			inputSchema: {},
			outputSchema: {},
		};

		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const client = new BreadboardClient(config);

		// Test with .json suffix and @ prefix
		await client.describeBoard({
			user: `@${BREADBOARD_USER}`,
			board: `${BOARD_ID}.json`,
		});

		expect(global.fetch).toHaveBeenCalledWith(
			`${config.baseUrl}/boards/@${BREADBOARD_USER}/${BOARD_ID}.api/describe`,
			expect.any(Object)
		);
	});

	test("should handle errors when describing a board", async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			statusText: "Not Found",
		});

		const client = new BreadboardClient(config);

		await expect(
			client.describeBoard({
				user: BREADBOARD_USER,
				board: BOARD_ID,
			})
		).rejects.toThrow("Failed to describe board: Not Found");
	});

	test("should collect stream events", async () => {
		const events: RunEvent[] = [
			[
				"input",
				{ node: { id: "test" }, inputArguments: { schema: {} } },
				"next1",
			],
			["output", { node: { id: "test" }, outputs: {} }, "next2"],
		];

		const mockStream = new ReadableStream({
			start(controller) {
				events.forEach((event) => controller.enqueue(event));
				controller.close();
			},
		});

		const result = await BreadboardClient.collectStreamEvents(mockStream);
		expect(result).toEqual(events);
	});

	test("should get next token from events", () => {
		const events: RunEvent[] = [
			[
				"input",
				{ node: { id: "test" }, inputArguments: { schema: {} } },
				"next1",
			],
			["output", { node: { id: "test" }, outputs: {} }, "next2"],
		];

		const token = BreadboardClient.getNextToken(events);
		expect(token).toBe("next2");
	});

	test("should return undefined when no next token is available", () => {
		const events: RunEvent[] = [["error", "Some error occurred"]];

		const token = BreadboardClient.getNextToken(events);
		expect(token).toBeUndefined();
	});
});

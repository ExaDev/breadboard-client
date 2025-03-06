import { BreadboardClient } from "../client";
import type { RunEvent } from "../types";
import { BREADBOARD_API_KEY, BREADBOARD_SERVER_URL } from "../util";

describe("BreadboardClient", () => {
	const config = {
		baseUrl: BREADBOARD_SERVER_URL,
		apiKey: BREADBOARD_API_KEY,
	};

	// beforeEach(() => {
	// 	global.fetch = jest.fn();
	// });

	// afterEach(() => {
	// 	jest.resetAllMocks();
	// });

	test("should list boards", async () => {
		const client = new BreadboardClient(config);
		const result = await client.listBoards();
		expect(Array.isArray(result)).toBeTruthy();
		expect(result[0]).toHaveProperty("title");
		expect(result[0]).toHaveProperty("path");
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
});

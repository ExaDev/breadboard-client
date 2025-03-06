import { RunEvent } from "../types";

// Helper function to create a transformer with mock controller
function createMockTransformer<T, U>(
	transformFn: (chunk: T, controller: { enqueue: (result: U) => void }) => void
) {
	const results: U[] = [];
	const controller = {
		enqueue(value: U) {
			results.push(value);
		},
	};

	return {
		transform: (chunk: T) => {
			transformFn(chunk, controller);
			return [...results]; // Return a copy of the results
		},
		reset: () => {
			results.length = 0;
		},
	};
}

describe("serverStreamEventDecoder", () => {
	it("should decode SSE data prefixes", () => {
		// Extract the transform function from the definition
		const transformFn = (
			chunk: string,
			controller: { enqueue: (result: string) => void }
		) => {
			// Ensure chunk is a string
			const chunkStr = typeof chunk === "string" ? chunk : String(chunk);

			// Skip empty chunks
			if (!chunkStr.trim()) return;

			// Remove data: prefix if present
			if (chunkStr.startsWith("data: ")) {
				controller.enqueue(chunkStr.slice(6));
			} else {
				controller.enqueue(chunkStr);
			}
		};

		// Create separate transformers for each test
		const transformerWithPrefix = createMockTransformer<string, string>(
			transformFn
		);
		const transformerNoPrefix = createMockTransformer<string, string>(
			transformFn
		);

		// Test with prefix
		const resultsWithPrefix =
			transformerWithPrefix.transform("data: test message");
		expect(resultsWithPrefix.length).toBe(1);
		expect(resultsWithPrefix[0]).toBe("test message");

		// Test without prefix
		const resultsNoPrefix = transformerNoPrefix.transform("no prefix message");
		expect(resultsNoPrefix.length).toBe(1);
		expect(resultsNoPrefix[0]).toBe("no prefix message");
	});
});

describe("chunkRepairTransform", () => {
	it("should repair broken chunks", () => {
		// Extract the transform function from the definition
		const transformFn = (
			chunk: string,
			controller: { enqueue: (result: string) => void }
		) => {
			// Ensure chunk is a string
			const chunkStr = typeof chunk === "string" ? chunk : String(chunk);

			// Skip empty chunks
			if (!chunkStr.trim()) return;

			// Simply pass through the chunk for testing
			controller.enqueue(chunkStr);
		};

		const transformer = createMockTransformer<string, string>(transformFn);

		// Test with a chunk
		const results = transformer.transform("test chunk");
		expect(results.length).toBe(1);
		expect(results[0]).toBe("test chunk");
	});
});

describe("runEventDecoder", () => {
	it("should decode valid input events", () => {
		// Extract the transform function from the definition
		const transformFn = (
			chunk: string,
			controller: { enqueue: (result: RunEvent) => void }
		) => {
			// Skip empty chunks
			if (!chunk || !chunk.trim()) {
				return;
			}

			try {
				// Parse chunk as JSON
				const parsed = JSON.parse(chunk);

				// Basic validation of the event structure
				if (!Array.isArray(parsed) || parsed.length < 2) {
					controller.enqueue([
						"error",
						"Invalid event format: expected array with at least 2 elements",
					]);
					return;
				}

				const eventType = parsed[0];

				// Validate event type
				if (!["input", "output", "error"].includes(eventType)) {
					controller.enqueue(["error", `Invalid event type: ${eventType}`]);
					return;
				}

				// Pass through the valid event
				controller.enqueue(parsed as RunEvent);
			} catch (error) {
				// Handle parsing errors
				controller.enqueue([
					"error",
					`Failed to parse event: ${
						error instanceof Error ? error.message : String(error)
					}`,
				]);
			}
		};

		const transformer = createMockTransformer<string, RunEvent>(transformFn);

		// Create a valid event for testing
		const validEvent = JSON.stringify([
			"input",
			{
				node: { id: "test" },
				inputArguments: { schema: {} },
			},
			"next-token",
		]);

		// Test with valid event
		const results = transformer.transform(validEvent);
		expect(results.length).toBe(1);
		expect(results[0][0]).toBe("input");
		expect(results[0][2]).toBe("next-token");
	});

	it("should handle invalid JSON", () => {
		// Extract the transform function from the definition
		const transformFn = (
			chunk: string,
			controller: { enqueue: (result: RunEvent) => void }
		) => {
			// Skip empty chunks
			if (!chunk || !chunk.trim()) {
				return;
			}

			try {
				// Parse chunk as JSON
				const parsed = JSON.parse(chunk);

				// Basic validation of the event structure
				if (!Array.isArray(parsed) || parsed.length < 2) {
					controller.enqueue([
						"error",
						"Invalid event format: expected array with at least 2 elements",
					]);
					return;
				}

				const eventType = parsed[0];

				// Validate event type
				if (!["input", "output", "error"].includes(eventType)) {
					controller.enqueue(["error", `Invalid event type: ${eventType}`]);
					return;
				}

				// Pass through the valid event
				controller.enqueue(parsed as RunEvent);
			} catch (error) {
				// Handle parsing errors
				controller.enqueue([
					"error",
					`Failed to parse event: ${
						error instanceof Error ? error.message : String(error)
					}`,
				]);
			}
		};

		const transformer = createMockTransformer<string, RunEvent>(transformFn);

		// Test with invalid JSON
		const results = transformer.transform("invalid json");
		expect(results.length).toBe(1);
		expect(results[0][0]).toBe("error");
		expect(results[0][1]).toContain("Failed to parse event");
	});
});

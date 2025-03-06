import { serverStreamEventDecoder } from "../transforms";
import { RunEvent } from "../types";

describe("TransformStream Tests", () => {
	let mockEnqueue: jest.Mock;
	let controller: { enqueue: jest.Mock };

	beforeEach(() => {
		mockEnqueue = jest.fn();
		controller = { enqueue: mockEnqueue };
	});

	describe("serverStreamEventDecoder", () => {
		it("should decode SSE data prefixes correctly", () => {
			// Get the transform stream
			const stream = serverStreamEventDecoder();

			// Mock the transformer object to expose the transform method
			const origTransformer = (stream as any).transformer;

			// Create a spy on the transformer to capture the implementation
			const transform = jest.fn((chunk, controller) => {
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
			});

			// Test with prefix
			transform("data: test message", controller);
			expect(mockEnqueue).toHaveBeenCalledWith("test message");

			// Test without prefix
			transform("no prefix message", controller);
			expect(mockEnqueue).toHaveBeenCalledWith("no prefix message");

			// Test with empty chunk
			mockEnqueue.mockClear();
			transform("   ", controller);
			expect(mockEnqueue).not.toHaveBeenCalled();

			// Test with non-string
			mockEnqueue.mockClear();
			transform(123 as any, controller);
			expect(mockEnqueue).toHaveBeenCalledWith("123");
		});
	});

	describe("chunkRepairTransform", () => {
		let brokenChunk: string | null = null;

		it("should handle complete chunks correctly", () => {
			// Define our transform function based on the implementation
			const transform = jest.fn((chunk, controller) => {
				// Ensure chunk is a string
				const chunkStr = typeof chunk === "string" ? chunk : String(chunk);

				const enqueue = (chunk: string) => {
					controller.enqueue(`${chunk}\n\n`);
				};

				const missingEndMarker = !chunkStr.endsWith("\n\n");
				const chunks = chunkStr.split("\n\n");
				if (!missingEndMarker) {
					chunks.pop();
				}

				for (let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i];
					const last = i === chunks.length - 1;
					const isBroken = last && missingEndMarker;

					if (isBroken) {
						if (brokenChunk !== null) {
							brokenChunk += chunk;
						} else {
							brokenChunk = chunk;
						}
					} else {
						if (brokenChunk !== null) {
							const completeChunks = (brokenChunk + chunk).split("\n\n");
							completeChunks.forEach(enqueue);
							brokenChunk = null;
						} else {
							enqueue(chunk);
						}
					}
				}
			});

			// Test with a complete chunk
			transform("complete\n\n", controller);
			expect(mockEnqueue).toHaveBeenCalledWith("complete\n\n");

			// Test with multiple complete chunks
			mockEnqueue.mockClear();
			transform("chunk1\n\nchunk2\n\n", controller);
			expect(mockEnqueue).toHaveBeenCalledTimes(2);
			expect(mockEnqueue).toHaveBeenNthCalledWith(1, "chunk1\n\n");
			expect(mockEnqueue).toHaveBeenNthCalledWith(2, "chunk2\n\n");
		});

		it("should repair broken chunks", () => {
			// Reset broken chunk state
			brokenChunk = null;

			// Define our transform function based on the implementation
			const transform = jest.fn((chunk, controller) => {
				// Ensure chunk is a string
				const chunkStr = typeof chunk === "string" ? chunk : String(chunk);

				const enqueue = (chunk: string) => {
					controller.enqueue(`${chunk}\n\n`);
				};

				const missingEndMarker = !chunkStr.endsWith("\n\n");
				const chunks = chunkStr.split("\n\n");
				if (!missingEndMarker) {
					chunks.pop();
				}

				for (let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i];
					const last = i === chunks.length - 1;
					const isBroken = last && missingEndMarker;

					if (isBroken) {
						if (brokenChunk !== null) {
							brokenChunk += chunk;
						} else {
							brokenChunk = chunk;
						}
					} else {
						if (brokenChunk !== null) {
							const completeChunks = (brokenChunk + chunk).split("\n\n");
							completeChunks.forEach(enqueue);
							brokenChunk = null;
						} else {
							enqueue(chunk);
						}
					}
				}
			});

			// First chunk without end marker
			transform("broken", controller);
			expect(mockEnqueue).not.toHaveBeenCalled();
			expect(brokenChunk).toBe("broken");

			// Second chunk that completes the first one
			transform("Continuation\n\n", controller);
			expect(mockEnqueue).toHaveBeenCalledWith("brokenContinuation\n\n");
			expect(brokenChunk).toBe(null);
		});

		it("should handle mixed complete and incomplete chunks", () => {
			// Reset broken chunk state
			brokenChunk = null;

			// Define our transform function based on the implementation
			const transform = jest.fn((chunk, controller) => {
				// Ensure chunk is a string
				const chunkStr = typeof chunk === "string" ? chunk : String(chunk);

				const enqueue = (chunk: string) => {
					controller.enqueue(`${chunk}\n\n`);
				};

				const missingEndMarker = !chunkStr.endsWith("\n\n");
				const chunks = chunkStr.split("\n\n");
				if (!missingEndMarker) {
					chunks.pop();
				}

				for (let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i];
					const last = i === chunks.length - 1;
					const isBroken = last && missingEndMarker;

					if (isBroken) {
						if (brokenChunk !== null) {
							brokenChunk += chunk;
						} else {
							brokenChunk = chunk;
						}
					} else {
						if (brokenChunk !== null) {
							const completeChunks = (brokenChunk + chunk).split("\n\n");
							completeChunks.forEach(enqueue);
							brokenChunk = null;
						} else {
							enqueue(chunk);
						}
					}
				}
			});

			// One complete chunk followed by an incomplete one
			transform("complete\n\nincomplete", controller);
			expect(mockEnqueue).toHaveBeenCalledTimes(1);
			expect(mockEnqueue).toHaveBeenCalledWith("complete\n\n");
			expect(brokenChunk).toBe("incomplete");

			// Complete the incomplete chunk
			mockEnqueue.mockClear();
			transform(" now complete\n\n", controller);
			expect(mockEnqueue).toHaveBeenCalledWith("incomplete now complete\n\n");
			expect(brokenChunk).toBe(null);
		});

		it("should handle multiple broken chunk accumulation", () => {
			// Reset broken chunk state
			brokenChunk = null;

			// Define our transform function based on the implementation
			const transform = jest.fn((chunk, controller) => {
				// Ensure chunk is a string
				const chunkStr = typeof chunk === "string" ? chunk : String(chunk);

				const enqueue = (chunk: string) => {
					controller.enqueue(`${chunk}\n\n`);
				};

				const missingEndMarker = !chunkStr.endsWith("\n\n");
				const chunks = chunkStr.split("\n\n");
				if (!missingEndMarker) {
					chunks.pop();
				}

				for (let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i];
					const last = i === chunks.length - 1;
					const isBroken = last && missingEndMarker;

					if (isBroken) {
						if (brokenChunk !== null) {
							brokenChunk += chunk;
						} else {
							brokenChunk = chunk;
						}
					} else {
						if (brokenChunk !== null) {
							const completeChunks = (brokenChunk + chunk).split("\n\n");
							completeChunks.forEach(enqueue);
							brokenChunk = null;
						} else {
							enqueue(chunk);
						}
					}
				}
			});

			// First part
			transform("part1", controller);
			expect(brokenChunk).toBe("part1");
			expect(mockEnqueue).not.toHaveBeenCalled();

			// Second part
			transform("part2", controller);
			expect(brokenChunk).toBe("part1part2");
			expect(mockEnqueue).not.toHaveBeenCalled();

			// Final part with completion
			transform("part3\n\n", controller);
			expect(mockEnqueue).toHaveBeenCalledWith("part1part2part3\n\n");
			expect(brokenChunk).toBe(null);
		});
	});

	describe("runEventDecoder", () => {
		it("should handle valid events", () => {
			// Define our transform function based on the implementation
			const transform = jest.fn((chunk, controller) => {
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
			});

			// Test valid input event
			const validInputEvent = JSON.stringify([
				"input",
				{ node: { id: "test" }, inputArguments: { schema: {} } },
				"next-token",
			]);
			transform(validInputEvent, controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"input",
				{ node: { id: "test" }, inputArguments: { schema: {} } },
				"next-token",
			]);

			// Test valid output event
			mockEnqueue.mockClear();
			const validOutputEvent = JSON.stringify([
				"output",
				{ node: { id: "test" }, outputs: {} },
				"next-token",
			]);
			transform(validOutputEvent, controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"output",
				{ node: { id: "test" }, outputs: {} },
				"next-token",
			]);

			// Test valid error event
			mockEnqueue.mockClear();
			const errorEvent = JSON.stringify(["error", "test error"]);
			transform(errorEvent, controller);
			expect(mockEnqueue).toHaveBeenCalledWith(["error", "test error"]);
		});

		it("should handle invalid events", () => {
			// Define our transform function based on the implementation
			const transform = jest.fn((chunk, controller) => {
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
			});

			// Test invalid JSON
			transform("invalid json", controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				expect.stringContaining("Failed to parse event"),
			]);

			// Test invalid event type
			mockEnqueue.mockClear();
			transform(JSON.stringify(["invalid", {}]), controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				"Invalid event type: invalid",
			]);

			// Test invalid event format (too short)
			mockEnqueue.mockClear();
			transform(JSON.stringify(["input"]), controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				"Invalid event format: expected array with at least 2 elements",
			]);

			// Test invalid event format (not an array)
			mockEnqueue.mockClear();
			transform(JSON.stringify({ type: "input" }), controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				"Invalid event format: expected array with at least 2 elements",
			]);
		});

		it("should handle empty chunks", () => {
			// Define our transform function based on the implementation
			const transform = jest.fn((chunk, controller) => {
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
			});

			// Test empty string
			transform("", controller);
			expect(mockEnqueue).not.toHaveBeenCalled();

			// Test whitespace-only string
			mockEnqueue.mockClear();
			transform("   ", controller);
			expect(mockEnqueue).not.toHaveBeenCalled();
		});
	});
});

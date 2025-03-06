/**
 * Direct tests for the transform functions - tests the actual implementations
 * to improve code coverage
 */
import {
	transformChunkRepair,
	transformRunEvent,
	transformServerEvent,
} from "../transforms";

describe("Direct Transform Function Tests", () => {
	describe("transformServerEvent", () => {
		it("should decode SSE data prefixes", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			// Test with prefix
			transformServerEvent("data: test message", controller);
			expect(mockEnqueue).toHaveBeenCalledWith("test message");

			// Test without prefix
			transformServerEvent("no prefix message", controller);
			expect(mockEnqueue).toHaveBeenCalledWith("no prefix message");
		});

		it("should skip empty chunks", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			transformServerEvent("", controller);
			transformServerEvent("   ", controller);
			expect(mockEnqueue).not.toHaveBeenCalled();
		});

		it("should handle non-string inputs", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			transformServerEvent(123, controller);
			expect(mockEnqueue).toHaveBeenCalledWith("123");

			mockEnqueue.mockClear();
			transformServerEvent(null, controller);
			expect(mockEnqueue).toHaveBeenCalledWith("null");
		});
	});

	describe("transformChunkRepair", () => {
		it("should process complete chunks", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };
			let brokenChunk: string | null = null;
			const setBrokenChunk = (value: string | null) => {
				brokenChunk = value;
			};

			transformChunkRepair(
				"complete\n\n",
				controller,
				brokenChunk,
				setBrokenChunk
			);
			expect(mockEnqueue).toHaveBeenCalledWith("complete\n\n");
		});

		it("should process multiple complete chunks", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };
			let brokenChunk: string | null = null;
			const setBrokenChunk = (value: string | null) => {
				brokenChunk = value;
			};

			transformChunkRepair(
				"chunk1\n\nchunk2\n\n",
				controller,
				brokenChunk,
				setBrokenChunk
			);
			expect(mockEnqueue).toHaveBeenCalledTimes(2);
			expect(mockEnqueue).toHaveBeenNthCalledWith(1, "chunk1\n\n");
			expect(mockEnqueue).toHaveBeenNthCalledWith(2, "chunk2\n\n");
		});

		it("should store and repair broken chunks", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };
			let brokenChunk: string | null = null;
			const setBrokenChunk = (value: string | null) => {
				brokenChunk = value;
			};

			// First chunk (broken)
			transformChunkRepair("broken", controller, brokenChunk, setBrokenChunk);
			expect(mockEnqueue).not.toHaveBeenCalled();
			expect(brokenChunk).toBe("broken");

			// Second chunk (completes the first)
			transformChunkRepair(
				"continuation\n\n",
				controller,
				brokenChunk,
				setBrokenChunk
			);
			expect(mockEnqueue).toHaveBeenCalledWith("brokencontinuation\n\n");
			expect(brokenChunk).toBe(null);
		});

		it("should handle mixed complete and broken chunks", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };
			let brokenChunk: string | null = null;
			const setBrokenChunk = (value: string | null) => {
				brokenChunk = value;
			};

			transformChunkRepair(
				"complete\n\nbroken",
				controller,
				brokenChunk,
				setBrokenChunk
			);
			expect(mockEnqueue).toHaveBeenCalledTimes(1);
			expect(mockEnqueue).toHaveBeenCalledWith("complete\n\n");
			expect(brokenChunk).toBe("broken");
		});

		it("should append to existing broken chunks", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };
			let brokenChunk: string | null = "existing";
			const setBrokenChunk = (value: string | null) => {
				brokenChunk = value;
			};

			transformChunkRepair("addition", controller, brokenChunk, setBrokenChunk);
			expect(mockEnqueue).not.toHaveBeenCalled();
			expect(brokenChunk).toBe("existingaddition");
		});

		it("should handle multiple complete chunks from broken chunk concatenation", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };
			let brokenChunk: string | null = "part1\n\npart2";
			const setBrokenChunk = (value: string | null) => {
				brokenChunk = value;
			};

			transformChunkRepair("\n\n", controller, brokenChunk, setBrokenChunk);
			expect(mockEnqueue).toHaveBeenCalledTimes(2);
			expect(mockEnqueue).toHaveBeenNthCalledWith(1, "part1\n\n");
			expect(mockEnqueue).toHaveBeenNthCalledWith(2, "part2\n\n");
			expect(brokenChunk).toBe(null);
		});

		it("should handle empty strings with brokenChunk", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };
			let brokenChunk: string | null = "existing";
			const setBrokenChunk = (value: string | null) => {
				brokenChunk = value;
			};

			transformChunkRepair("", controller, brokenChunk, setBrokenChunk);
			expect(mockEnqueue).not.toHaveBeenCalled();
			expect(brokenChunk).toBe("existing");
		});

		it("should handle non-string chunks", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };
			let brokenChunk: string | null = null;
			const setBrokenChunk = (value: string | null) => {
				brokenChunk = value;
			};

			transformChunkRepair(123, controller, brokenChunk, setBrokenChunk);
			expect(mockEnqueue).not.toHaveBeenCalled();
			expect(brokenChunk).toBe("123");
		});
	});

	describe("transformRunEvent", () => {
		it("should process valid input events", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			const validEvent = JSON.stringify([
				"input",
				{ node: { id: "test" }, inputArguments: { schema: {} } },
				"next-token",
			]);

			transformRunEvent(validEvent, controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"input",
				{ node: { id: "test" }, inputArguments: { schema: {} } },
				"next-token",
			]);
		});

		it("should process valid output events", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			const validEvent = JSON.stringify([
				"output",
				{ node: { id: "test" }, outputs: {} },
				"next-token",
			]);

			transformRunEvent(validEvent, controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"output",
				{ node: { id: "test" }, outputs: {} },
				"next-token",
			]);
		});

		it("should process valid error events", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			const validEvent = JSON.stringify(["error", "test error"]);

			transformRunEvent(validEvent, controller);
			expect(mockEnqueue).toHaveBeenCalledWith(["error", "test error"]);
		});

		it("should handle invalid JSON", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			transformRunEvent("invalid json", controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				expect.stringContaining("Failed to parse event"),
			]);
		});

		it("should handle JSON parse errors in different formats", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			// Test with a string that isn't valid JSON but causes different error messages
			transformRunEvent("{malformed: json}", controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				expect.stringContaining("Failed to parse event"),
			]);

			// Test with invalid token
			mockEnqueue.mockClear();
			transformRunEvent('{"invalid": "json"', controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				expect.stringContaining("Failed to parse event"),
			]);
		});

		it("should validate event structure", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			// Array too short
			transformRunEvent(JSON.stringify(["input"]), controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				"Invalid event format: expected array with at least 2 elements",
			]);

			// Not an array
			mockEnqueue.mockClear();
			transformRunEvent(JSON.stringify({ type: "input" }), controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				"Invalid event format: expected array with at least 2 elements",
			]);
		});

		it("should validate event type", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			transformRunEvent(JSON.stringify(["invalid", {}]), controller);
			expect(mockEnqueue).toHaveBeenCalledWith([
				"error",
				"Invalid event type: invalid",
			]);
		});

		it("should skip empty chunks", () => {
			const mockEnqueue = jest.fn();
			const controller = { enqueue: mockEnqueue };

			transformRunEvent("", controller);
			transformRunEvent("   ", controller);
			expect(mockEnqueue).not.toHaveBeenCalled();
		});
	});
});

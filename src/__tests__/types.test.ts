import type { RunEvent, RunInputEvent, RunOutputEvent } from "../types";
import {
	isInputOrOutputEvent,
	isRunErrorEvent,
	isRunEvent,
	isRunInputEvent,
	isRunOutputEvent,
	processRunEvent,
} from "../types";

describe("Type Guards", () => {
	const inputEvent: RunInputEvent = [
		"input",
		{ node: { id: "test" }, inputArguments: { schema: {} } },
		"next",
	];

	const outputEvent: RunOutputEvent = [
		"output",
		{ node: { id: "test" }, outputs: {} },
		"next",
	];

	const errorEvent: RunEvent = ["error", "test error"];

	it("should correctly identify input events", () => {
		expect(isRunInputEvent(inputEvent)).toBe(true);
		expect(isRunInputEvent(outputEvent)).toBe(false);
		expect(isRunInputEvent(errorEvent)).toBe(false);
	});

	it("should correctly identify output events", () => {
		expect(isRunOutputEvent(outputEvent)).toBe(true);
		expect(isRunOutputEvent(inputEvent)).toBe(false);
		expect(isRunOutputEvent(errorEvent)).toBe(false);
	});

	it("should correctly identify error events", () => {
		expect(isRunErrorEvent(errorEvent)).toBe(true);
		expect(isRunErrorEvent(inputEvent)).toBe(false);
		expect(isRunErrorEvent(outputEvent)).toBe(false);
	});

	it("should correctly identify input or output events", () => {
		expect(isInputOrOutputEvent(inputEvent)).toBe(true);
		expect(isInputOrOutputEvent(outputEvent)).toBe(true);
		expect(isInputOrOutputEvent(errorEvent)).toBe(false);
	});

	it("should correctly identify any run event", () => {
		expect(isRunEvent(inputEvent)).toBe(true);
		expect(isRunEvent(outputEvent)).toBe(true);
		expect(isRunEvent(errorEvent)).toBe(true);

		// Test with a non-run event (this is just for type checking, in practice it would never be called this way)
		const nonEvent = ["something-else", {}] as unknown as RunEvent;
		expect(isRunEvent(nonEvent)).toBe(false);
	});

	it("should process run events correctly", () => {
		const processedInput = processRunEvent(inputEvent);
		expect(processedInput).toHaveProperty("event");
		expect(processedInput).toHaveProperty("next");
		expect(processedInput.next).toBe("next");
		expect(processedInput.event).toEqual(inputEvent[1]);

		const processedOutput = processRunEvent(outputEvent);
		expect(processedOutput.next).toBe("next");
		expect(processedOutput.event).toEqual(outputEvent[1]);
	});
});

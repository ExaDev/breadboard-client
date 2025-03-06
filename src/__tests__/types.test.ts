import type { RunEvent, RunInputEvent, RunOutputEvent } from "../types";
import {
	isRunErrorEvent,
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

	it("should process run events correctly", () => {
		const processed = processRunEvent(inputEvent);
		expect(processed).toHaveProperty("event");
		expect(processed).toHaveProperty("next");
		expect(processed.next).toBe("next");
	});
});

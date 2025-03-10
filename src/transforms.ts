import { RunEvent } from "./types";

/**
 * Transform stream to decode server events
 */
export function serverStreamEventDecoder(): TransformStream<string, string> {
	return new TransformStream<string, string>({
		transform(chunk, controller) {
			// Use the testable function
			return transformServerEvent(chunk, controller);
		},
	});
}

/**
 * Testable version of the serverStreamEventDecoder transform function
 */
export function transformServerEvent(
	chunk: unknown,
	controller: { enqueue: (chunk: string) => void }
): void {
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
}

/**
 * Transform stream to repair broken chunks
 */
export function chunkRepairTransform(): TransformStream<string, string> {
	let brokenChunk: string | null = null;

	return new TransformStream<string, string>({
		transform(chunk, controller) {
			// Use the testable function
			return transformChunkRepair(
				chunk,
				controller,
				brokenChunk,
				(newValue: string | null) => {
					brokenChunk = newValue;
				}
			);
		},
	});
}

/**
 * Testable version of the chunkRepairTransform transform function
 */
export function transformChunkRepair(
	chunk: unknown,
	controller: { enqueue: (chunk: string) => void },
	brokenChunk: string | null,
	setBrokenChunk: (value: string | null) => void
): void {
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
				setBrokenChunk(brokenChunk + chunk);
			} else {
				setBrokenChunk(chunk);
			}
		} else {
			if (brokenChunk !== null) {
				const completeChunks = (brokenChunk + chunk).split("\n\n");
				completeChunks.forEach(enqueue);
				setBrokenChunk(null);
			} else {
				enqueue(chunk);
			}
		}
	}
}

/**
 * Transform stream to decode run events
 */
export function runEventDecoder(): TransformStream<string, RunEvent> {
	return new TransformStream<string, RunEvent>({
		transform(chunk, controller) {
			// Use the testable function
			return transformRunEvent(chunk, controller);
		},
	});
}

/**
 * Testable version of the runEventDecoder transform function
 */
export function transformRunEvent(
	chunk: string,
	controller: { enqueue: (event: RunEvent) => void }
): void {
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
}

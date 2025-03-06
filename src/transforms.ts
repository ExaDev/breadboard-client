import { RunEvent } from "./types";

/**
 * Transform stream to decode server events
 */
export function serverStreamEventDecoder(): TransformStream<string, string> {
	return new TransformStream<string, string>({
		transform(chunk, controller) {
			// Ensure chunk is a string
			const chunkStr = typeof chunk === "string" ? chunk : String(chunk);

			if (chunkStr.startsWith("data: ")) {
				controller.enqueue(chunkStr.slice(6));
			} else if (chunkStr.trim() !== "") {
				console.warn("Received SSE chunk without data prefix:", chunkStr);
				controller.enqueue(chunkStr);
			}
		},
	});
}

/**
 * Transform stream to repair broken chunks
 */
export function chunkRepairTransform(): TransformStream<string, string> {
	let brokenChunk: string | null = null;

	return new TransformStream<string, string>({
		transform(chunk, controller) {
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
						const completeChunks = (brokenChunk + chunk).split("\n\n");
						brokenChunk = completeChunks.pop() ?? null;
						completeChunks.forEach(enqueue);
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
		},
	});
}

/**
 * Transform stream to decode run events
 */
export function runEventDecoder(): TransformStream<string, RunEvent> {
	return new TransformStream<string, RunEvent>({
		transform(chunk, controller) {
			// Don't process empty chunks
			if (!chunk || !chunk.trim()) {
				return;
			}

			// Parse the chunk as JSON and handle errors
			let parsed;
			try {
				parsed = JSON.parse(chunk);
			} catch (error) {
				controller.enqueue([
					"error",
					`Failed to parse event: ${
						error instanceof Error ? error.message : String(error)
					}`,
				]);
				return;
			}

			// Check that it's a valid RunEvent array with correct structure
			if (!Array.isArray(parsed) || parsed.length < 2) {
				controller.enqueue([
					"error",
					"Invalid event format: expected array with at least 2 elements",
				]);
				return;
			}

			const [eventType, eventData] = parsed;

			// Validate event type
			if (!["input", "output", "error"].includes(eventType)) {
				controller.enqueue(["error", `Invalid event type: ${eventType}`]);
				return;
			}

			// Validate event data structure based on type
			if (eventType === "input") {
				if (!eventData?.node?.id || !eventData?.inputArguments?.schema) {
					controller.enqueue([
						"error",
						"Invalid input event: missing required fields",
					]);
					return;
				}
			} else if (eventType === "output") {
				if (!eventData?.node?.id || !("outputs" in eventData)) {
					controller.enqueue([
						"error",
						"Invalid output event: missing required fields",
					]);
					return;
				}
			}

			controller.enqueue(parsed as RunEvent);
		},
	});
}

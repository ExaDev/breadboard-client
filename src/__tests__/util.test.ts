import { getRequiredEnvVar } from "../util";

describe("Utility Functions", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Create a fresh copy of process.env for each test
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		// Restore original process.env
		process.env = originalEnv;
	});

	describe("getRequiredEnvVar", () => {
		it("should return the environment variable when it exists", () => {
			// Set a test environment variable
			process.env.TEST_VAR = "test value";

			const result = getRequiredEnvVar("TEST_VAR");
			expect(result).toBe("test value");
		});

		it("should throw an error when the environment variable doesn't exist", () => {
			// Ensure the variable doesn't exist
			delete process.env.MISSING_VAR;

			expect(() => getRequiredEnvVar("MISSING_VAR")).toThrow(
				"MISSING_VAR is not set"
			);
		});

		it("should throw a custom error message when provided", () => {
			// Ensure the variable doesn't exist
			delete process.env.MISSING_VAR;

			expect(() =>
				getRequiredEnvVar("MISSING_VAR", "Custom error message")
			).toThrow("Custom error message");
		});

		it("should handle empty strings as invalid values", () => {
			// Set an empty value
			process.env.EMPTY_VAR = "";

			expect(() => getRequiredEnvVar("EMPTY_VAR")).toThrow(
				"EMPTY_VAR is not set"
			);
		});

		it("should handle non-string types", () => {
			// Set a number value (which becomes a string in process.env)
			process.env.NUMBER_VAR = "123";

			const result = getRequiredEnvVar("NUMBER_VAR");
			expect(result).toBe("123");
		});
	});
});

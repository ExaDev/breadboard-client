import "dotenv/config";

function isString(value: any): value is string {
	return typeof value === "string" && value.length > 0;
}

export function getRequiredEnvVar(name: string, errorMessage?: string): string {
	const value = process.env[name];
	if (isString(value)) return value;
	throw new Error(errorMessage || `${name} is not set`);
}

export const BREADBOARD_USER = getRequiredEnvVar("BREADBOARD_USER");
export const BOARD_ID = getRequiredEnvVar("BOARD_ID");
export const BREADBOARD_SERVER_URL = getRequiredEnvVar("BREADBOARD_SERVER_URL");
export const BREADBOARD_API_KEY = getRequiredEnvVar("BREADBOARD_API_KEY");

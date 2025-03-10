/**
 * Custom error class for SOAP client errors
 */
export class SoapError extends Error {
	constructor(message: string, public readonly statusCode: number = 500, public readonly originalError?: unknown) {
		super(message);
		this.name = 'SoapError';
	}
}
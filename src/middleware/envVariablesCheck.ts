import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/errorHadler';

const requiredEnvVars = [
	'BILLING_URL',
	'BILLING_LOGIN',
	'BILLING_PASS'
];

function validateEnvVars(): void {
	const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
	if (missingVars.length > 0) {
		throw new HttpError(`Missing required environment variables: ${missingVars.join(', ')}`, 500);
	}
}

export function envValidationMiddleware(req: Request, res: Response, next: NextFunction): void {
	try {
		validateEnvVars();
		next();
	} catch (error) {
		next(error);
	}
}

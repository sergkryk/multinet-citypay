import { Request, Response, NextFunction } from 'express';
import { CityPayError } from '../../utils/errors/CityPayError';
import { cityPayResponseCodes } from '../../config/citypay';

/**
 * Types for CityPay query parameters
 */
export interface BaseQuery {
	Account: string;
	QueryType: 'check' | 'pay' | 'cancel';
	TransactionId: string;
}

export interface PayQuery extends BaseQuery {
	Amount: string;
	TransactionDate: string;
}

/**
 * Type guards for query validation
 */
function isBaseQuery(candidate: any): candidate is BaseQuery {
	return (
		typeof candidate === 'object' &&
		candidate !== null &&
		typeof candidate.Account === 'string' &&
		typeof candidate.TransactionId === 'string' &&
		['check', 'pay', 'cancel'].includes(candidate.QueryType)
	);
}

function isPayQuery(candidate: any): candidate is PayQuery {
	return (
		typeof candidate.Amount === 'string' &&
		typeof candidate.TransactionDate === 'string' &&
		!isNaN(Number(candidate.Amount)) &&
		Number(candidate.Amount) > 0
	);
}

/**
 * Middleware to validate CityPay payment requests
 *
 * Validates query parameters based on operation type:
 * - All operations require Account, QueryType, and TransactionId
 * - Pay and cancel operations additionally require Amount and TransactionDate
 */
export function cityPayQueryValidator(req: Request, res: Response, next: NextFunction): void {
	try {
		// Validate base query parameters first
		if (!isBaseQuery(req.query)) {
			throw new CityPayError('Missing or invalid required parameters', cityPayResponseCodes[3]);
		}

		const { QueryType } = req.query;

		// Additional validation for pay and cancel operations
		if ((QueryType === 'pay' || QueryType === 'cancel') && !isPayQuery(req.query)) {
			throw new CityPayError('Missing or invalid payment parameters', cityPayResponseCodes[3]);
		}

		// If validation passed, continue
		next();
	} catch (error) {
		next(error);
	}
}

import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to validate PSB payment requests
 */
export interface PayDayQuery {
	CheckDateBegin: string
	CheckDateEnd: string
}

export function isPayDayQuery(candidate: any): candidate is PayDayQuery {
	return (
		typeof candidate === 'object' &&
		candidate !== null &&
		typeof candidate.CheckDateBegin === 'string' &&
		typeof candidate.CheckDateEnd === 'string'
	);
}

export function payDayQueryValidator(req: Request, res: Response, next: NextFunction): void {
  try {
    // Validate query type
    // const queryType = validateQueryType(req.query.QueryType);

    // Validate and attach payment parameters
    // req.validatedParams = validatePaymentQuery(req.query);

    // Attach validated query type
    // req.validatedQueryType = queryType;

    next();
  } catch (error) {
    next(error);
  }
}
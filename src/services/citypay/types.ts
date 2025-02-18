export interface BaseQuery {
	Account: string;
	QueryType: 'check' | 'pay' | 'cancel';
	TransactionId: string;
	TransactionDate?: string;
	Amount?: string;
}

export interface PayDayQuery {
	CheckDateBegin: string
	CheckDateEnd: string
}

export function isBaseQuery(candidate: any): candidate is BaseQuery {
	return (
		typeof candidate === 'object' &&
		candidate !== null &&
		typeof candidate.Account === 'string' &&
		typeof candidate.TransactionId === 'string' &&
		['check', 'pay', 'cancel'].includes(candidate.QueryType) &&
		(candidate.TransactionDate === undefined || typeof candidate.TransactionDate === 'string')
	);
}

export function isPayDayQuery(candidate: any): candidate is PayDayQuery {
	return (
		typeof candidate === 'object' &&
		candidate !== null &&
		typeof candidate.CheckDateBegin === 'string' &&
		typeof candidate.CheckDateEnd === 'string'
	);
}

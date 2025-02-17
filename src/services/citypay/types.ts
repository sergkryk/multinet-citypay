export interface BaseQuery {
	Account: string;
	QueryType: 'check' | 'pay' | 'cancel';
	TransactionId: string;
	TransactionDate?: string;
	Amount?: string;
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

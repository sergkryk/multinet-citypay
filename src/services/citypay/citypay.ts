export const responses = {
	0: {
		ResultCode: 0,
		Comment: 'OK',
	},
	1: {
		ResultCode: 1,
		Comment: 'Temporary error',
	},
	2: {
		ResultCode: 2,
		Comment: 'Internal error',
	},
	3: {
		ResultCode: 3,
		Comment: 'Wrong format',
	},
	21: {
		ResultCode: 21,
		Comment: 'Not found',
	},
	22: {
		ResultCode: 22,
		Comment: 'Forbidden',
	},
	24: {
		ResultCode: 24,
		Comment: 'Account disabled',
	},
	100: {
		ResultCode: 100,
		Comment: 'Not finished',
	},
	241: {
		ResultCode: 241,
		Comment: 'Amount more',
	},
	242: {
		ResultCode: 242,
		Comment: 'Amount less',
	},
	299: {
		ResultCode: 299,
		Comment: 'Other',
	},
};

// Класс для обработки ошибок CityPay
export class CityPayError extends Error {
	xmlResponse: typeof responses[keyof typeof responses];
	constructor(message: string, xmlResponse: typeof responses[keyof typeof responses]) {
		super(`${message}. Response code: ${xmlResponse.ResultCode}. Comment: ${xmlResponse.Comment} `);
		this.xmlResponse = xmlResponse;
	}
}

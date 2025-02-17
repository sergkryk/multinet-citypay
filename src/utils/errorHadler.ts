import { CityPayError, responses } from '../services/citypay/citypay';
import { logError } from '../services/logger/logger';
import { Response, Request, NextFunction } from 'express';
import { convertToXml } from '../services/xml-js/xmljs';

// class to handle http errors
export class HttpError extends Error {
	httpStatusCode: number;
	constructor(message: string, httpStatusCode: number) {
		super(message);
		this.httpStatusCode = httpStatusCode;
	}
}


// handle errors
export function handleErrors(err: any, req: Request, res: Response, next: NextFunction): void {
	if (err instanceof CityPayError) {
		console.log(`${err.stack}. Message: ${err.message}`)
		res.send(convertToXml(err.xmlResponse))
		return
	}
	if (err instanceof Error) {
		console.log(err.stack, err.message);
		res.send(convertToXml(responses[2]))
		return
	}
	if (err instanceof HttpError) {
		// console.log(err.stack, err.message);
	}
	// } else if (err instanceof Error) {
	// 	res.status(500).send(err.message);
	// } else {
	// 	res.status(500).send('An unexpected error occurred. Please try again later.');
	// }
	// const message = err instanceof Error ? err.message : 'Unknown error';
	// logError(err);
	// console.error('Error occurred with message: ', message);
}

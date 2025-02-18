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
	if (err instanceof CityPayError || err instanceof Error) {
		const message = `${err.stack}, ${err.message}`;
		logError(message)
		if (err instanceof CityPayError) {
			res.send(convertToXml(err.xmlResponse))
		} else {
			res.send(convertToXml(responses[2]))
		}
	}
}

import { CityPayError } from '../utils/errors/CityPayError';
import { logError } from '../infrastructure/logger/logger';
import { Response, Request, NextFunction } from 'express';
import { xmlTool } from '../infrastructure/xml-js/xmljs';
import { cityPayResponseCodes } from '../config/citypay';
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
	if (err instanceof CityPayError || err instanceof Error || err instanceof HttpError) {
		const message = `${err.stack}, ${err.message}`;
		console.log(err);
		logError(message)
		if (err instanceof CityPayError) {
			res.send(xmlTool.toXML(err.xmlResponse))
		} else {
			res.send(xmlTool.toXML(cityPayResponseCodes[2]))
		}
	}
}

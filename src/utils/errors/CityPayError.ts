import { cityPayResponseCodes } from "../../config/citypay";

// Класс для обработки ошибок CityPay
export class CityPayError extends Error {
	xmlResponse: typeof cityPayResponseCodes[keyof typeof cityPayResponseCodes];
	constructor(message: string, xmlResponse: typeof cityPayResponseCodes[keyof typeof cityPayResponseCodes]) {
		super(`${message}. Response code: ${xmlResponse.ResultCode}. Comment: ${xmlResponse.Comment} `);
		this.xmlResponse = xmlResponse;
	}
}
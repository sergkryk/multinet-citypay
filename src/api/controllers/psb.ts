import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../../domain/payments/service';
import { RequestWithBillingConfig } from '../middleware/operatorSelect';
import SoapClient from '../../infrastructure/soap/soap';
import { CityPayError } from '../../utils/errors/CityPayError';
import { cityPayResponseCodes } from '../../config/citypay';
import { BaseQuery, PayQuery } from '../middleware/cityPayQueryValidator';

export async function psbGetController(
	req: RequestWithBillingConfig,
	res: Response,
	next: NextFunction
): Promise<void> {
	let soapClient: SoapClient | null = null;
	try {
		res.set('Content-Type', 'application/xml; charset=utf-8');
		let result: string;
		if (!req.billingConfig) {
			throw new CityPayError('Failed to authenticate db client', cityPayResponseCodes[22]);
		}
		soapClient = await SoapClient.initialize(req.billingConfig);
		const paymentService = new PaymentService(soapClient, req.billingConfig.isCash);
		const queryType = req.query.QueryType as string;
		switch (queryType) {
			case 'check':
				result = await paymentService.check(req.query as unknown as BaseQuery);
				break;
			case 'pay':
				result = await paymentService.pay(req.query as unknown as PayQuery);
				break;
			case 'cancel':
				result = await paymentService.cancel(req.query as unknown as PayQuery);
				break;
			default:
				throw new Error('fuck');
		}
		res.send(result);
	} catch (error) {
		next(error);
	} finally {
		if (soapClient) {
			await soapClient.logout();
		}
	}
}

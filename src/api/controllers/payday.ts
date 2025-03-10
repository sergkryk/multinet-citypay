import { Request, Response, NextFunction } from 'express';
import { isPayDayQuery } from '../services/citypay/types';
import { CityPayError, responses } from '../services/citypay/citypay';
import NodeSoap from '../services/soap/soap';
import { loginToBillingClient, logoutFromBillingClient } from './psb';
import { SoapPaymentFull } from '../services/soap/types';
import { convertToXml } from '../services/xml-js/xmljs';
// verifies and assert types of variables
function getProperVars(query: any): { dtfrom: string; dtto: string } {
	const validDateStringLength = 14;
	if (!isPayDayQuery(query)) {
		throw new CityPayError('Request query is wrong', responses[3]);
	}
	const { CheckDateBegin: dtfrom, CheckDateEnd: dtto } = query;
	if (isNaN(Number(dtfrom)) || isNaN(Number(dtto))) {
		throw new CityPayError('Wrong date format in request', responses[3]);
	}
	if (dtfrom.length !== validDateStringLength || dtto.length !== validDateStringLength) {
		throw new CityPayError('Query parameter is not a valid date', responses[3]);
	}
	return {
		dtfrom,
		dtto,
	};
}
function parseDateString(dateStr: string) {
	// Convert to ISO format: "YYYY-MM-DDTHH:mm:ss"
	const isoString = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T${dateStr.slice(
		8,
		10
	)}:${dateStr.slice(10, 12)}:${dateStr.slice(12, 14)}Z`;
	// Parse as a Date object
	return new Date(isoString);
}

function isAllowedIntervalInDates(dates: { dtfrom: string; dtto: string }) {
	const dateFrom = new Date(parseDateString(dates.dtfrom));
	const maxAllowedInterval = new Date(parseDateString(dates.dtfrom));
	maxAllowedInterval.setMonth(dateFrom.getMonth() + 1);
	const dateTo = new Date(parseDateString(dates.dtto));
	if (dateTo.getTime() > maxAllowedInterval.getTime()) {
		throw new CityPayError('Interval between dates maximum 1 month', responses[22]);
	}
}

async function getPaymentsByDates(soapClient: NodeSoap, dates: { dtfrom: string; dtto: string }) {
	const payments = await soapClient.getPayments(dates);
	const paymentsByManager = payments.reduce((acc: SoapPaymentFull[], payment) => {
		if (payment.pay.modperson === Number(process.env.MULTINET_MANAGER_ID)) {
			acc.push(payment);
		}
		return acc;
	}, []);
	return paymentsByManager;
}

async function handlePaydayRequest(dates: { dtfrom: string; dtto: string }): Promise<string> {
	isAllowedIntervalInDates(dates);
	const soapClient = await NodeSoap.init();
	try {
		// Login to the billing client
		await loginToBillingClient(soapClient, { login: process.env.BILLING_LOGIN_PSB!, pass: process.env.BILLING_PASS_PSB! });
		// gets all payments filtered by dates and manager id
		const payments = await getPaymentsByDates(soapClient, dates);
		// Map payments to XML format
        // logout from the billing
        await logoutFromBillingClient(soapClient);
		const paymentsXml = payments.map((el: SoapPaymentFull): {} => {
			return {
				Payment: {
					TransactionId: { _text: el.pay.receipt },
					Account: { _text: el.uid },
					TransactionDate: { _text: el.pay.paydate ? el.pay.paydate.replace(/\D/g, '') : '' },
					Amount: { _text: el.pay.amount },
				},
			};
		});
		return convertToXml(paymentsXml);
	} catch (error) {
		await logoutFromBillingClient(soapClient);
		throw error;
	}
}

export const paydayController = async function (req: Request, res: Response, next: NextFunction) {
	res.set('Content-Type', 'application/xml; charset=utf-8');
	try {
		const datesObj = getProperVars(req.query);
		const xmlResult = await handlePaydayRequest(datesObj);
		res.send(xmlResult);
	} catch (error) {
		next(error);
	}
};

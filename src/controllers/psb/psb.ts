import { Request, Response, NextFunction } from 'express';
import { CityPayError, responses } from '../../services/citypay/citypay';
import { isBaseQuery } from '../../services/citypay/types';
import NodeSoap from '../../services/soap/soap';
import { convertToXml } from '../../services/xml-js/xmljs';
// GET controller
export const psbGetController = async function (req: Request, res: Response, next: NextFunction) {
	// sets headers type to xml
	res.set('Content-Type', 'application/xml; charset=utf-8');
	try {
		//declares query type and validates query parameters
		const qtype = checkQueryType(req.query);
		const { amount, userid, receipt } = getProperVars(req.query);
		switch (qtype) {
			case 'check':
				const xmlCheckResponse = await handleCheck(userid, receipt);
				res.send(xmlCheckResponse);
				break;
			case 'pay':
				if (amount === 0) {
					throw new CityPayError('Amount must be a number and not equal to 0', responses[3]);
				}
				const xmlPayResponse = await handlePay(userid, amount, receipt);
				res.send(xmlPayResponse);
				break;
			case 'cancel':
				await handleCancel();
				break;
		}
	} catch (error) {
		next(error);
	}
};
// checks query type
function checkQueryType(query: any): 'check' | 'pay' | 'cancel' {
	if (!isBaseQuery(query)) {
		throw new CityPayError('Request query is wrong', responses[3]);
	}
	return query.QueryType;
}
// verifies and assert types of variables
function getProperVars(query: any): { amount: number; userid: number; receipt: string } {
	if (!isBaseQuery(query)) {
		throw new CityPayError('Request query is wrong', responses[3]);
	}
	const { Account: userid, TransactionId: receipt } = query;
	const amount = query?.Amount ? query.Amount : null;
	if (isNaN(Number(userid)) || (amount !== null && isNaN(Number(amount))) || typeof receipt !== 'string') {
		throw new CityPayError('Some variables are of wrong types', responses[3]);
	}
	return {
		amount: Number(amount),
		userid: Number(userid),
		receipt,
	};
}
// logins to billing
async function loginToBillingClient(soapClient: NodeSoap): Promise<void> {
	try {
		await soapClient.login({ login: process.env.BILLING_LOGIN!, pass: process.env.BILLING_PASS! });
	} catch (error) {
		throw new CityPayError('Soap client login failed', responses[2]); // Internal error if login fails
	}
}
// fetches agreement by userid
async function fetchAgreementByUserId(soapClient: NodeSoap, userId: number) {
	const agreements = await soapClient.getAgreements({ userid: userId });
	if (agreements.length !== 1) {
		throw new CityPayError('Agreement not found or not unique', responses[21]); // Not found if agreement is not unique
	}
	return agreements[0];
}
// fetches payment by receipt
async function fetchPaymentByReceipt(soapClient: NodeSoap, receipt: string) {
	const payments = await soapClient.getPayments({ receipt });
	if (payments !== null) {
		throw new CityPayError('Payment already exists', responses[100]); // Not finished if payment exists
	}
}
// adds payment to billing
async function addPayment(soapClient: NodeSoap, params: { agrmid: number; amount: number; receipt: string }) {
	const payment = await soapClient.submitPayment(params);
	if (isNaN(Number(payment))) {
		throw new CityPayError('Add payment failed. Wrong response', responses[2]);
	}
	return payment;
}
// logouts from billing
async function logoutFromBillingClient(soapClient: any): Promise<void> {
	try {
		await soapClient.logout();
	} catch (error) {
		console.error('Logout failed', error);
	}
}
// handles check query
export async function handleCheck(userid: number, receipt: string): Promise<string> {
	const soapClient = await NodeSoap.init();
	try {
		// Login to the billing client
		await loginToBillingClient(soapClient);
		// Fetch user agreement
		const agreement = await fetchAgreementByUserId(soapClient, userid);
		// Check if payment exists with the given receipt
		await fetchPaymentByReceipt(soapClient, receipt);
		// Logout from the billing client
		await logoutFromBillingClient(soapClient);
		// Return the response XML
		return convertToXml({
			TransactionId: { _text: receipt },
			ResultCode: { _text: responses[0].ResultCode },
			Fields: {
				field1: {
					_attributes: {
						name: 'FIO',
					},
					_text: agreement.username,
				},
			},
		});
	} catch (error) {
		await logoutFromBillingClient(soapClient); // Ensure logout even on error
		throw error
	}
}
// handles pay query
async function handlePay(userid: number, amount: number, receipt: string) {
	const soapClient = await NodeSoap.init();
	try {
		// Login to the billing client
		await loginToBillingClient(soapClient);
		// Fetch agrmid from agreement
		const { agrmid } = await fetchAgreementByUserId(soapClient, userid);
		// Adds payment to billing
		const recordid = await addPayment(soapClient, { agrmid, amount, receipt });
		// Logout from the billing client
		await logoutFromBillingClient(soapClient);
		// Return the response XML
		return convertToXml({
			TransactionId: { _text: receipt },
			TransactionExt: { _text: recordid },
			Amount: { _text: amount },
			ResultCode: { _text: responses[0].ResultCode },
			Comment: { _text: '' },
		});
	} catch (error) {
		await logoutFromBillingClient(soapClient); // Ensure logout even on error
		throw error
	}
}

async function handleCancel() {
	throw new Error('Function not implemented.');
}

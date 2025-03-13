import { Request, Response, NextFunction } from 'express';
import { CityPayError, responses } from '../services/citypay/citypay';
import { isBaseQuery } from '../services/citypay/types';
import NodeSoap from '../services/soap/soap';
import { convertToXml } from '../services/xml-js/xmljs';
import { SoapAgreement, SoapPaymentFull } from '../services/soap/types';
import { Operators, registerReceipt } from '../services/openClient/openClient';
import { RequestWithBillingConfig } from '../middleware/operatorSelect';
import { sendSms } from '../services/smssend/smssend';
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
export async function loginToBillingClient(soapClient: NodeSoap, params: {login: string, pass: string}): Promise<void> {
	try {
 		await soapClient.login(params);
	} catch (error) {
		throw new CityPayError('Soap client login failed', responses[2]); // Internal error if login fails
	}
}
// logouts from billing
export async function logoutFromBillingClient(soapClient: any): Promise<void> {
	try {
		await soapClient.logout();
	} catch (error) {
		console.error('Logout failed', error);
	}
}
// fetches agreement by userid
async function fetchAgreementByUserId(soapClient: NodeSoap, userId: number): Promise<SoapAgreement> {
	const agreements = await soapClient.getAgreements({ userid: userId });
	if (agreements.length !== 1) {
		throw new CityPayError('Agreement not found or not unique', responses[21]); // Not found if agreement is not unique
	}
	return agreements[0];
}
// fetches payment by receipt
async function fetchPaymentByReceipt(soapClient: NodeSoap, receipt: string): Promise<void> {
	const payments = await soapClient.getPayments({ receipt });
	if (payments !== null) {
		const filtered = payments.filter(el => el.pay.receipt === receipt);
		if (filtered.length > 0) {
			throw new CityPayError('Payment already exists', responses[100]); // Not finished if payment exists
		}
	}
}
// fetches payment by receipt and agrmid
async function fetchPaymentByReceiptAndAgrmid(
	soapClient: NodeSoap,
	fltParams: { receipt: string; agrmid: number }
): Promise<SoapPaymentFull> {
	const payments = await soapClient.getPayments(fltParams);
	if (payments === null) {
		throw new CityPayError('Payment already exists', responses[100]); // Not finished if payment exists
	}
	if (payments.length > 1) {
		const filtered = payments.filter(el => el.pay.receipt === fltParams.receipt);
		if (filtered.length !== 1) {
			throw new CityPayError('Payment with such receipt not found', responses[21]);
		}
		return filtered[0]
	}
	return payments[0];
}
// adds payment to billing
async function addPayment(soapClient: NodeSoap, params: { agrmid: number; amount: number; receipt: string, comment: string }) {
	const payment = await soapClient.submitPayment(params);
	if (isNaN(Number(payment))) {
		throw new CityPayError('Add payment failed. Wrong response', responses[2]);
	}
	return payment;
}
// fetches account contacts
async function fetchAccountContacts(soapClient: NodeSoap, agrmid: number): Promise<string> {
	const account = await soapClient.getAccounts({agrmid})
	if (account.length === 1) {
		const { email, phone, mobile } = account[0].account
		const finalPhone = phone || mobile
		return finalPhone || email
	}
	throw new CityPayError('Fetch account contacts failed', responses[2]);
}
//creates and authenticates soap client
async function getSoapClient(params:{login: string, pass: string}): Promise<NodeSoap> {
	const soapClient = await NodeSoap.init();
	await loginToBillingClient(soapClient, params);
	return soapClient;
}
// handles check query
export async function handleCheck(soapClient: NodeSoap, userid: number, receipt: string): Promise<string> {
	try {
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
		throw error;
	}
}
// handles pay query
async function handlePay(soapClient: NodeSoap, userid: number, amount: number, receipt: string, isCash: boolean): Promise<string> {
	try {
		// Fetch agrmid from agreement
		const { agrmid, operid } = await fetchAgreementByUserId(soapClient, userid);
		// fetch account contacts to register online check
		const clientContact = await fetchAccountContacts(soapClient, agrmid)
		//register online receipt
		const receiptFZ = await registerReceipt({operId: operid as Operators, amount, clientContact, isCash})
		// Adds payment to billing
		const recordid = await addPayment(soapClient, { agrmid, amount, receipt, comment: receiptFZ.receipt_url || '', });
		// Send SMS
		const smssend = await sendSms(clientContact, receiptFZ.receipt_url);
		// Logout from the billing client
		await logoutFromBillingClient(soapClient);
		// Return the response XML
		return convertToXml({
			TransactionId: { _text: receipt },
			TransactionExt: { _text: recordid },
			Amount: { _text: amount },
			ResultCode: { _text: responses[0].ResultCode },
			Comment: { _text: responses[0].Comment },
		});
	} catch (error) {
		await logoutFromBillingClient(soapClient); // Ensure logout even on error
		throw error;
	}
}

async function handleCancel(soapClient: NodeSoap, userid: number, receipt: string): Promise<string> {
	try {
		// Fetch agrmid from agreement
		const { agrmid } = await fetchAgreementByUserId(soapClient, userid);
		const paymentToCancel = await fetchPaymentByReceiptAndAgrmid(soapClient, { receipt, agrmid });
		const { recordid, amount } = paymentToCancel.pay;
		const cancelled = await soapClient.cancelPayment({ receipt, agrmid, recordid });
		// Logout from the billing client
		await logoutFromBillingClient(soapClient);
		return convertToXml({
			TransactionId: { _text: receipt },
			TransactionExt: { _text: cancelled },
			Amount: { _text: amount },
			ResultCode: { _text: responses[0].ResultCode },
			Comment: { _text: responses[0].Comment },
		});
		// Get payment to cancel
	} catch (error) {
		await logoutFromBillingClient(soapClient); // Ensure logout even on error
		throw error;
	}
}
// GET controller
export const psbGetController = async function (req: RequestWithBillingConfig, res: Response, next: NextFunction) {
	try {
		if (!req.billingConfig) {
			throw new CityPayError('Failed to authenticate db client', responses[22]);
		}
		const { login, pass, isCash } = req.billingConfig
		const soapClient = await getSoapClient({login, pass})
		// sets headers type to xml
		res.set('Content-Type', 'application/xml; charset=utf-8');
		//declares query type and validates query parameters
		const qtype = checkQueryType(req.query);
		const { amount, userid, receipt } = getProperVars(req.query);
		switch (qtype) {
			case 'check':
				const xmlCheckResponse = await handleCheck(soapClient, userid, receipt);
				res.send(xmlCheckResponse);
				break;
			case 'pay':
				if (amount === 0) {
					throw new CityPayError('Amount must be a number and not equal to 0', responses[3]);
				}
				const xmlPayResponse = await handlePay(soapClient, userid, amount, receipt, isCash);
				res.send(xmlPayResponse);
				break;
			case 'cancel':
				const xmlCancelResponse = await handleCancel(soapClient, userid, receipt);
				res.send(xmlCancelResponse);
				break;
		}
	} catch (error) {
		next(error);
	}
};

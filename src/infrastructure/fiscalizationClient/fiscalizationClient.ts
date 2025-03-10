import crypto from 'crypto';
import { PrintCheckCommand, PrintCheckResponse, RegisterReceiptPayload } from './types';
import { isValidEmail, isValidPhone } from '../../utils/validators';
import { phoneNumberFormatter } from '../../utils/prettier';
import { HttpError } from '../../utils/errorHadler';

// fiscalization API url
const APP_URL: string = process.env.FISCALIZATION_API_URL!;

// fiscalization API app id
const APP_ID: string = process.env.FISCALIZATION_CLIENT_APP_ID!;

// fiscalization API secret
const APP_SECRET: string = process.env.FISCALIZATION_CLIENT_SECRET!;

// Static headers
const headers = new Headers({
	Accept: 'application/json',
	'Content-Type': 'application/json',
});

// Command structure for printing a receipt
const getPrintCheckCommand = (smsEmail54FZ: string, sum: number, isCash: boolean): PrintCheckCommand => ({
	goods: [
		{
			name: 'Услуги связи',
			price: sum,
			count: 1,
			sum,
			nds_not_apply: true,
			item_type: 4,
			payment_mode: 4,
		},
	],
	author: 'Общество с ограниченной ответственностью "МУЛЬТИНЕТ"',
	tag1055: '2',
	smsEmail54FZ,
	payed_cash: isCash ? sum : 0,
	payed_cashless: !isCash ? sum : 0,
	payed_credit: 0,
	payed_prepay: 0,
	payed_consideration: 0,
});

// Generates random nonce
function getNonce(length: number = 16): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let nonce = '';
	for (let i = 0; i < length; i++) {
		nonce += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return nonce;
}

// Makes signature for headers from a command body
function getSignedHeaders(commandBody: Record<string, any>, secret: string) {
	// delete previous sign if exists
	if (headers.has('sign')) {
		headers.delete('sign');
	}
	// Removing the 'sign' header
	// Sorts keys of command alphabetically
	const sortedCommandKeys = Object.keys(commandBody).sort();
	// Creates sorted version of command
	const sortedCommand: Record<string, any> = {};
	sortedCommandKeys.forEach((key) => {
		sortedCommand[key] = commandBody[key];
	});
	// Makes a string from alphabetically sorted object
	const commandString = JSON.stringify(sortedCommand);
	// Creates signature
	const sign = crypto
		.createHash('md5')
		.update(commandString + secret)
		.digest('hex');
	headers.append('sign', sign);
	return headers;
}

// Adds appId and nonce to commandBody
function buildPrintCheckCommand(appId: string, commandBody: {}): Record<string, any> {
	return {
		type: 'printCheck',
		app_id: appId,
		nonce: getNonce(),
		command: commandBody,
	};
}

// Checks payload before registering receipt
function isRegisterReceiptPayload(payload: Record<string, unknown>): payload is RegisterReceiptPayload {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		'amount' in payload &&
		'clientContact' in payload &&
		typeof payload.amount === 'number' &&
		typeof payload.clientContact === 'string'
	);
}

// Verifies and formats contact phone or email
function verifyContactType(clientContact: string): string {
	if (isValidEmail(clientContact)) {
		return clientContact;
	} else if (isValidPhone(clientContact)) {
		return phoneNumberFormatter(clientContact);
	} else {
		return clientContact;
	}
}

// Register receipt function
export const registerReceipt = async function (payload: RegisterReceiptPayload): Promise<PrintCheckResponse> {
	// check payload
	if (!isRegisterReceiptPayload(payload)) {
		throw new HttpError('Cannot register receipt with this payloads!', 400);
	}
	// destructures payload to get variables
	const { amount, clientContact, isCash } = payload;
	// verifies what contact type is and formats it if needed
	const verifiedContact = verifyContactType(clientContact);
	// gets command for receipt
	const command = buildPrintCheckCommand(APP_ID, getPrintCheckCommand(verifiedContact, amount, isCash));
	// signs headers
	const headers = getSignedHeaders(command, APP_SECRET);
	// prints check request
	try {
		const request = await fetch(`${APP_URL}Command`, {
			method: 'POST',
			headers,
			body: JSON.stringify(command),
		});
		// Checks if the response is OK (status code 2xx)
		if (!request.ok) {
			// Logs the status code and message
			throw new HttpError(
				`Failed to register receipt. Status: ${request.status} ${request.statusText}`,
				request.status
			);
		}
		const responseData = await request.json();
		return responseData;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		throw new HttpError(`Receipt registration failed with message ${message}!`, 500);
	}
};

import { BaseQuery, PayQuery } from '../../api/middleware/cityPayQueryValidator';
import { cityPayResponseCodes } from '../../config/citypay';
import { registerReceipt } from '../../infrastructure/fiscalizationClient/fiscalizationClient';
import SoapClient from '../../infrastructure/soap/soap';
import { CancelPaymentParams, SoapAgreement, SoapPayment, SoapPaymentFull } from '../../infrastructure/soap/types';
import { xmlTool } from '../../infrastructure/xml-js/xmljs';
import { AgreementCache } from '../../utils/agreementCache';
import { CityPayError } from '../../utils/errors/CityPayError';

/**
 * Payment Service
 *
 * Core business logic for payment processing operations.
 * Handles communication with billing system, fiscal service,
 * and payment processing workflows.
 */
export class PaymentService {
	/**
	 * Creates a new PaymentService with an authenticated SOAP client
	 * @private - Use factory methods instead
	 */
	constructor(private readonly billingClient: SoapClient, private readonly isCash: boolean) {}

	/**
	 * Checks if an account exists and can receive payments
	 */
	async check(query: BaseQuery): Promise<string> {
		const { Account, TransactionId } = query;

		// Fetch user agreement from billing system
		const agreement = await this.fetchAgreement(Number(Account));

		// Verify payment doesn't already exist with this receipt
		await this.verifyPaymentNotExists(TransactionId);

		// Build xml response
		const response = xmlTool.getCityPayCheckResponse(TransactionId, agreement.username || '');

		return response;
	}

	/**
	 * Process a payment for a user account
	 */
	async pay(query: PayQuery): Promise<string> {
		// Declare variables from query
		const { Account, TransactionId, Amount } = query;

		// Fetch agrmid from agreement
		const { agrmid } = await this.fetchAgreement(Number(Account));

		// fetch account contacts to register online check
		const clientContact = await this.getAccountContact(agrmid);

		//register online receipt
		const receiptFZ = await registerReceipt({ amount: Number(Amount), clientContact, isCash: this.isCash });

		// Adds payment to billing
		const recordid = await this.addPayment({
			agrmid,
			amount: Number(Amount),
			receipt: TransactionId,
			comment: receiptFZ.receipt_url || '',
		});

		// Build xml response
		const response = xmlTool.getCityPayPayResponse({ receipt: TransactionId, recordid, amount: Amount });

		return response;
	}

	/**
	 * Cancel a previously processed payment
	 */
	async cancel(query: PayQuery): Promise<string> {
		// Declare variables from query
		const { Account, TransactionId, Amount } = query;

		// Fetch user agreement from billing system
		const { agrmid } = await this.fetchAgreement(Number(Account));

		// Find the payment to cancel
		const payment = await this.findPayment(TransactionId, agrmid);

		// Cancel the payment in billing system
		const recordid = await this.cancelPayment({
			receipt: TransactionId,
			agrmid,
			recordid: payment.pay.recordid,
		});

		// Build xml response
		const response = xmlTool.getCityPayPayResponse({ receipt: TransactionId, recordid, amount: Amount });

		return response;
	}

	/**
	 * Fetch user agreement by user ID
	 * @private
	 */
	private async fetchAgreement(userId: number): Promise<SoapAgreement> {
		// Check cache first
		const cachedAgreement = AgreementCache.get(userId);
		if (cachedAgreement) {
			return cachedAgreement;
		}

		// Fetch from billing
		const agreements = await this.billingClient.getAgreements({ login: `user_${userId}` });

		if (agreements.length !== 1) {
			throw new CityPayError('Agreement not found or not unique', cityPayResponseCodes[21]);
		}

		// Update cache
		AgreementCache.set(userId, agreements[0]);

		return agreements[0];
	}

	/**
	 * Verify a payment doesn't already exist with given receipt
	 * @private
	 */
	private async verifyPaymentNotExists(receipt: string): Promise<void> {
		const payments = await this.billingClient.getPayments({ receipt });

		if (payments && payments.some((p) => p.pay.receipt === receipt)) {
			throw new CityPayError('Payment already exists', cityPayResponseCodes[100]);
		}
	}

	/**
	 * Find a payment by receipt and agreement ID
	 * @private
	 */
	private async findPayment(receipt: string, agrmid: number): Promise<SoapPaymentFull> {
		const payments = await this.billingClient.getPayments({ receipt, agrmid });

		if (!payments || payments.length === 0) {
			throw new CityPayError('Payment not found', cityPayResponseCodes[21]);
		}

		const filtered = payments.filter((p) => p.pay.receipt === receipt);

		if (filtered.length !== 1) {
			throw new CityPayError('Payment not found or not unique', cityPayResponseCodes[21]);
		}

		return filtered[0];
	}

	/**
	 * Add payment to billing
	 * @private
	 */
	private async addPayment(params: Omit<SoapPayment, 'recordid'>): Promise<number> {
		// request billing to add payment
		const payment = await this.billingClient.submitPayment(params);

		// If response is not payment recordid throw an error
		if (isNaN(Number(payment))) {
			throw new CityPayError('Add payment failed. Wrong response', cityPayResponseCodes[2]);
		}

		// return payment recordid
		return payment;
	}

	/**
	 * Cancel payment
	 * @private
	 */
	private async cancelPayment(params: CancelPaymentParams): Promise<SoapPaymentFull['pay']['recordid']> {
		const ZERO_AMOUNT = 0.0;
		const STATUS_CANCELLED = 2;
		const result = await this.addPayment({ ...params, status: STATUS_CANCELLED, amount: ZERO_AMOUNT });
		return result;
	}

	/**
	 * Get account contact information
	 * @private
	 */
	private async getAccountContact(agrmid: number): Promise<string> {
		const accounts = await this.billingClient.getAccounts({ agrmid });

		if (accounts.length !== 1) {
			throw new CityPayError('Account not found', cityPayResponseCodes[21]);
		}

		const { email, phone, mobile } = accounts[0].account;
		const contact = phone || mobile || email;

		if (!contact) {
			throw new CityPayError('No contact information found', cityPayResponseCodes[21]);
		}

		return contact;
	}
}

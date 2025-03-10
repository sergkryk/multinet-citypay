import { Client, createClientAsync, IHeaders } from 'soap';
import path from 'path';
import {
	BaseSoapResponse,
	CancelPaymentParams,
	LoginParams,
	SoapAccountsListItem,
	SoapAgreement,
	SoapFilter,
	SoapManagerFull,
	SoapPayment,
	SoapPaymentFull,
} from './types';
import { HttpError } from '../../utils/errorHadler';

/**
 * SOAP client for the billing system
 */
export default class SoapClient {
	// Configuration constants
	private static readonly DEFAULT_WSDL = 'api3.wsdl';
	private static readonly SOAP_DIR = 'soap';
	/**
	 * Create a new SOAP client
	 * @private Use initialize method instead
	 */
	private constructor(private readonly client: Client) {}
	/**
	 * Create and initialize a SOAP client with optional authentication
	 * @param params Login credentials for SOAP server (optional)
	 * @returns An authenticated SOAP client instance
	 * @throws SoapError if initialization or authentication fails
	 */
	static async initialize(params: LoginParams): Promise<SoapClient> {
		try {
			// Validate SOAP endpoint configuration
			const endpoint = process.env.BILLING_URL;
			if (!endpoint) {
				throw new HttpError('SOAP endpoint URL is not configured', 500);
			}

			// Build the path to the WSDL file
			const wsdlPath = path.join(path.dirname(__dirname), this.SOAP_DIR, this.DEFAULT_WSDL);

			// Create the SOAP client
			const client: Client = await createClientAsync(wsdlPath, { endpoint });

			// Create instance of class
			const soapClient = new SoapClient(client);

			// Login to SOAP server
			if (params) {
				await soapClient.login(params);
			}

			// Return instance of SOAP client
			return soapClient;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new HttpError(`SOAP client initialization failed: ${errorMessage}`, 400);
		}
	}

	/**
	 * Check if a SOAP response is valid
	 * @private
	 */
	private isValidSoapResponse(response: unknown): response is BaseSoapResponse {
		return (
			Array.isArray(response) &&
			response.length > 0 &&
			typeof response[0] === 'object' &&
			(response[0] === null || 'ret' in response[0])
		);
	}

	/**
	 * Make a base SOAP request with error handling
	 * @private
	 */
	private async makeRequest<T>(method: (params?: unknown) => Promise<unknown>, params?: unknown): Promise<T> {
		try {
			const response = await method(params);

			if (!this.isValidSoapResponse(response)) {
				throw new HttpError('Soap response is not valid', 500);
			}
			const result = response[0] === null ? null : response[0].ret;
			return result as T;
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new HttpError(`Error in SOAP method: ${errorMessage}`, 500);
		}
	}

	/**
	 * Login to the billing system
	 */
	async login(params: LoginParams): Promise<SoapManagerFull[]> {
		const result = await this.makeRequest<SoapManagerFull[]>(this.client.LoginAsync, params);

		// Store authentication cookie for subsequent requests
		const authCookie = this.client.lastResponseHeaders?.['set-cookie'];
		if (authCookie) {
			this.client.addHttpHeader('set-cookie', authCookie);
		}
		return result;
	}

	/**
	 * Logout from the billing system
	 */
	async logout(): Promise<void> {
		await this.makeRequest<void>(this.client.LogoutAsync, {});
	}

	/**
	 * Get payments based on filter criteria
	 */
	async getPayments(params: SoapFilter): Promise<SoapPaymentFull[]> {
		return this.makeRequest<SoapPaymentFull[]>(this.client.getPaymentsAsync, { flt: params });
	}

	/**
	 * Submit a new payment
	 */
	async submitPayment(params: Omit<SoapPayment, 'recordid'>): Promise<SoapPaymentFull['pay']['recordid']> {
		return this.makeRequest<SoapPaymentFull['pay']['recordid']>(this.client.PaymentAsync, {
			val: params,
		});
	}

	/**
	 * Cancel an existing payment
	 */
	async cancelPayment(params: CancelPaymentParams): Promise<SoapPaymentFull['pay']['recordid']> {
		const ZERO_AMOUNT = 0.0;
		const STATUS_CANCELLED = 2;
		return this.makeRequest<SoapPaymentFull['pay']['recordid']>(this.client.PaymentAsync, {
			val: { ...params, status: STATUS_CANCELLED, amount: ZERO_AMOUNT },
		});
	}

	/**
	 * Get agreements based on filter criteria
	 */
	async getAgreements(params: SoapFilter): Promise<SoapAgreement[]> {
		return this.makeRequest<SoapAgreement[]>(this.client.getAgreementsAsync, { flt: params });
	}

	/**
	 * Get accounts based on filter criteria
	 */
	async getAccounts(params: SoapFilter): Promise<SoapAccountsListItem[]> {
		return this.makeRequest<SoapAccountsListItem[]>(this.client.getAccountsAsync, { flt: params });
	}

	/**
	 * Get HTTP headers from the SOAP client
	 */
	getHttpHeaders(): IHeaders {
		const cookie = this.client.getHttpHeaders();
		return cookie;
	}

	/**
	 * Set HTTP cookie for the SOAP client
	 */
	setHttpCookie(sessnum: string): void {
		const cookie = `${sessnum};Domain=10.45.0.50;Path=/;Version=1;Max-Age=7200;`;
		this.client.addHttpHeader('set-cookie', cookie);
	}
}

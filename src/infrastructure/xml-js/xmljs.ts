import converter from 'xml-js';
import { ConverterOptions } from './types';
import { cityPayResponseCodes } from '../../config/citypay';
// xml declaration
const xmlDeclaration = {
	_attributes: {
		version: '1.0',
		encoding: 'utf-8',
	},
};
// options to convert to xml
const defaultOptions: ConverterOptions = {
	ignoreComment: true,
	compact: true,
	spaces: 4,
	alwaysChildren: true,
};

export default class XMLTools {
	constructor(private readonly declaration: {}, private readonly options: ConverterOptions) {}

	public toXML(body: Record<string, any>): string {
		const xml = {
			_declaration: this.declaration,
			Response: body,
		};
		return converter.js2xml(xml, this.options);
	}

	public toJS(xml: string): converter.Element | converter.ElementCompact {
		return converter.xml2js(xml, this.options);
	}

	public getCityPayCheckResponse(receipt: string, username: string): string {
		const response = this.toXML({
			TransactionId: receipt,
			ResultCode: cityPayResponseCodes[0].ResultCode,
			Fields: {
				field1: {
					name: 'FIO',
					value: username,
				},
			},
		});
		return response;
	}

	public getCityPayPayResponse(params: { receipt: string; recordid: number; amount: string }): string {
		const response = this.toXML({
			TransactionId: params.receipt,
			TransactionExt: params.recordid,
			Amount: params.amount,
			ResultCode: cityPayResponseCodes[0].ResultCode,
			Comment: cityPayResponseCodes[0].Comment,
		});
		return response;
	}
}

export const xmlTool = new XMLTools(xmlDeclaration, defaultOptions);

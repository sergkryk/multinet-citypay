import converter from 'xml-js';
import { ConverterOptions } from './types';
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
    alwaysChildren: true
};
// Convert JavaScript object to XML string
export const convertToXml = function (responseBody: Record<string, any>, options?: ConverterOptions): string {
	const xml = {
		_declaration: xmlDeclaration,
		Response: responseBody,
	};
	return converter.js2xml(xml, defaultOptions);
};
// Convert XML string to JavaScript object
export const convertToJs = function (xmlText: string, options?: ConverterOptions): any {
	try {
		return converter.xml2js(xmlText, defaultOptions);
	} catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
		throw new Error(`Invalid XML input: ${message}`);
	}
};

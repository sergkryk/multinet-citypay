import { Request, Response, NextFunction } from 'express';

type BConfigs = {
    login: string,
    pass: string,
    isCash: boolean
}

export interface RequestWithBillingConfig extends Request {
    billingConfig?: BConfigs
  }

const billingConfigs: Record<string, BConfigs> = {
    psb: {
        login: process.env.BILLING_LOGIN_PSB!,
        pass: process.env.BILLING_PASS_PSB!,
        isCash: false
    },
    post: {
        login: process.env.BILLING_LOGIN_POST!,
        pass: process.env.BILLING_PASS_POST!,
        isCash: false
    },
}

export function operatorSelect(req: RequestWithBillingConfig, res: Response, next: NextFunction): void {
	try {
        const segments = req.path.split('/').filter(Boolean);
        const urlPrefix = segments[0] || '';
        if (urlPrefix in billingConfigs) {
            req.billingConfig = billingConfigs[urlPrefix]
        }
		next();
	} catch (error) {
		next(error);
	}
}

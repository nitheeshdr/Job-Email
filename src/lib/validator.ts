import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmailSyntax(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

export async function validateEmailMX(email: string): Promise<ValidationResult> {
  if (!validateEmailSyntax(email)) {
    return { isValid: false, error: 'Invalid email syntax' };
  }

  const domain = email.split('@')[1];
  if (!domain) {
    return { isValid: false, error: 'Could not extract domain from email' };
  }

  try {
    const mxRecords = await resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      return { isValid: true };
    } else {
      return { isValid: false, error: 'No MX records found for this domain' };
    }
  } catch (err: any) {
    return {
      isValid: false,
      error: `MX lookup failed: ${err.message || err.code || 'Unknown DNS error'}`
    };
  }
}

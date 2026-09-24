/**
 * Phone and Mobile normalization helper for Indian mobile numbers
 */
export function extract10DigitIndianMobile(input: string): {
  raw10: string;
  canonical: string;
  isValid: boolean;
} {
  const digitsOnly = input.replace(/\D/g, '');

  let tenDigits = '';
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    tenDigits = digitsOnly.substring(2);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    tenDigits = digitsOnly.substring(1);
  } else if (digitsOnly.length === 10) {
    tenDigits = digitsOnly;
  }

  const isValid = tenDigits.length === 10 && /^[6-9]\d{9}$/.test(tenDigits);
  return {
    raw10: tenDigits,
    canonical: isValid ? `+91${tenDigits}` : '',
    isValid,
  };
}

export const parse10DigitIndianMobile = extract10DigitIndianMobile;


"use client";

import { useState, useEffect } from 'react';

interface FormattedNumericValueProps {
  value: number | undefined | null;
  options?: Intl.NumberFormatOptions;
  locale?: string;
  placeholder?: string;
}

const FormattedNumericValue: React.FC<FormattedNumericValueProps> = ({ value, options, locale = 'es-ES', placeholder = "—" }) => {

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (typeof value !== 'number' || isNaN(value)) {
    return <>{placeholder}</>;
  }

  // During SSR or before hydration on the client, return a simple, non-locale-specific format
  // to prevent hydration mismatches.
  if (!isClient) {
    const hasDecimals = (options?.style === 'currency' || (options?.minimumFractionDigits && options.minimumFractionDigits > 0) || (options?.maximumFractionDigits && options.maximumFractionDigits > 0));
    let numStr = value.toFixed(hasDecimals ? (options?.minimumFractionDigits || 2) : 0);
    // Simple replacement for basic currency formatting. This is not perfect but avoids locale issues.
    if (options?.style === 'currency') {
      numStr = `${numStr} ${options.currency || ''}`.trim();
    }
    return <>{numStr}</>;
  }
  
  // Client-side, use the full locale-aware formatting.
  return <>{value.toLocaleString(locale, options)}</>;
};

export default FormattedNumericValue;

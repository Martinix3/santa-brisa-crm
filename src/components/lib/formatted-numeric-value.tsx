"use client";

import { useState, useEffect } from 'react';

interface FormattedNumericValueProps {
  value: number | undefined | null;
  options?: Intl.NumberFormatOptions;
  locale?: string;
  placeholder?: string;
}

const FormattedNumericValue: React.FC<FormattedNumericValueProps> = ({ value, options, locale = 'en-US', placeholder = "N/D" }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (typeof value !== 'number' || isNaN(value)) {
    return <>{placeholder}</>;
  }

  if (!isClient) {
    // For SSR and initial client render, use a basic format that's locale-neutral or less prone to mismatch.
    // Using toFixed(0) for whole numbers or toFixed(2) for numbers that might have decimals.
    // This depends on the expected nature of 'value'. Assuming they might have decimals based on usage.
    const precision = (value % 1 === 0) ? 0 : 2; // Basic check for whole number
    return <>{value.toFixed(precision)}</>;
  }

  // Client-side, use the specified locale and options
  return <>{value.toLocaleString(locale, options)}</>;
};

export default FormattedNumericValue;

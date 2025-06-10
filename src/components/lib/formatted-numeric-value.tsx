
"use client";

import { useState, useEffect } from 'react';

interface FormattedNumericValueProps {
  value: number;
  options?: Intl.NumberFormatOptions;
  locale?: string;
  fallbackValue?: string; 
}

const FormattedNumericValue: React.FC<FormattedNumericValueProps> = ({ value, options, locale, fallbackValue }) => {
  const [displayValue, setDisplayValue] = useState<string | null>(null);

  useEffect(() => {
    setDisplayValue(value.toLocaleString(locale, options));
  }, [value, locale, options]);

  if (displayValue === null) {
    // Server-render and client's first render will use this path
    return <>{fallbackValue !== undefined ? fallbackValue : value.toString()}</>;
  }

  // Client-side render after useEffect
  return <>{displayValue}</>;
};

export default FormattedNumericValue;

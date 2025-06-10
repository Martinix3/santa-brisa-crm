"use client";

import { useState, useEffect } from 'react';

interface FormattedNumericValueProps {
  value: number | undefined | null;
  options?: Intl.NumberFormatOptions;
  locale?: string;
  placeholder?: string;
}

const FormattedNumericValue: React.FC<FormattedNumericValueProps> = ({ value, options, locale, placeholder = "N/A" }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (typeof value !== 'number' || isNaN(value)) {
    return <>{placeholder}</>;
  }

  if (!isClient) {
    // Render a simpler, consistent version for SSR and initial client render
    // Or, if values are large and formatting is critical, consider rendering a placeholder/spinner initially
    return <>{value.toString()}</>;
  }

  return <>{value.toLocaleString(locale, options)}</>;
};

export default FormattedNumericValue;

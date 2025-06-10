
"use client";

import { useState, useEffect } from 'react';

interface FormattedNumericValueProps {
  value: number;
  options?: Intl.NumberFormatOptions;
  locale?: string;
}

const FormattedNumericValue: React.FC<FormattedNumericValueProps> = ({ value, options, locale }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    setIsClient(true);
  }, []); // Empty dependency array ensures this runs once on mount.

  if (!isClient) {
    // On the server, and on the client before the useEffect runs,
    // render the value as a simple string.
    return <>{value.toString()}</>;
  }

  // After the component has mounted on the client (isClient is true),
  // render the locale-formatted string.
  return <>{value.toLocaleString(locale, options)}</>;
};

export default FormattedNumericValue;

import type React from 'react';
import Image from 'next/image';

interface LogoProps {
  // You can add any specific props if needed in the future
}

const Logo: React.FC<LogoProps> = (props) => (
  <div
    className="inline-flex items-center justify-center p-2 rounded-md"
    style={{ backgroundColor: 'hsl(var(--primary))' }}
    aria-label="Logotipo de Santa Brisa CRM"
  >
    <Image
      src="/logo-santa-brisa-dark.png" // Assumes image is in public/logo-santa-brisa-dark.png
      alt="Santa Brisa"
      width={119} // Based on aspect ratio of provided image (e.g., 1190x284 -> 119x28.4)
      height={28}
      priority // Good for LCP if the logo is visible above the fold
      {...props} // Spread any additional props if passed
    />
  </div>
);

export default Logo;

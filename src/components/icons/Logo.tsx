
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
      src="https://santabrisa.com/cdn/shop/files/clavista_300x.svg?v=1742854903"
      alt="Santa Brisa Clavadista Logo"
      width={30} // Adjusted for the new SVG's aspect ratio and desired display size
      height={32} // Adjusted for the new SVG's aspect ratio and desired display size
      priority // Good for LCP if the logo is visible above the fold
      {...props} // Spread any additional props if passed
    />
  </div>
);

export default Logo;

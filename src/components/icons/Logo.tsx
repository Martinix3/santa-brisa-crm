
import type React from 'react';
import Image from 'next/image';

interface LogoProps {
  // You can add any specific props if needed in the future
}

const Logo: React.FC<LogoProps> = () => (
  <div
    className="inline-flex items-center justify-center p-2 rounded-md"
    style={{ backgroundColor: 'hsl(var(--primary))' }}
    aria-label="Logotipo de Santa Brisa CRM"
  >
    <Image
      src="https://santabrisa.com/cdn/shop/files/clavista_300x.svg?v=1742854903"
      alt="Santa Brisa Clavadista Logo"
      width={50} // Increased size
      height={50} // Increased size
      priority 
      unoptimized={true} // Bypass Next.js image optimization for this SVG
    />
  </div>
);

export default Logo;


import type React from 'react';
import Image from 'next/image';

interface LogoProps {
  // You can add any specific props if needed in the future
}

const Logo: React.FC<LogoProps> = () => (
  <div
    className="inline-flex items-center justify-center p-1 rounded-md" // Reduced padding slightly for very large logo
    style={{ backgroundColor: 'hsl(var(--primary))', width: '100px', height: '100px' }} // Set explicit size for container
    aria-label="Logotipo de Santa Brisa CRM"
  >
    <Image
      src="https://santabrisa.com/cdn/shop/files/clavista_300x.svg?v=1742854903"
      alt="Santa Brisa Clavadista Logo"
      width={100} 
      height={100}
      priority 
      unoptimized={true} // Bypass Next.js image optimization for this SVG
      className="object-contain" // Ensure image scales within container
    />
  </div>
);

export default Logo;

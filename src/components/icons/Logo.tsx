
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
      src="https://firebasestorage.googleapis.com/v0/b/santa-brisa-crm.appspot.com/o/logo%20santa%20brisa_sinfondo.png?alt=media&token=069a6659-7bed-4332-ac4d-5cddf1d31e29"
      alt="Santa Brisa Logo"
      width={100} 
      height={100}
      priority 
      className="object-contain" // Ensure image scales within container
    />
  </div>
);

export default Logo;

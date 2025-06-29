
import type React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 100, className }) => (
  <div
    className={cn(
      "inline-flex items-center justify-center p-1 rounded-md bg-primary",
      className
    )}
    style={{ width: `${size}px`, height: `${size}px` }}
    aria-label="Logotipo de Santa Brisa CRM"
  >
    <Image
      src="https://firebasestorage.googleapis.com/v0/b/santa-brisa-crm.appspot.com/o/logo%20santa%20brisa_sinfondo.png?alt=media&token=069a6659-7bed-4332-ac4d-5cddf1d31e29"
      alt="Santa Brisa Logo"
      width={size - 8}
      height={size - 8}
      priority 
      className="object-contain"
    />
  </div>
);

export default Logo;

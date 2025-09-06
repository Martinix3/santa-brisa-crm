
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
      "inline-flex items-center justify-center p-1",
      className
    )}
    style={{ width: `${size}px`, height: 'auto' }}
    aria-label="Logotipo de Santa Brisa CRM"
  >
    <Image
      src="/logo-santa-brisa-crm.png"
      alt="Santa Brisa Logo"
      width={size}
      height={size / 4} // Assuming an aspect ratio of roughly 4:1
      priority
      unoptimized={true}
      className="object-contain"
    />
  </div>
);

export default Logo;

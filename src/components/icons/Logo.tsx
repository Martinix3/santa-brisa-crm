import type React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
}

const Logo: React.FC<LogoProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 30"
    width="120"
    height="36"
    aria-label="Logotipo de Santa Brisa CRM"
    {...props}
  >
    <rect width="100" height="30" rx="5" fill="hsl(var(--primary))" />
    <text
      x="50%"
      y="50%"
      dominantBaseline="middle"
      textAnchor="middle"
      fontFamily="Inter, sans-serif"
      fontSize="12"
      fontWeight="bold"
      fill="hsl(var(--primary-foreground))"
    >
      Santa Brisa
    </text>
  </svg>
);

export default Logo;

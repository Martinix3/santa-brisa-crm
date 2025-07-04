// agenda-colors.ts
export const MODIFIER_NAMES = {
  commercial: 'commercial',
  event:      'event',
  admin:      'admin',
} as const;

export const COLOR_MAP: Record<(typeof MODIFIER_NAMES)[keyof typeof MODIFIER_NAMES], string> = {
  commercial: 'bg-brand-yellow',   // tailwind class → amarillo
  event:      'bg-brand-purple',   // violeta
  admin:      'bg-brand-blue',     // azul
};


import * as React from "react"
import { cn } from "@/lib/utils"

// 2. Adaptamos el contenedor principal de la Card para usar tokens de diseño.
// Usamos --sb-b-200 para el borde para mayor consistencia.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-[var(--sb-b-200)] bg-[var(--sb-white)] shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

// 3. Esta es la modificación más importante: transformamos el CardHeader.
// Se ha eliminado la propiedad de borde en línea redundante.
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { title?: string }
>(({ className, title, children, ...props }, ref) => (
  <div
    ref={ref}
    style={{
        // Si ya no existe waterHeader, puedes eliminar esta línea o reemplazarla con un valor fijo
    }}
    // Cambiamos el padding y la estructura para que coincida con el diseño de Santa Brisa.
    className={cn("px-4 py-2.5 border-b border-[var(--sb-b-200)]", className)}
    {...props}
  >
    {/* Si se pasa un título, se renderiza aquí con el estilo correcto. */}
    {title && <h3 className="text-sm font-medium text-[var(--sb-fg-700)]">{title}</h3>}
    {/* Mantenemos la capacidad de añadir más elementos si es necesario. */}
    {children}
  </div>
))
CardHeader.displayName = "CardHeader"

// 4. El resto de componentes se mantienen, pero ajustamos su padding para tener espacios más generosos.
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    // Usamos el token de diseño --sb-fg-700
    className={cn("text-sm text-[var(--sb-fg-700)]", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// Ajustamos el padding a p-4 para un look más limpio.
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

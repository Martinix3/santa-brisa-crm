# 🎨 Guía de Marca y Diseño: Santa Brisa CRM

## 1. Paleta de Colores

La paleta se inspira en la identidad de Santa Brisa: Acapulco, atardeceres, agave y elegancia retro.

### 1.1. Tokens de Marca (Primitivos)

Estos son los colores base. **No usar directamente en componentes**, usar los tokens semánticos.

- **`brand-black`**: `#1A1A1A` (Negro profundo para textos y fondos oscuros)
- **`brand-yellow`**: `#F7D15F` (Amarillo primario, evoca sol y celebración)
- **`brand-orange`**: `#D7713E` (Naranja atardecer, para acentos cálidos)
- **`brand-teal-light`**: `#A7D8D9` (Verde azulado claro, representa frescura y agave)
- **`brand-teal-dark`**: `#618E8F` (Verde azulado oscuro, para contraste y fondos)
- **`brand-white`**: `#FFFFFF` (Blanco puro)
- **`brand-off-white`**: `#F9F9F9` (Blanco roto para fondos y superficies)
- **`brand-gray`**: `#EAEAEA` (Gris neutro para bordes y separadores)

### 1.2. Tokens de Superficie (UI)

Usados para fondos, tarjetas y elementos de la interfaz.

- **`surface-background`**: `brand-off-white` (Fondo general de la app)
- **`surface-default`**: `brand-white` (Fondo para tarjetas, modales, etc.)
- **`surface-subtle`**: `brand-gray` (Fondos de sección o elementos agrupados)
- **`surface-inset`**: `brand-black` (Usado en el menú lateral oscuro)

### 1.3. Tokens Semánticos (Funcionales)

Estos son los tokens que **debes usar** en los componentes. Asocian un color a un propósito.

#### Texto
- **`text-primary`**: `brand-black` (Texto principal y titulares)
- **`text-secondary`**: `brand-black` con opacidad (60%) (Texto secundario, descripciones)
- **`text-subtle`**: `brand-black` con opacidad (40%) (Placeholders, texto deshabilitado)
- **`text-on-color`**: `brand-white` (Texto sobre fondos de color, como botones)
- **`text-on-dark`**: `brand-white` (Texto sobre fondos oscuros, como el menú lateral)

#### Botones y Acciones
- **`action-primary`**: `brand-yellow` (Botones primarios, acciones principales)
- **`action-primary-hover`**: `brand-yellow` oscurecido un 10%
- **`action-secondary`**: `brand-teal-dark` (Botones secundarios)
- **`action-secondary-hover`**: `brand-teal-dark` oscurecido un 10%
- **`action-destructive`**: `brand-orange` (Acciones de peligro, eliminar)

#### Notificaciones y Estados
- **`status-success`**: `brand-teal-dark` (Éxito, confirmación)
- **`status-warning`**: `brand-yellow` (Advertencia, pendiente)
- **`status-error`**: `brand-orange` (Error, fallo)
- **`status-info`**: `brand-teal-light` (Informativo, neutro)

#### Bordes
- **`border-default`**: `brand-gray` (Bordes estándar para inputs, tarjetas)
- **`border-subtle`**: `brand-gray` con opacidad (50%) (Separadores)

## 2. Tipografía

- **Fuente Principal:** `Inter` (sans-serif)
- **Jerarquía:**
  - `H1 (Headline)`: 32px, `font-semibold`
  - `H2 (Título de Sección)`: 24px, `font-semibold`
  - `H3 (Subtítulo)`: 18px, `font-medium`
  - `Body (Párrafo)`: 16px, `font-normal`
  - `Label (Etiqueta)`: 14px, `font-medium`
  - `Caption (Leyenda)`: 12px, `font-normal`

## 3. Espaciado y Rejilla

Usamos una rejilla base de **8px**. Todos los márgenes, paddings y tamaños deberían ser múltiplos de 8.

- `p-2` (4px)
- `p-4` (8px)
- `p-6` (12px)
- `p-8` (16px)
- `p-12` (24px)
- `p-16` (32px)

## 4. Radios y Sombras

- **Radios:**
  - `radius-sm`: 4px
  - `radius-md`: 8px (default para tarjetas y botones)
  - `radius-lg`: 16px
  - `radius-full`: `9999px` (para elementos circulares)
- **Sombras:**
  - `shadow-sm`: Sombra sutil para elementos en reposo.
  - `shadow-md`: Sombra estándar para dar elevación (ej. al hacer hover).
  - `shadow-lg`: Sombra profunda para elementos flotantes como modales o desplegables.

## 5. Checklist de Accesibilidad (WCAG AA)

- [ ] **Contraste de Color:** Verificar que todo el texto cumple un ratio de contraste de `4.5:1` sobre su fondo.
- [ ] **Estados de Foco:** Todos los elementos interactivos (botones, enlaces, inputs) deben tener un estado `:focus` visible y claro (usar `ring` de Tailwind).
- [ ] **Etiquetas (`aria-label`)**: Todos los iconos-botón deben tener un `aria-label` descriptivo.
- [ ] **Semántica HTML:** Usar `<h1>`, `<nav>`, `<main>`, `<button>` correctamente.

## 6. Ejemplos de Componentes

### Botón Primario
- **Fondo:** `action-primary`
- **Texto:** `text-on-color`
- **Hover:** `action-primary-hover`
- **Borde:** Ninguno
- **Radio:** `radius-md`

### Botón Secundario
- **Fondo:** Transparente
- **Texto:** `action-secondary`
- **Borde:** `1px solid action-secondary`
- **Hover (Fondo):** `action-secondary`
- **Hover (Texto):** `text-on-color`
- **Radio:** `radius-md`

### Tarjeta (Card)
- **Fondo:** `surface-default`
- **Borde:** `1px solid border-default`
- **Sombra:** `shadow-sm`
- **Hover (Sombra):** `shadow-md`
- **Radio:** `radius-lg`

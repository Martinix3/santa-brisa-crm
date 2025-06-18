# Santa Brisa CRM - Next.js

Este es un proyecto CRM (Customer Relationship Management) desarrollado para Santa Brisa utilizando Next.js, React, ShadCN UI, Tailwind CSS y Genkit para funcionalidades de IA.

## Descripción General

La aplicación permite gestionar clientes (cuentas), registrar interacciones y pedidos, realizar seguimiento de tareas, organizar eventos de marketing, y visualizar KPIs de rendimiento tanto para el equipo comercial como para el lanzamiento de productos. Incluye roles de usuario (Administrador, Representante de Ventas, Distribuidor) con diferentes niveles de acceso y funcionalidades.

## Tecnologías Principales

*   **Framework Frontend:** Next.js (con App Router)
*   **Librería UI:** React
*   **Componentes UI:** ShadCN UI
*   **Estilos CSS:** Tailwind CSS
*   **Inteligencia Artificial:** Genkit
*   **Autenticación:** Firebase Auth

## Funcionalidades Destacadas

*   Gestión de Cuentas de Clientes
*   Registro y Seguimiento de Pedidos e Interacciones
*   Agenda Personal y de Equipo
*   Gestión de Eventos de Marketing
*   Panel de Control con KPIs y Objetivos Estratégicos
*   Seguimiento del Rendimiento del Equipo Comercial
*   Gestión de Usuarios y Configuración (para Administradores)
*   Biblioteca de Recursos de Marketing

## Primeros Pasos

Para empezar a explorar la aplicación, una vez iniciada, puedes navegar a:

*   `/dashboard` para ver el panel principal.
*   `/accounts` para gestionar las cuentas de clientes.
*   `/order-form` para registrar una nueva visita o pedido.

El archivo principal de la aplicación se encuentra en `src/app/page.tsx`, que redirige al dashboard. Las diferentes secciones de la aplicación se encuentran bajo `src/app/(app)/`.

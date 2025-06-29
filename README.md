# Santa Brisa CRM - Next.js

Este es un proyecto CRM (Customer Relationship Management) desarrollado para Santa Brisa utilizando Next.js, React, ShadCN UI, Tailwind CSS y Genkit para funcionalidades de IA.

## Descripción General

La aplicación es una herramienta integral para la gestión comercial, operativa y de marketing de Santa Brisa. Permite gestionar clientes, registrar interacciones y pedidos, supervisar el rendimiento del equipo, administrar gastos y facturación, organizar eventos y mucho más. Incluye roles de usuario (Administrador, Representante de Ventas, Distribuidor, Clavadista) con diferentes niveles de acceso y funcionalidades adaptadas.

## Tecnologías Principales

*   **Framework Frontend:** Next.js (con App Router)
*   **Librería UI:** React
*   **Componentes UI:** ShadCN UI
*   **Estilos CSS:** Tailwind CSS
*   **Inteligencia Artificial:** Genkit (Google AI)
*   **Base de Datos y Autenticación:** Firebase (Firestore, Auth, Storage)

## Funcionalidades Destacadas

### Gestión Comercial y CRM
*   **Gestión de Cuentas:** Fichas de cliente centralizadas con información de contacto, direcciones, historial de interacciones y notas internas.
*   **Registro de Interacciones:** Asistente paso a paso para registrar visitas, pedidos, seguimientos o interacciones fallidas.
*   **Agenda y Tareas:** Calendario de actividades y panel de seguimiento para gestionar visitas y tareas pendientes.
*   **Panel de Pedidos:** Vista global para el seguimiento del estado de los pedidos de colocación.

### Módulos Administrativos y de Operaciones
*   **Facturación Propia (Ventas Directas SB):** Módulo dedicado para registrar y gestionar las ventas facturadas directamente por Santa Brisa.
*   **Gestión de Gastos:** Registro de compras y gastos, con un **procesador de facturas mediante IA** que extrae automáticamente los datos de los archivos subidos.
*   **Gestión de Proveedores:** Directorio de proveedores con su información de contacto y historial de compras.
*   **Inventario y Materiales:** Control del stock de material promocional, con actualización automática según su uso en eventos o pedidos.
*   **Gestión de Solicitudes de Muestras:** Flujo completo para la solicitud, aprobación y seguimiento del envío de muestras de producto.

### Equipo y Rendimiento
*   **Panel de Control (Dashboard):** Visualización de KPIs de lanzamiento, objetivos estratégicos y progreso mensual del equipo o individual.
*   **Equipo de Ventas:** Seguimiento del rendimiento de los comerciales con KPIs, objetivos y tendencias de ventas.
*   **Panel de Clavadistas:** Panel específico para medir la participación y el valor generado por los Brand Ambassadors en eventos y visitas.

### Marketing y Soporte
*   **Gestión de Eventos:** Planificación y gestión de eventos de marketing y activaciones de marca.
*   **Recursos de Marketing:** Biblioteca centralizada para acceder a folletos, presentaciones y otros materiales de apoyo.
*   **Asistente IA "Santi":** Asistente conversacional entrenado con la información de producto para ayudar al equipo de ventas con argumentos y datos.

### Configuración (Solo Administradores)
*   **Gestión de Usuarios:** Creación y edición de usuarios y asignación de roles.
*   **Gestión de Objetivos:** Definición de los objetivos estratégicos y las metas de KPIs para el dashboard.

## Primeros Pasos

Para empezar a explorar la aplicación, una vez iniciada, puedes navegar a:

*   `/dashboard`: Para ver el panel principal.
*   `/accounts`: Para gestionar las cuentas de clientes.
*   `/order-form`: Para registrar una nueva visita o pedido.
*   `/purchases`: Para gestionar los gastos y subir facturas.
*   `/direct-sales-sb`: Para la facturación propia de Santa Brisa.

El archivo principal de la aplicación se encuentra en `src/app/page.tsx`, que redirige al dashboard. Las diferentes secciones de la aplicación se encuentran bajo `src/app/(app)/`.

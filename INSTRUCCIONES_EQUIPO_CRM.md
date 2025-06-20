# Guía de Uso: Santa Brisa CRM

¡Bienvenido al CRM de Santa Brisa! Esta herramienta está diseñada para ayudarnos a gestionar nuestras relaciones con clientes, optimizar nuestros procesos de venta y marketing, y alcanzar nuestros objetivos.

## 0. ¡MUY IMPORTANTE! Entorno y Registro de Datos

*   **Entorno de Pruebas con Datos Reales:** Actualmente estamos en una fase de pruebas y mejora continua del CRM. **Es fundamental que reportes cualquier fallo, comportamiento inesperado o sugerencia de mejora que encuentres.** Tu feedback es crucial.
*   **¡Los Datos se Guardan!** Aunque estemos probando, toda la información que introduzcas (clientes, pedidos, interacciones) **se está guardando en la base de datos real.** Por favor, introduce datos veraces y relevantes.
*   **REGISTRO EXHAUSTIVO DE INTERACCIONES:** Para el correcto funcionamiento del CRM y para que podamos medir nuestro rendimiento y cumplir los objetivos, **es VITAL que cada miembro del equipo (Comerciales y Clavadistas) registre TODAS las interacciones con los clientes, ya sean positivas (pedidos, avances) o negativas (sin pedido, objeciones).** Un CRM solo es útil si la información es completa y está actualizada. ¡Cada interacción cuenta!

## 1. Acceso y Roles

*   **Acceso:** Podrás acceder al CRM a través de la URL proporcionada con tu usuario y contraseña.
*   **Roles:** Tu rol (Administrador, Representante de Ventas, Distribuidor o Clavadista) determinará las secciones y funcionalidades a las que tienes acceso.

## 2. Flujos de Trabajo Esenciales por Rol

### A. Representante de Ventas (SalesRep) y Clavadista

Ambos roles son cruciales para generar demanda y registrar la actividad en el punto de venta.

**Objetivo Principal:** Registrar **TODAS** las interacciones con clientes (potenciales y existentes) y los resultados de las mismas. Esto es crítico para alcanzar nuestros objetivos.

**Funcionalidades Clave:**

*   **Registrar Interacción (`/order-form`):**
    *   **Programar Nueva Visita:** Planifica tus futuras visitas.
        *   **Importante:** Si un Clavadista participa, selecciónalo en el campo "Clavadista (Brand Ambassador)".
    *   **Registrar Resultado de Visita/Interacción:**
        *   **Cliente Existente:**
            1.  Selecciona "Cliente Existente".
            2.  **Utiliza el desplegable "Seleccionar Cliente Existente"** para buscar y seleccionar la cuenta. Esto autocompletará los datos del cliente y asociará correctamente la interacción.
            3.  Si el cliente no aparece, pero estás seguro de que existe, consulta con un Admin antes de crear uno nuevo.
        *   **Cliente Nuevo:**
            1.  Selecciona "Cliente Nuevo".
            2.  Introduce el "Nombre del Cliente".
            3.  Completa los campos opcionales de "Información de la Nueva Cuenta" si dispones de ellos (Nombre Fiscal, CIF, etc.). Estos datos ayudarán a crear una ficha de cuenta más completa.
        *   **Resultado del Pedido:**
            *   **Pedido Exitoso:** Rellena los detalles del producto (unidades, precio unitario SIN IVA). El sistema calculará el valor total con IVA.
                *   **Forma de Pago:** El distribuidor nos exige que, en la medida de lo posible, **todos los pedidos se cobren por ADELANTADO.** Por favor, intentad conseguir esta forma de pago. Si el cliente se niega o exige otras condiciones, **reportadlo directamente al Administrador** para valorar el caso.
            *   **Requiere Seguimiento:** Indica la próxima acción y, opcionalmente, la fecha.
            *   **Fallido / Sin Pedido:** Indica el motivo del fallo y la próxima acción. **Es crucial registrar también estas interacciones.**
    *   **Clavadistas Registrando Interacciones Propias:**
        *   Si un Clavadista inicia una nueva interacción (no una visita conjunta ya programada), su nombre se registrará como "Comercial" en el pedido y su ID como "Clavadista".
        *   **MUY IMPORTANTE (Clavadistas): Debes seleccionar el "Comercial a Asignar"** para esta nueva interacción. Este será el responsable principal de la cuenta y del seguimiento posterior.
    *   **Canal de Origen de Colocación:** Selecciona cómo se originó esta oportunidad de venta/colocación.
    *   **Materiales Promocionales:** Si entregaste material, añádelo.

*   **Mi Agenda (`/my-agenda`):**
    *   Visualiza tus visitas programadas, seguimientos y eventos asignados.
    *   Haz clic en una actividad para ver detalles o registrar su resultado (si es una visita/seguimiento).

*   **Tareas de Seguimiento (`/crm-follow-up`):**
    *   Gestiona tus tareas de seguimiento pendientes y vencidas.
    *   Puedes editar rápidamente la fecha de próxima acción.

*   **Cuentas (`/accounts`) (Principalmente SalesRep):**
    *   Consulta la información de las cuentas asignadas o creadas por ti.
    *   Los Admin pueden crear y editar todas las cuentas.

*   **Panel de Pedidos (`/orders-dashboard`):**
    *   SalesReps y Clavadistas pueden consultar todos los pedidos para tener una visión global de la actividad y los estados.

*   **Equipo de Ventas (`/team-tracking`) (Principalmente SalesRep):**
    *   Visualiza tu rendimiento y el de tu equipo.

*   **Panel de Clavadistas (`/clavadistas`):**
    *   **Clavadistas:** Acceden a su perfil individual para ver sus participaciones y valor generado.
    *   **SalesReps/Admin:** Ven el panel general y perfiles individuales.

*   **Eventos (`/events`):**
    *   Consulta los detalles de los eventos de marketing y activaciones.
    *   Si estás asignado a un evento, aparecerá en tu agenda.

*   **Recursos de Marketing (`/marketing-resources`):**
    *   Descarga materiales de apoyo.

*   **Asistente IA (`/marketing/ai-assistant`):**
    *   Consulta a "Santi" para obtener información sobre productos, argumentos de venta, etc.

### B. Administrador (Admin)

**Objetivo Principal:** Supervisar toda la actividad del CRM, gestionar datos maestros, usuarios y realizar la facturación directa de Santa Brisa. Asegurar la calidad de los datos y el correcto uso de la herramienta por parte del equipo.

**Funcionalidades Adicionales (además de las de SalesRep):**

*   **Gestión de Usuarios (`/admin/user-management`):**
    *   Crear, editar y eliminar (de Firestore) usuarios.
    *   **Importante:** La eliminación de un usuario de Firebase Authentication (para revocar acceso completo) debe hacerse manualmente desde la consola de Firebase.
*   **Ventas Directas SB (`/direct-sales-sb`):**
    *   **Este es el módulo para registrar las ventas que Santa Brisa factura directamente.**
    *   **Canales:** "Importador", "Online", "Estratégica", etc.
    *   Crea nuevas ventas, añade ítems con el precio neto de venta de Santa Brisa, gestiona estados (Borrador, Confirmada, Facturada, Pagada).
    *   Puedes referenciar las "Órdenes de Colocación" que esta venta directa cubre.
    *   **Gestionar dificultades con la forma de pago "Adelantado" reportadas por el equipo.**
*   **Panel de Pedidos (`/orders-dashboard`):**
    *   Supervisa todos los pedidos de colocación (los que gestiona el importador).
    *   Puedes editar detalles y cambiar estados, incluyendo el estado "Facturado" y asociar la URL de la factura.
*   **Configuración (`/admin/settings`):**
    *   Gestiona Objetivos Estratégicos, Metas de KPIs y Materiales Promocionales.
*   **Filtrado Avanzado en Agendas/Tareas:**
    *   Puedes ver la agenda y tareas de cualquier SalesRep o Clavadista.

### C. Distribuidor (Distributor)

**Objetivo Principal:** Consultar los pedidos de colocación que debe gestionar, actualizar su estado y acceder a recursos de marketing.

**Funcionalidades Clave:**

*   **Panel de Pedidos (`/orders-dashboard`):**
    *   Visualiza los pedidos de cliente final que Santa Brisa (a través de su equipo comercial) ha generado y que el importador/distribuidor debe surtir.
    *   Puede actualizar el estado de estos pedidos (ej. de "Confirmado" a "Procesando" o "Enviado") y añadir notas.
*   **Eventos (`/events`):**
    *   Consulta los eventos programados.
*   **Recursos de Marketing (`/marketing-resources`):**
    *   Accede a materiales de apoyo.
*   **Panel Principal (`/dashboard`):**
    *   Visualiza KPIs generales.

## 3. Puntos Importantes para Todos

*   **Órdenes de Colocación vs. Ventas Directas SB:**
    *   **Órdenes de Colocación (módulo "Panel de Pedidos"):** Son las "ventas" que tu equipo comercial o clavadistas logran en puntos de venta finales. El valor aquí es el PVP estimado. El *importador* factura estas órdenes.
    *   **Ventas Directas SB (módulo "Ventas Directas SB"):** Son las ventas que *Santa Brisa factura directamente* a sus clientes (sea el importador, un cliente online, etc.). El valor aquí es el neto de Santa Brisa.
*   **Calidad de los Datos:** La precisión y la actualización constante de los datos son fundamentales para que el CRM sea útil. **Recuerda: REGISTRA TODO, bueno y malo.**
*   **Notas:** Utiliza los campos de notas para añadir contexto e información relevante que pueda ser útil para ti o para otros miembros del equipo.

## 4. Próximas Mejoras (Roadmap)

El CRM está en constante evolución. Algunas de las funcionalidades que se planean implementar en futuras versiones incluyen:

*   **Perfil de Usuario Personalizado:** Posibilidad de ver y (según permisos) editar detalles básicos de tu perfil de usuario directamente en la aplicación.
*   **Cambio de Contraseña:** Funcionalidad para que los usuarios puedan cambiar su propia contraseña de acceso al CRM.
*   **Subida de Facturas:** Permitir adjuntar archivos de factura (PDFs, imágenes) directamente a los pedidos (para Admin y Distributor) o a las Ventas Directas SB (para Admin).
*   **Notificaciones Mejoradas:** Alertas dentro de la app (y opcionalmente por email) para tareas vencidas, nuevos pedidos asignados o cambios relevantes.
*   **Informes y Exportaciones Avanzadas:** Herramientas para que los Administradores puedan generar informes más personalizados y exportar datos en formatos como Excel.
*   **Integración con Calendarios Externos:** Sincronización de "Mi Agenda" del CRM con calendarios como Google Calendar u Outlook Calendar.
*   **Gestión de Stock de Material Promocional:** Un control más detallado del inventario de materiales de marketing.
*   *(Otras mejoras se irán comunicando)*

## 5. Soporte

Si tienes alguna duda, problema técnico o sugerencia (¡especialmente importante en esta fase de pruebas!), por favor, contacta con el administrador del CRM.

¡Gracias por tu colaboración para hacer de este CRM una herramienta poderosa para Santa Brisa!

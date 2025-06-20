
# Checklist de Revisión Pre-Producción: Santa Brisa CRM

## I. Acceso y Roles de Usuario

-   **[ ] Login/Logout:**
    -   [ ] Login exitoso con credenciales válidas para cada rol (Admin, SalesRep, Distributor, Clavadista).
    -   [ ] Fallo de login con credenciales incorrectas.
    -   [ ] Logout exitoso desde cada rol.
    -   [ ] Redirección correcta después de login/logout.
-   **[ ] Visibilidad de Menús y Secciones por Rol:**
    -   [ ] **Admin:** Acceso a todas las secciones, incluyendo Configuración y Gestión de Usuarios.
    -   [ ] **SalesRep:** Acceso a Dashboard, Agenda, Seguimiento, Registrar Visita, Cuentas, Pedidos, Equipo Ventas, Recursos, Asistente IA. Sin acceso a Configuración Admin, Facturación SB.
    -   [ ] **Distributor:** Acceso a Dashboard, Pedidos, Eventos, Recursos. Sin acceso a Cuentas, Equipo Ventas, Seguimiento, Registrar Visita, Asistente IA, Configuración Admin, Facturación SB.
    -   [ ] **Clavadista:** Acceso a Dashboard, Agenda, Seguimiento, Registrar Visita, Eventos, Panel Clavadistas (su perfil), Recursos, Asistente IA. Sin acceso a Configuración Admin, Facturación SB, Cuentas general, Panel de Pedidos general.
-   **[ ] Gestión de Usuarios (Admin):**
    -   [ ] Crear nuevo usuario (todos los roles), verificar que se crea en Firebase Auth y Firestore.
    -   [ ] Editar usuario existente (actualizar rol, objetivos si aplica).
    -   [ ] Eliminar usuario de Firestore (recordar que la eliminación de Auth es manual).

## II. Funcionalidades Principales del CRM

-   **[ ] Cuentas (`/accounts` - Admin, SalesRep):**
    -   [ ] Crear nueva cuenta (validaciones de CIF duplicado).
    *   [ ] Editar cuenta existente.
    *   [ ] Ver detalles de cuenta (información general, contacto, direcciones, notas).
    *   [ ] Historial de interacciones y pedidos en la ficha de cuenta se carga correctamente.
    *   [ ] Filtros de búsqueda (nombre, CIF, ciudad) y estado funcionan.
    *   [ ] Impresión de ficha de cuenta.
-   **[ ] Registro de Interacción/Pedido (`/order-form` - Admin, SalesRep, Clavadista):**
    *   [ ] **Programar Nueva Visita:**
        *   [ ] Funciona correctamente para todos los roles permitidos.
        *   [ ] El SalesRep se asigna correctamente (Admin puede elegir, SalesRep/Clavadista se autoasignan).
        *   [ ] Se puede seleccionar Clavadista.
    *   [ ] **Registrar Resultado de Visita Programada:**
        *   [ ] Carga datos de visita existente.
        *   [ ] **Pedido Exitoso:**
            *   [ ] Permite seleccionar cliente nuevo/existente.
            *   [ ] Si es nuevo, se crea cuenta con datos básicos y estado correcto.
            *   [ ] Si es existente (usando el nuevo desplegable), se autocompletan datos y se asocia `accountId`.
            *   [ ] Campos de producto, unidades, precio son obligatorios.
            *   [ ] Cálculo de valor total, subtotal, IVA es correcto.
            *   [ ] Se guarda pedido con estado "Confirmado".
        *   [ ] **Requiere Seguimiento:**
            *   [ ] Campos de próxima acción y fecha son obligatorios.
            *   [ ] Se guarda pedido con estado "Seguimiento".
        *   [ ] **Fallido / Sin Pedido:**
            *   [ ] Campos de próxima acción y motivo de fallo son obligatorios.
            *   [ ] Se guarda pedido con estado "Fallido".
    *   [ ] **Clavadistas registrando interacciones:**
        *   [ ] Su ID se guarda como `clavadistaId`.
        *   [ ] Si es nueva interacción, su nombre se guarda como `salesRep` en el pedido.
        *   [ ] Pueden registrar resultados de visitas donde participaron.
    *   [ ] **Campo `canalOrigenColocacion`:** Se puede seleccionar y se guarda correctamente.
    *   [ ] **Asignación de Materiales Promocionales:**
        *   [ ] Se pueden añadir/eliminar materiales.
        *   [ ] Cálculo de coste estimado es correcto.
        *   [ ] Se guardan correctamente con el pedido.
-   **[ ] Panel de Pedidos (`/orders-dashboard` - Admin, SalesRep, Distributor):**
    *   [ ] Carga y muestra todos los pedidos (no visitas programadas/seguimientos).
    *   [ ] Filtros (búsqueda, estado, fecha, ciudad) funcionan.
    *   [ ] Edición de Pedido (Admin/Distributor):
        *   [ ] **Admin:** Puede editar todos los campos relevantes.
        *   [ ] **Distributor:** Solo puede editar estado y notas.
        *   [ ] Actualización de estado funciona.
        *   [ ] Diálogo de edición carga datos correctamente y guarda cambios.
    *   [ ] Selección múltiple y descarga CSV (Admin/Distributor).
    *   [ ] Eliminación de pedidos (Admin).
-   **[ ] Mi Agenda (`/my-agenda` - Admin, SalesRep, Clavadista):**
    *   [ ] Carga y muestra visitas programadas, seguimientos y eventos para el usuario/filtro.
    *   [ ] **Admin:** Filtro por Comercial/Clavadista funciona.
    *   [ ] **SalesRep/Clavadista:** Ve solo sus ítems asignados.
    *   [ ] Calendario resalta días con actividades.
    *   [ ] Selección de día muestra actividades correctas.
    *   [ ] Enlaces para registrar resultado o ver detalles del evento funcionan.
-   **[ ] Tareas de Seguimiento (`/crm-follow-up` - Admin, SalesRep, Clavadista):**
    *   [ ] Carga y muestra visitas programadas y tareas de seguimiento (no pedidos confirmados).
    *   [ ] Filtros (búsqueda, ciudad, usuario (Admin), tipo tarea, fecha) funcionan.
    *   [ ] Tareas vencidas se resaltan.
    *   [ ] Edición rápida de fecha de próxima acción/visita.
    *   [ ] Enlaces para registrar resultado o ver agenda completa funcionan.

## III. Módulos Específicos

-   **[ ] Equipo de Ventas (`/team-tracking` - Admin, SalesRep):**
    *   [ ] Lista de comerciales (SalesReps) con sus estadísticas agregadas.
    *   [ ] Progreso mensual de cuentas y visitas por comercial.
    *   [ ] Enlace a perfil individual del comercial.
    *   [ ] **Perfil Individual (`/team-tracking/[memberId]`):**
        *   [ ] Carga datos del comercial, KPIs, gráfico de tendencia, últimas interacciones y cuentas.
-   **[ ] Panel de Clavadistas (`/clavadistas` - Admin, SalesRep, Clavadista):**
    *   [ ] Lista de Clavadistas con sus estadísticas de participación y valor.
    *   [ ] Enlace a perfil individual.
    *   [ ] **Perfil Individual (`/clavadistas/[clavadistaId]`):**
        *   [ ] Carga datos del clavadista, KPIs, y listado de pedidos/visitas donde participó.
-   **[ ] Facturación Santa Brisa (`/direct-sales-sb` - Admin):**
    *   [ ] Lista de ventas directas SB.
    *   [ ] Filtros (búsqueda, estado) funcionan.
    *   [ ] **Crear/Editar Venta Directa SB (Diálogo):**
        *   [ ] Selección de cliente (solo tipos relevantes).
        *   [ ] Selección de canal de venta.
        *   [ ] Añadir/eliminar ítems (producto, cantidad, precio neto SB).
        *   [ ] Cálculo automático de subtotales, IVA, total factura.
        *   [ ] Campos de fecha emisión, nº factura, estado, vencimiento, referencias, notas.
        *   [ ] Guardado y actualización correcta.
    *   [ ] Eliminación de venta directa.
-   **[ ] Eventos (`/events` - Admin, SalesRep, Distributor, Clavadista):**
    *   [ ] Lista de eventos.
    *   [ ] Filtros (búsqueda, tipo, estado) funcionan.
    *   [ ] **Admin:**
        *   [ ] Crear nuevo evento.
        *   [ ] Editar evento existente (asignar responsables, materiales, etc.).
        *   [ ] Eliminar evento.
    *   [ ] **Otros roles:**
        *   [ ] Pueden ver detalles del evento.
        *   [ ] Clavadistas/SalesReps ven los eventos a los que están asignados en su agenda.
-   **[ ] Recursos de Marketing (`/marketing-resources` - Todos los roles con acceso a la app):**
    *   [ ] Acordeón muestra categorías y recursos.
    *   [ ] Enlaces de descarga funcionan (simulado, ya que son '#').
-   **[ ] Asistente IA (`/marketing/ai-assistant` - Admin, SalesRep, Clavadista):**
    *   [ ] Enviar pregunta y recibir respuesta de la IA.
    *   [ ] Manejo de estado de carga.

## IV. Componentes Generales y UI

-   **[ ] Dashboard Principal (`/dashboard`):**
    *   [ ] KPIs de lanzamiento se calculan y muestran correctamente.
    *   [ ] Gráficos de distribución y progreso se muestran correctamente.
    *   [ ] Objetivos estratégicos se muestran.
    *   [ ] **Admin/SalesRep:** Widget de progreso mensual (equipo/individual) se muestra y calcula bien.
-   **[ ] Menú Lateral y Navegación:**
    *   [ ] Secciones correctas visibles según rol.
    *   [ ] Indicador de página activa funciona.
    *   [ ] Tooltips en modo colapsado.
-   **[ ] Widget de Próximas Tareas (Barra Superior):**
    *   [ ] Icono y contador se muestran correctamente para Admin, SalesRep, Clavadista.
    *   [ ] Muestra tareas y eventos relevantes para los próximos 7 días.
    *   [ ] Enlaces a los ítems funcionan.
    *   [ ] No parpadea y maneja bien los estados de carga.
-   **[ ] Indicadores de Progreso Mensual (Barra Superior - Admin, SalesRep):**
    *   [ ] Muestran el progreso correcto de cuentas/visitas.
    *   [ ] Tooltips informativos.
-   **[ ] Notificaciones Toast:**
    *   [ ] Mensajes de éxito, error e información se muestran adecuadamente.
-   **[ ] Responsividad:**
    *   [ ] La aplicación se ve y funciona bien en diferentes tamaños de pantalla (móvil, tablet, escritorio).
-   **[ ] Consistencia Visual:**
    *   [ ] Uso consistente de colores, fuentes, espaciado.
    *   [ ] Componentes ShadCN se ven como se espera.

## V. Configuración (Admin)

-   **[ ] Panel de Configuración (`/admin/settings`):**
    *   [ ] Enlaces a las subsecciones funcionan.
-   **[ ] Gestión de Usuarios (`/admin/user-management`):** (Ya cubierto en Roles)
-   **[ ] Gestión de Objetivos Estratégicos (`/admin/objectives-management`):**
    *   [ ] Crear, editar, eliminar objetivos.
    *   [ ] Marcar/desmarcar como completado.
    *   [ ] Cambios se reflejan en el dashboard.
-   **[ ] Gestión de Metas KPIs (`/admin/kpi-launch-targets`):**
    *   [ ] Editar valor objetivo de los KPIs de lanzamiento.
    *   [ ] Cambios se reflejan en el dashboard.
-   **[ ] Gestión de Materiales Promocionales (`/admin/promotional-materials`):**
    *   [ ] Crear, editar, eliminar materiales.
    *   [ ] Registrar datos de última compra (cantidad, coste total, fecha).
    *   [ ] Coste unitario se calcula y muestra.
    *   [ ] Estos materiales están disponibles para seleccionar en Eventos y Pedidos.

## VI. Consideraciones Adicionales

-   **[ ] Errores de Consola:** Revisar la consola del navegador en busca de errores o warnings.
-   **[ ] Carga de Datos:** Verificar que los indicadores de carga (`Loader2`) se muestran cuando es apropiado y desaparecen.
-   **[ ] Pruebas con Diferentes Escenarios de Datos:**
    *   [ ] Sin datos (listas vacías).
    *   [ ] Con muchos datos (para probar paginación si la hubiera, o rendimiento de listas largas).
    *   [ ] Con datos "incorrectos" o inesperados en formularios.

Este checklist es bastante exhaustivo. ¡Mucha suerte con la revisión!

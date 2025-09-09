> [!WARNING]
> **Aviso para Desarrolladores y Colaboradores IA**
> Este proyecto se gestiona con la asistencia de una IA que sigue un conjunto estricto de reglas. Antes de realizar cualquier cambio o ejecutar comandos, por favor, consulta las [**Reglas de Colaboración con IA (`docs/AI_RULES.md`)**](./docs/AI_RULES.md).

# Santa Brisa CRM - Documentación Técnica

## 1. Arquitectura General

Este proyecto es un CRM (Customer Relationship Management) y ERP ligero construido con una arquitectura moderna basada en **Next.js** y **Firebase**. Está diseñado para ser una aplicación web monolítica pero modular, con una clara separación entre la lógica del frontend, el backend (serverless) y los servicios de IA.

-   **Framework Frontend:** **Next.js 14+** con **App Router**. Se utilizan **React Server Components (RSC)** por defecto para optimizar el rendimiento y reducir el JavaScript enviado al cliente. La interactividad del cliente se gestiona con el directive `"use client"`.
-   **Librería UI:** **React 18+** con Hooks y componentes funcionales.
-   **Componentes UI y Estilos:** La interfaz se construye con **ShadCN UI**, una colección de componentes reutilizables y accesibles construidos sobre **Tailwind CSS**. Esto permite un desarrollo rápido y un diseño consistente.
-   **Backend y Base de Datos (BaaS):** **Firebase** es el núcleo del backend.
    -   **Firebase Authentication:** Gestiona la autenticación de usuarios por email/contraseña y roles.
    -   **Firestore:** Base de datos NoSQL utilizada para toda la información persistente (cuentas, pedidos, inventario, etc.).
    -   **Firebase Storage:** Almacena archivos subidos, como facturas de proveedores.
-   **Funcionalidades de IA:** 
    -   **Procesamiento de Facturas:** Se utiliza **Google Cloud Document AI** (Invoice Parser) para extraer datos estructrados de facturas. Este es un modelo especializado y altamente preciso.
    -   **Asistente de Marketing y otras tareas:** Se utiliza **Genkit**, el framework de IA de código abierto de Google, para orquestar las llamadas a los modelos de **Google AI (Gemini)**.
-   **Despliegue:** La aplicación se despliega en **Firebase Hosting**, que está configurado para soportar aplicaciones Next.js. Esto aprovecha las **Cloud Functions for Firebase** para ejecutar el código del lado del servidor de Next.js de forma serverless.

---

## 2. Estructura del Proyecto

La organización del código fuente sigue las convenciones de Next.js y separa las responsabilidades de forma clara.

-   `src/app/(app)/`: Contiene todas las rutas principales de la aplicación que requieren autenticación. El layout `(app)/layout.tsx` actúa como un guardian, redirigiendo a los usuarios no autenticados.
-   `src/app/login/`: La página pública de inicio de sesión.
-   `src/components/`:
    -   `ui/`: Componentes base de ShadCN UI (Button, Card, etc.).
    -   `app/`: Componentes complejos y específicos de la aplicación (ej: `order-form`, `dashboard/kpi-grid`, diálogos de edición).
-   `src/contexts/`: Contextos de React para la gestión de estado global.
    -   `auth-context.tsx`: Gestiona la sesión del usuario, su perfil de `teamMember` y su rol en toda la aplicación.
    -   `categories-context.tsx`: Proporciona las categorías de inventario y costes a los componentes que las necesitan.
-   `src/hooks/`: Hooks personalizados de React para encapsular lógica compleja de la UI.
    -   `use-order-form-wizard.ts`: Gestiona el estado y la lógica del asistente de registro de interacciones.
-   `src/lib/`:
    -   `firebase.ts`: Inicialización del cliente de Firebase.
    -   `firebaseAdmin.ts`: Inicialización del SDK de Admin de Firebase para operaciones de backend seguras.
    -   `schemas/`: Esquemas de validación de **Zod** para los formularios.
    -   `data.ts`: Listas y enums estáticos (ej: estados de pedido, tipos de cuenta).
    -   `utils.ts`: Funciones de utilidad generales, como `cn` de ShadCN.
-   `src/services/`: **Capa de Lógica de Negocio**. Son funciones de servidor (`'use server'`) que interactúan con Firestore. Abstraen las operaciones de la base de datos de los componentes de la UI.
-   `src/ai/`:
    -   `flows/`: Contiene los flujos de Genkit que definen las cadenas de IA.
    -   `genkit.ts`: Configuración e inicialización de Genkit.

---

## 3. Modelo de Datos (Firestore)

Firestore se organiza en colecciones de alto nivel que representan las entidades principales del negocio.

-   **`accounts`**: Fichas maestras de clientes y prospectos.
-   **`orders`**: Todas las interacciones con clientes. Esto incluye **pedidos confirmados**, **visitas programadas**, **tareas de seguimiento** y **visitas fallidas**. El campo `status` diferencia el tipo de interacción.
-   **`teamMembers`**: Perfiles de los usuarios del sistema, incluyendo su rol (`Admin`, `SalesRep`, etc.) y sus objetivos de ventas.
-   **`events`**: Eventos de marketing y activaciones de marca.
-   **`purchases`**: Registros de gastos y compras a proveedores.
-   **`suppliers`**: Directorio de proveedores de la empresa.
-   **`inventoryItems`**: Catálogo maestro de todos los artículos inventariables, tanto materias primas como producto terminado o material promocional. Mantiene un `stock` total agregado.
-   **`itemBatches`**: **La entidad clave para la trazabilidad**. Cada documento representa un lote específico de un `inventoryItem`, con su propia cantidad, coste unitario, fecha de recepción y fecha de caducidad.
-   **`stockTxns`**: Un registro de auditoría inmutable de todas las transacciones que afectan al inventario (entradas, salidas, ajustes).
-   **`productionRuns`**: Órdenes de producción para fabricar producto terminado. Registra los componentes consumidos.
-   **`bomLines`**: Las "recetas" o Bill of Materials. Cada documento es una línea que define qué cantidad de un componente (`inventoryItem`) se necesita para fabricar un producto terminado.
-   **`categories`**: Categorías flexibles para organizar `inventoryItems` y `purchases`.
-   **`costCenters`**: Centros de coste para análisis financiero.
-   **`sampleRequests`**: Solicitudes de muestras de producto realizadas por el equipo.
-   **`directSales`**: Ventas facturadas directamente por Santa Brisa, a diferencia de las que gestiona el importador.

---

## 4. Flujos de Lógica de Negocio Clave (Servicios)

Los servicios en `src/services/` contienen la lógica más importante de la aplicación.

-   **`cartera-service.ts`**: Orquesta la lógica para el panel de "Cuentas y Seguimiento". Combina datos de `accounts` y `orders` para calcular dinámicamente el **estado comercial** de una cuenta (`Activo`, `Repetición`, `Seguimiento`, etc.) y su **Lead Score** (puntuación de prioridad), basándose en la recencia y el valor de las interacciones.
-   **`production-run-service.ts`**: Gestiona el ciclo de vida de las órdenes de producción. Su función más crítica, `closeProductionRun`, implementa la lógica de consumo de lotes (por defecto FIFO - First-In, First-Out) para las materias primas, calcula el coste real del producto terminado y actualiza el stock de todos los artículos involucrados de forma transaccional.
-   **`purchase-service.ts`**: Maneja la recepción de stock. Al registrar una compra como "Factura Recibida", este servicio crea un nuevo `ItemBatch` para cada artículo, registrando su coste y cantidad específicos, y actualiza el stock general del `inventoryItem` correspondiente.
-   **`auth-context.tsx`**: Aunque es un contexto de frontend, maneja lógica de negocio crucial. Escucha los cambios de estado de Firebase Auth y, al iniciar sesión un usuario, busca su perfil en `teamMembers` para obtener su rol y permisos, que luego se distribuyen por toda la aplicación.

---

## 5. Configuración de Variables de Entorno y APIs

### 5.1. APIs de IA (Document AI, Google AI)

Para que las funcionalidades de IA (Procesador de Facturas, Asistente) funcionen, es **imprescindible** configurar las variables de entorno en un fichero llamado `.env.local` en la raíz del proyecto.

1.  **Crea un fichero llamado `.env.local`** en la raíz del proyecto (al mismo nivel que `package.json`).
2.  **Copia y pega el siguiente contenido** en el fichero:

    ```
    # Información del Proyecto de Google Cloud
    GCLOUD_PROJECT=santa-brisa-crm
    GCLOUD_LOCATION=eu

    # Google Cloud Document AI (Procesador de Facturas)
    DOCUMENTAI_PROCESSOR_ID=YOUR_PROCESSOR_ID_HERE
    ```

3.  **Rellena el valor** de `DOCUMENTAI_PROCESSOR_ID` con tu ID de procesador.

4.  **(Solo para Desarrollo Local) Autenticación de Servicios de Google Cloud:**
    Para que servicios como Document AI y Google AI (Gemini) funcionen en tu máquina local, necesitas autenticarte con las **Credenciales Predeterminadas de la Aplicación (ADC)**. Ejecuta el siguiente comando en tu terminal **una sola vez**:
    ```bash
    gcloud auth application-default login
    ```
    Sigue las instrucciones que aparecerán en el navegador para completar el proceso. Esto permitirá a tu entorno local usar tu identidad para acceder a las APIs de Google Cloud de forma segura.

### 5.2. API de Holded (Integración de Terceros)

Para conectar con la API de Holded, la clave de API debe guardarse de forma segura usando **Firebase Secret Manager**. Sigue estos tres pasos en tu terminal:

1.  **Crear el secreto en Google Cloud:**
    Reemplaza `tu_api_key_real_de_holded` por tu clave real y ejecuta:
    ```bash
    echo "tu_api_key_real_de_holded" | gcloud secrets create HOLDED_API_KEY --data-file=-
    ```

2.  **Conceder permisos a la Cuenta de Servicio:**
    La Cloud Function necesita permiso para leer el secreto. El siguiente comando usa la cuenta de servicio de tu proyecto (`santa-brisa-crm@appspot.gserviceaccount.com`):
    ```bash
    gcloud secrets add-iam-policy-binding HOLDED_API_KEY \
      --member="serviceAccount:santa-brisa-crm@appspot.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor"
    ```

3.  **Hacer que el secreto esté disponible para Firebase Functions:**
    Finalmente, ejecuta este comando para que tu función sepa que debe usar este secreto:
    ```bash
    firebase functions:secrets:set HOLDED_API_KEY
    ```
    Confirma cuando te lo pida la CLI. Tras estos pasos, tu función podrá acceder a la clave de forma segura a través de `process.env.HOLDED_API_KEY` al ser desplegada.

---

## 6. Guía de Desarrollo

### Requisitos Previos
-   Node.js (v20 o superior)
-   npm o pnpm
-   Firebase CLI (`npm install -g firebase-tools`)

### Configuración del Entorno
1.  **Clonar el Repositorio:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Instalar Dependencias:**
    ```bash
    npm install
    ```
3.  **Configurar Firebase:**
    -   Asegúrate de tener un proyecto de Firebase creado.
    -   En la raíz del proyecto, asegúrate de que el archivo `src/lib/firebase.ts` contiene la configuración del SDK web de tu proyecto de Firebase.
4.  **Configurar las APIs:** Sigue los pasos de la sección 5 para crear y configurar tu fichero `.env.local` y los secretos de Holded.

### Ejecutar la Aplicación
La aplicación requiere dos procesos para funcionar completamente: el servidor de desarrollo de Next.js y el inspector de flujos de Genkit.

1.  **Iniciar el Servidor de Desarrollo de Next.js:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:3000`.

2.  **Iniciar el Inspector de Genkit (Opcional, pero recomendado):**
    En una terminal separada, ejecuta:
    ```bash
    npm run genkit:dev
    ```
    Esto iniciará el inspector de Genkit en `http://localhost:4000`, donde podrás ver, probar y depurar tus flujos de IA en tiempo real.

---

## 7. Despliegue

El despliegue está automatizado a través de **GitHub Actions**.

-   **Workflow:** El archivo `.github/workflows/firebase-deploy.yml` define el proceso de CI/CD.
-   **Disparador:** El despliegue se activa automáticamente en cada `push` a la rama `main`.
-   **Proceso:**
    1.  Hace checkout del código.
    2.  Configura Node.js.
    3.  Instala las dependencias con `npm ci`.
    4.  Construye la aplicación Next.js con `npm run build`.
    5.  Despliega a **Firebase Hosting** usando la acción `FirebaseExtended/action-hosting-deploy@v0`.
-   **Secretos de GitHub:** El workflow requiere que el secreto `FIREBASE_TOKEN` esté configurado en los secretos del repositorio de GitHub para autorizar el despliegue.
-   **Backend Serverless:** La configuración de `firebase.json` utiliza la propiedad `frameworksBackend`, que le indica a Firebase que despliegue el backend de Next.js (Server Components, API Routes, etc.) a Cloud Functions de forma automática.
-   **Cuenta de Servicio:** Para que servicios como Document AI y los secretos funcionen en producción, la Cloud Function debe ejecutarse con una cuenta de servicio que tenga los permisos adecuados (ej. "Usuario de la API de Document AI", "Acceso a Secretos de Secret Manager"). Esto se configura en `firebase.json` con la propiedad `serviceAccount`.

---

## 8. Solución de Problemas

Consulta el fichero `TROUBLESHOOTING.md` para ver una guía detallada de los errores más comunes y sus soluciones.# santa-brisa-crm

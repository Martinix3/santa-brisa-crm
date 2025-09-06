
# Guía de Solución de Problemas del CRM

Este documento registra los problemas técnicos encontrados durante el desarrollo y sus soluciones, para futuras referencias.

## 1. Error de Credenciales con Document AI o Google AI (`invalid_grant`, `invalid_rapt`, 401/403)

Durante el desarrollo local, al intentar usar cualquier servicio de IA (procesar facturas, asistente), puedes encontrar un error de permisos o credenciales.

### Síntoma del Problema

El error puede manifestarse de varias formas en la consola del servidor:
- `Error: Error del servidor de Document AI: 400 undefined: Getting metadata from plugin failed with error: {"error":"invalid_grant","error_description":"reauth related error (invalid_rapt)"...}`
- `GenkitError: FAILED_PRECONDITION: Please pass in the API key...` (incluso si no usas una).
- Errores de tipo `401 Unauthorized` o `403 Permission Denied`.
- Mensajes que indican que una API no está habilitada en el proyecto.

### Causa Raíz

Estos errores indican que las credenciales de autenticación que tu máquina local utiliza para comunicarse con las APIs de Google Cloud han caducado o no tienen los permisos correctos. En local, esto se gestiona con las **Credenciales Predeterminadas de la Aplicación (ADC)**. El sistema está configurado para usar estas credenciales en lugar de una API Key.

### Solución Definitiva (Desarrollo Local)

Para solucionar este problema, solo necesitas renovar tus credenciales locales.

1.  **Abre una terminal** en tu entorno de desarrollo.
2.  **Ejecuta el siguiente comando:**
    ```bash
    gcloud auth application-default login
    ```
3.  Se abrirá una ventana del navegador pidiéndote que inicies sesión con tu cuenta de Google. **Inicia sesión y concede los permisos solicitados.**
4.  Una vez completado, **reinicia tu servidor de desarrollo** (detén el proceso de `npm run dev` y vuelve a iniciarlo) para que la aplicación tome las nuevas credenciales.

Esto generará un nuevo token de acceso válido y solucionará el problema. Es posible que tengas que repetir este proceso cada cierto tiempo (horas o días) mientras desarrollas localmente.

### Verificación de Configuración

Asegúrate también de que las variables de entorno en tu fichero `.env.local` son correctas:
- `GCLOUD_PROJECT`
- `GCLOUD_LOCATION`
- `DOCUMENTAI_PROCESSOR_ID`

(Nota: Ya no es necesaria la variable `GOOGLE_API_KEY`).

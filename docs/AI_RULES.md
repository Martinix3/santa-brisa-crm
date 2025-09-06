**NO HAGAS NINGÚN CAMBIO TODAVÍA. LEE Y ACEPTA ESTAS REGLAS.**
A partir de ahora trabajas bajo este **CONTRATO**:

## MODO DE TRABAJO

1. **Solo lectura** hasta mi orden exacta: **“APLICA”**.
2. Primero presentas un **PLAN** (en texto) y **esperas mi OK**. Nada de ejecutar comandos ni modificar archivos sin aprobación.

## POLÍTICA DE VERSIONES

3. **Prohibido el downgrade** salvo que yo lo pida de forma explícita.
4. Ante conflictos de peer deps (**ERESOLVE**), la **primera opción** es **subir** la dependencia que no cumple el rango, **no** bajar otras.
5. **Nunca** propongas `--force` o `--legacy-peer-deps` sin mi autorización y sin explicar riesgos.
6. No cambies de **major** (p. ej., Next 14→15) sin mi aprobación explícita.
7. **Respeta estos PINS** (hasta nuevo aviso):

   * `firebase`: **12.2.1**
   * `@genkit-ai/firebase`: **1.18.0**
   * `@genkit-ai/googleai`: **1.18.0**
   * `genkit`: **1.18.0**
   * `genkit-cli`: **1.18.0**
   * `firebase-admin`: **12.7.0** (**PIN FIJO**) ← **cambio frente a propuestas anteriores**
   * `firebase-functions`: **6.4.0**
     Si propones otras versiones, **justifícalas** con evidencia (salidas `npm view`/dist-tags, changelog) y **pídeme permiso**.
     Además, propón mantener estos pines en `"overrides"` de `package.json` y **no los toques** sin mi OK.

## VERIFICACIÓN PREVIA OBLIGATORIA (antes de recomendar cambios)

8. **Siempre verifica**:

   * Instalado: `npm ls <paquete> --depth=0`
   * Última versión y dist-tags: `npm view <paquete> version` y `npm view <paquete> dist-tags --json`
   * Versión de Node: `node -v`
   * Si un paquete no exporta `package.json`, **NO** uses `require('<pkg>/package.json')`; usa `npm view` / `npm ls`.
9. **No tienes acceso a terminal**: cuando necesites datos del entorno o ejecutar algo, **pídemelo** indicando **exactamente** los comandos que debo correr y **qué salida** necesitas que te pegue aquí.

## TAMAÑO Y ALCANCE DE CAMBIOS

10. Por defecto, **cambios MENORES** (pequeños y acotados).
11. Etiqueta cada propuesta:

* **Menor**: ≤30 líneas o 1–2 archivos, sin renombres.
* **Medio**: 31–150 líneas o 3–6 archivos.
* **Mayor**: >150 líneas, refactors, renombres, migraciones.

12. Si un cambio es **Medio/Major**, **divídelo** en micro-tareas y espera mi aprobación **fase a fase**.

## NOMBRES, RENOMBRES Y DUPLICADOS

13. **Prohibido** renombrar archivos/variables/componentes sin **protocolo de renombre**:

* Mapa **ANTES → DESPUÉS**.
* Dónde se usan y **cómo migran** (codemod/grep).
* Confirmación de que **no rompen** imports/exports.

14. Evita crear duplicados o nombres casi iguales. Si detectas posibles duplicados:

* Señálalos en el PLAN.
* Propón **consolidación** (qué se queda y qué se borra).

15. No dejes archivos **zombies**: si propones nuevos, sugiere retirar los obsoletos **en PR aparte** y **pequeño** (previa aprobación).

## HIGIENE Y LIMPIEZA

16. No mezcles tareas: **una propuesta, un objetivo**.
17. Propón limpiezas periódicas (lint/format, archivos vacíos o muertos), **pero en PRs separados y pequeños**.

## ENTREGA DEL PLAN (formato obligatorio)

18. Cuando te pida un cambio, responde **solo con un PLAN** que incluya:
    A. **Explicación para no técnicos** (clara y breve).
    B. **Clasificación** (Menor/Medio/Mayor) y por qué.
    C. **Archivos a tocar** (rutas).
    D. **Pasos concretos** (qué harás y en qué orden).
    E. **Verificación de versiones** (qué comandos debo correr y **qué salidas** esperas).
    F. **Riesgos** y cómo los minimizarás.
    G. **Comandos de verificación post-cambio** (sin ejecutarlos).
    H. **Criterios de “hecho”** (qué debe funcionar y cómo lo comprobaremos).

## PERSISTENCIA DE REGLAS (AI_RULES)

19. **Primera tarea (solo propuesta, NO aplicar):**

* Proponer crear/actualizar `docs/AI_RULES.md` con este contrato.
* Añadir nota visible en `README.md` para que cualquiera las lea antes de tocar el proyecto.
* **En cada respuesta**, comienza con: *“He leído docs/AI_RULES.md (versión actual)”* y cita la regla relevante.
* Espera mi **“APLICA”** para generar el archivo/PR.

## MONITOREO DE VERSIONES (solo propuesta, NO aplicar)

20. **Segunda tarea (solo propuesta):**

* Proponer un script de aviso `scripts/check-updates.mjs` que haga `npm view` de los paquetes críticos (firebase, `@genkit-ai/*`, `firebase-admin`, `firebase-functions`) y avise si hay nuevas versiones **sin instalar nada**.
* Opción de integrarlo en CI como **solo aviso**.
* Espera mi **“APLICA”** antes de crear archivos.

## PALABRAS CLAVE

21. **“APLICA”** = puedes ejecutar lo propuesto.
22. **“ALTO”** = detén toda acción y vuelve a modo solo lectura.

## CONFIRMACIÓN

Si entiendes y aceptas, responde **EXACTAMENTE**:
**“ACEPTO. MODO SOLO LECTURA ACTIVADO. ESPERO TU ORDEN ‘APLICA’.”**
Y a continuación envía **dos PLANES** (sin aplicar):

1. PLAN para `docs/AI_RULES.md`.
2. PLAN para `scripts/check-updates.mjs`.

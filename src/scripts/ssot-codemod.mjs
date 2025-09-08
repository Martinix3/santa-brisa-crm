#!/usr/bin/env node
import { Project, SyntaxKind } from "ts-morph";
import path from "node:path";
import fs from "node:fs";

// ----- Config -----
const DRY = process.argv.includes("--dry");
const RENAME = process.argv.includes("--rename"); // renombra identificadores en archivos
const TS_CONFIG = "tsconfig.json";
const GLOB = ["src/**/*.{ts,tsx}"];

// Viejo -> Nuevo (TIPOS)
const TYPE_MAP = new Map([
  ["UserRole", "RolUsuario"],
  ["Channel", "Canal"],
  ["DistributionType", "TipoDistribucion"],
  ["TaskStatus", "EstadoTarea"],
  ["TaskArea", "AreaTarea"],
  ["TaskPriority", "PrioridadTarea"],
  ["InteractionKind", "TipoInteraccion"],
  ["InteractionResult", "ResultadoInteraccion"],
  ["OrderStatus", "EstadoPedido"],
  ["OrderOrigin", "OrigenPedido"],
  ["ProductCat", "CategoriaProducto"],
  ["PackType", "TipoPack"],
  ["StockPolicy", "PoliticaStock"],
  ["CrmEventType", "TipoEventoCrm"],
  ["CrmEventStatus", "EstadoEventoCrm"],
  ["Currency", "Moneda"],
  ["PaidStatus", "EstadoPago"],
  ["DocumentStatus", "EstadoDocumento"],
  ["ClientType", "TipoCliente"],
  ["MarketingResourceType", "TipoRecursoMarketing"],
  ["NextActionType", "SiguienteAccion"],
  ["FailureReasonType", "MotivoFallo"],
  ["SampleRequestStatus", "EstadoSolicitudMuestra"],
  ["SampleRequestPurpose", "PropositoMuestra"],
  ["DirectSaleStatus", "EstadoVentaDirecta"],
  ["DirectSaleChannel", "CanalVentaDirecta"],
  ["InteractionType", "TipoInteraccion"],
  ["CategoryKind", "TipoCategoria"],
  ["RunStatus", "EstadoEjecucion"],
  ["RunType", "TipoEjecucion"],
  ["TankStatus", "EstadoTanque"],
  ["UoM", "UdM"],
  ["QcStatus", "EstadoQC"],
  ["BomKind", "TipoBOM"],
  ["OrderType", "TipoPedido"],
]);

// Viejo -> Nuevo (CONSTANTES/LISTAS/LABELS)
const CONST_MAP = new Map([
  ["accountTypeList", "TIPOS_CUENTA"],
  ["clientTypeList", "TIPOS_CLIENTE"],
  ["orderStatusesList", "ESTADOS_PEDIDO"],
  ["runStatusList", "ESTADOS_EJECUCION"],
  ["runTypeList", "TIPOS_EJECUCION"],
  ["tankStatusList", "ESTADOS_TANQUE"],
  ["uomList", "UDM"],
  ["crmEventTypeList", "TIPOS_EVENTO_CRM"],
  ["crmEventStatusList", "ESTADOS_EVENTO_CRM"],
  ["paymentMethodList", "METODOS_PAGO"],
  ["sampleRequestStatusList", "ESTADOS_SOLICITUD_MUESTRA"],
  ["sampleRequestPurposeList", "PROPOSITOS_MUESTRA"],
  ["directSaleStatusList", "ESTADOS_VENTA_DIRECTA"],
  ["directSaleChannelList", "CANALES_VENTA_DIRECTA"],
  ["nextActionTypeList", "SIGUIENTES_ACCIONES"],
  ["failureReasonList", "MOTIVOS_FALLO"],
  ["provincesSpainList", "PROVINCIAS_ES"],
  ["LABELS", "ETIQUETAS"],
  ["UI_COLORS", "COLORES_UI"],
]);

const FORBIDDEN_SOURCES = ["@/lib/data", "@/lib/constants"]; // prohibidos tras SSOT
const TYPES_SOURCE = "@/types"; // aquí solían venir los tipos mezclados

// ----- Helpers -----
function addOrMergeNamedImport(sourceFile, moduleName, specifiers) {
  if (specifiers.length === 0) return;
  const existing = sourceFile.getImportDeclarations().find((d) => d.getModuleSpecifierValue() === moduleName);
  if (!existing) {
    sourceFile.addImportDeclaration({ moduleSpecifier: moduleName, namedImports: [...new Set(specifiers)] });
    return;
  }
  const names = new Set(existing.getNamedImports().map((n) => n.getName()));
  for (const s of specifiers) if (!names.has(s)) existing.addNamedImport(s);
}

function renameIdentifiersInFile(sourceFile, from, to) {
  // Renombra identificadores de uso (no toca propiedades de objetos)
  const ids = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).filter((id) => id.getText() === from);
  for (const id of ids) {
    const parent = id.getParent();
    // Evitar renombrar claves de import/export y propiedades:
    if (parent.getKind() === SyntaxKind.ImportSpecifier || parent.getKind() === SyntaxKind.ExportSpecifier) continue;
    if (parent.getKind() === SyntaxKind.PropertyAssignment && parent.getFirstChild() === id) continue;
    if (parent.getKind() === SyntaxKind.PropertySignature && parent.getFirstChild() === id) continue;
    if (parent.getKind() === SyntaxKind.PropertyAccessExpression && parent.getLastChild() === id) continue;
    id.replaceWithText(to);
  }
}

function main() {
  if (!fs.existsSync(TS_CONFIG)) {
    console.error(`No encuentro ${TS_CONFIG}. Ejecuta el script desde la raíz del repo.`);
    process.exit(1);
  }

  const project = new Project({ tsConfigFilePath: TS_CONFIG, skipAddingFilesFromTsConfig: false });
  project.addSourceFilesAtPaths(GLOB);

  const summary = { filesChanged: 0, removedForbiddenImports: 0, rewiredTypes: 0, rewiredConsts: 0, renamedIds: 0 };

  for (const sf of project.getSourceFiles()) {
    let changed = false;

    // 1) Bloquear data/constants legacy -> mover a @ssot (con alias para compatibilidad)
    for (const imp of sf.getImportDeclarations()) {
      const mod = imp.getModuleSpecifierValue();

      // a) '@/lib/data' o '@/lib/constants'
      if (FORBIDDEN_SOURCES.includes(mod)) {
        const specifiers = imp.getNamedImports();
        const toKeep = [];
        const toSSOT = [];

        for (const s of specifiers) {
          const oldName = s.getName();
          const newName = CONST_MAP.get(oldName);
          if (newName) {
            // Importar desde @ssot con alias al nombre viejo (compat)
            addOrMergeNamedImport(sf, "@ssot", [`${newName} as ${oldName}`]);
            s.remove();
            changed = true;
            summary.rewiredConsts++;
          } else {
            toKeep.push(oldName);
          }
        }
        if (imp.getNamedImports().length === 0) {
          imp.remove();
          summary.removedForbiddenImports++;
          changed = true;
        }
      }

      // b) '@/types' con tipos que ahora vienen de @ssot
      if (mod === TYPES_SOURCE) {
        const specifiers = imp.getNamedImports();
        for (const s of specifiers) {
          const oldName = s.getName();
          const newName = TYPE_MAP.get(oldName);
          if (newName) {
            // Añadir import desde @ssot con alias para mantener el nombre local (seguro)
            addOrMergeNamedImport(sf, "@ssot", [`${newName} as ${oldName}`]);

            if (RENAME) {
              // Cambiar los usos en el archivo al nombre español
              renameIdentifiersInFile(sf, oldName, newName);
              // Y ahora importar sin alias:
              addOrMergeNamedImport(sf, "@ssot", [newName]);
              summary.renamedIds++;
            }

            // Eliminar el named import de '@/types'
            s.remove();
            changed = true;
            summary.rewiredTypes++;
          }
        }
        if (imp.getNamedImports().length === 0) {
          // Si ya no trae nada útil de '@/types', elimínalo
          imp.remove();
          changed = true;
        }
      }
    }

    if (changed) {
      summary.filesChanged++;
      if (!DRY) sf.saveSync();
    }
  }

  if (!DRY) project.saveSync();

  console.log("== SSOT codemod ==");
  console.log(summary);
  console.log(`Modo: ${DRY ? "DRY-RUN (no escribe)" : "WRITE"}  |  Rename: ${RENAME ? "ON" : "OFF"}`);
  console.log("Listo.");
}

main();

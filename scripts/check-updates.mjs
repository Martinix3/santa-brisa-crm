#!/usr/bin/env node

import { execSync } from 'child_process';
import chalk from 'chalk';

const packagesToPin = {
  "firebase": "12.2.1",
  "@genkit-ai/firebase": "1.18.0",
  "@genkit-ai/googleai": "1.18.0",
  "genkit": "1.18.0",
  "genkit-cli": "1.18.0",
  "firebase-admin": "12.7.0",
  "firebase-functions": "6.4.0"
};

console.log(chalk.yellow.bold('🔎 Verificando versiones de paquetes críticos...'));

const tableData = [];

for (const [pkg, pinnedVersion] of Object.entries(packagesToPin)) {
  try {
    const latestVersion = execSync(`npm view ${pkg} version`).toString().trim();
    const status = latestVersion === pinnedVersion ? '✅ OK' : '⚠️  Outdated';
    const color = latestVersion === pinnedVersion ? chalk.green : chalk.yellow;
    
    tableData.push({
      Package: chalk.cyan(pkg),
      'Pinned Version': chalk.bold(pinnedVersion),
      'Latest Version': color(latestVersion),
      'Status': color(status),
    });
  } catch (error) {
    tableData.push({
      Package: chalk.cyan(pkg),
      'Pinned Version': chalk.bold(pinnedVersion),
      'Latest Version': chalk.red('Error'),
      'Status': chalk.red('❌ Failed'),
    });
    console.error(chalk.red(`Error fetching version for ${pkg}: ${error.message}`));
  }
}

console.log("");
console.table(tableData);
console.log("");

if (tableData.some(row => row.Status.includes('Outdated') || row.Status.includes('Failed'))) {
  console.log(chalk.yellow('Algunos paquetes están desactualizados o fallaron. Considera actualizarlos en `docs/AI_RULES.md` y `package.json`.'));
} else {
  console.log(chalk.green('👍 Todas las versiones de los paquetes críticos están alineadas con las versiones fijadas (pins).'));
}

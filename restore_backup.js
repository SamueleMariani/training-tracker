// restore_backup.js
// Script Node.js per il ripristino del database Firestore da file di backup JSON
// Utilizzo: node restore_backup.js <percorso-file-backup.json>

import fs from "fs";
import path from "path";

const PROJECT_ID = "trainingtracker-8d107";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("❌ Errore: specificare il percorso del file di backup JSON.");
  console.error("Esempio: node restore_backup.js training_tracker_backup_2026-11-11_0800.json");
  process.exit(1);
}

const filePath = path.resolve(args[0]);
if (!fs.existsSync(filePath)) {
  console.error(`❌ Errore: il file non esiste: ${filePath}`);
  process.exit(1);
}

console.log(`📖 Lettura del file di backup: ${filePath}...`);
let backup;
try {
  const content = fs.readFileSync(filePath, "utf-8");
  backup = JSON.parse(content);
} catch (e) {
  console.error("❌ Errore: il file non è un JSON valido:", e.message);
  process.exit(1);
}

if (!backup || !backup.data) {
  console.error("❌ Errore: struttura del backup non valida (manca la chiave 'data').");
  process.exit(1);
}

const { workouts, users, pagelle, carrello, config } = backup.data;
const counts = backup.meta?.counts || {};

console.log("\n========================================================");
console.log("🛡️ TRAINING TRACKER - DATABASE RESTORE");
console.log("========================================================");
console.log(`Esportato il: ${backup.meta?.exportedAt || "Data sconosciuta"}`);
console.log(`Autore:       ${backup.meta?.exportedBy || "Admin"}`);
console.log(`Riepilogo:`);
console.log(`  - Allenamenti:   ${workouts?.length ?? 0}`);
console.log(`  - Utenti:        ${users?.length ?? 0}`);
console.log(`  - Pagelle Coach: ${pagelle?.length ?? 0}`);
console.log(`  - Carrello:      ${carrello?.length ?? 0}`);
console.log(`  - Config Coach:  ${config?.coach ? "Presente" : "Assente"}`);
console.log("========================================================\n");

console.log("ℹ️  Per ripristinare direttamente dal browser:");
console.log("1. Accedi come Samuele Mariani (Admin) su https://samuelemariani.github.io/training-tracker/");
console.log("2. Vai nel Tab 'Squadra & Roster'");
console.log("3. Clicca su '📥 Ripristina Backup' e seleziona questo file JSON.");
console.log("Oppure apri la console DevTools (F12) e incolla:");
console.log("   window.restoreDatabaseBackup(" + JSON.stringify({ meta: backup.meta, data: backup.data }).substring(0, 100) + "...);\n");

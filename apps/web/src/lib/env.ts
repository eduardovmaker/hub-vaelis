import fs from "fs";
import path from "path";

let loaded = false;

/**
 * Lê o .env da raiz do app quando o processo não recebeu as variáveis pelo
 * ambiente (scripts locais, seed via ts-node). Em produção na Vercel as
 * variáveis já vêm do ambiente e esta função não faz nada.
 */
export function loadEnvFile(): void {
  if (loaded) return;
  loaded = true;

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (!match) continue;

      const key = match[1].trim();
      let value = match[2].trim();
      const isQuoted =
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"));
      if (isQuoted) value = value.slice(1, -1);

      // Variáveis já definidas no ambiente têm prioridade.
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Ausência ou erro de leitura do .env não deve derrubar o processo.
  }
}

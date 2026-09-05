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

/**
 * Lê uma variável de ambiente já higienizada.
 *
 * Painéis como o da Vercel importam o valor exatamente como foi colado, então
 * `CHAVE=""` chega aqui como a string de dois caracteres `""` — que é truthy e
 * passa despercebida por qualquer checagem simples. Removemos aspas externas e
 * espaços para que um campo "vazio" se comporte como vazio de verdade.
 */
export function readEnv(name: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw === null) return "";

  let value = String(raw).trim();
  const aspasExternas =
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")));

  if (aspasExternas) value = value.slice(1, -1).trim();

  return value;
}

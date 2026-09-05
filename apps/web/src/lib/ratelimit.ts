import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { loadEnvFile, readEnv } from "./env";

loadEnvFile();

/**
 * Rate limit opcional via Upstash.
 *
 * Nada aqui pode lançar durante o import: estes módulos são carregados quando
 * o Next monta as rotas, e uma variável mal preenchida derrubaria o build
 * inteiro em vez de apenas desligar o limite.
 */
function createRedis(): Redis | null {
  const url = readEnv("UPSTASH_REDIS_REST_URL");
  const token = readEnv("UPSTASH_REDIS_REST_TOKEN");

  if (!url || !token) return null;

  // O cliente do Upstash recusa qualquer URL que não seja https.
  if (!url.startsWith("https://")) {
    console.warn(
      `[RateLimit] UPSTASH_REDIS_REST_URL inválida (${url}). Rate limit desativado.`
    );
    return null;
  }

  try {
    return new Redis({ url, token });
  } catch (error) {
    console.warn("[RateLimit] Falha ao criar o cliente Upstash. Rate limit desativado.", error);
    return null;
  }
}

function createLimiter(requisicoes: number, prefix: string): Ratelimit | null {
  const redis = createRedis();
  if (!redis) return null;

  try {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requisicoes, "1 m"),
      analytics: true,
      prefix,
    });
  } catch (error) {
    console.warn(`[RateLimit] Falha ao configurar ${prefix}. Rate limit desativado.`, error);
    return null;
  }
}

/** Login e redefinição de senha: 5 tentativas por minuto por IP. */
export const authRatelimit = createLimiter(5, "@ratelimit/auth");

/**
 * Pareamento de tela: 10 tentativas por minuto por IP.
 * O código tem 6 caracteres, então o limite é o que impede força bruta.
 */
export const pairingRatelimit = createLimiter(10, "@ratelimit/pairing");

/**
 * Consulta o limite com degradação graciosa: se o Redis não estiver
 * configurado ou estiver fora, a requisição passa em vez de derrubar a tela.
 */
export async function checkRateLimit(limiter: Ratelimit | null, identifier: string) {
  if (!limiter) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[RateLimit] Upstash Redis não configurado, liberando: ${identifier}`);
    }
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  try {
    return await limiter.limit(identifier);
  } catch (error) {
    console.error("[RateLimit] Falha ao consultar o Upstash Redis:", error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

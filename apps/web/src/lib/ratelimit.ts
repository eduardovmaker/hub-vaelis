import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

/** Login do painel: 5 tentativas por minuto por IP. */
export const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "@ratelimit/auth",
    })
  : null;

/**
 * Pareamento de tela: 10 tentativas por minuto por IP.
 * O código tem 6 caracteres, então o limite é o que impede força bruta.
 */
export const pairingRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "@ratelimit/pairing",
    })
  : null;

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

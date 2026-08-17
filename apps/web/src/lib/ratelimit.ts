import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Inicialização do Redis com checagem de variáveis de ambiente
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  url && token
    ? new Redis({
        url,
        token,
      })
    : null;

/**
 * Rate limit para rotas sensíveis de Autenticação / Login
 * 5 requisições por janela de 1 minuto por IP
 */
export const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "@ratelimit/auth",
    })
  : null;

/**
 * Rate limit para rotas de Checkout / Vendas
 * 10 requisições por janela de 1 minuto por IP
 */
export const checkoutRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "@ratelimit/checkout",
    })
  : null;

/**
 * Função helper para checar o Rate Limit em rotas da API.
 * Retorna { success: true/false, limit, remaining, reset } com fallback gracioso.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
) {
  if (!limiter) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[RateLimit Bypass] Upstash Redis não configurado para: ${identifier}`
      );
    }
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  try {
    const result = await limiter.limit(identifier);
    return result;
  } catch (error) {
    console.error("[RateLimit Error] Falha ao consultar Upstash Redis:", error);
    // Em caso de indisponibilidade do Redis, libera a requisição em fallback seguro
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

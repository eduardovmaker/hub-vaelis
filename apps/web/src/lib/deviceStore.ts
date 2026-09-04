"use client";

/**
 * Credencial da tela guardada no navegador da TV.
 *
 * O pareamento acontece uma vez; depois disso o player reabre sozinho e se
 * autentica com este segredo, sem ninguém digitar nada na TV de novo.
 */

const STORAGE_KEY = "vaelis_indoor_device";

export interface DeviceCredential {
  screenId: string;
  deviceSecret: string;
}

export function readDeviceCredential(): DeviceCredential | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceCredential;
    if (!parsed?.screenId || !parsed?.deviceSecret) return null;
    return parsed;
  } catch {
    // Modo privado ou storage bloqueado: a TV cai na tela de pareamento.
    return null;
  }
}

export function saveDeviceCredential(credential: DeviceCredential): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
  } catch {
    /* sem storage o player funciona só nesta sessão */
  }
}

export function clearDeviceCredential(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignora */
  }
}

/** Cache local da última configuração, para a tela sobreviver a queda de rede. */
const CACHE_PREFIX = "vaelis_indoor_bootstrap_";

export function readCachedBootstrap<T>(screenId: string): T | null {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${screenId}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCachedBootstrap(screenId: string, data: unknown): void {
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${screenId}`, JSON.stringify(data));
  } catch {
    /* cota cheia: segue sem cache */
  }
}

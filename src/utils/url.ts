/**
 * Utility for public application URLs.
 * Returns the exact base URL of the active running application.
 */

export function getPublicAppBaseUrl(customBase?: string): string {
  if (customBase && customBase.trim()) {
    return customBase.trim().replace(/\/+$/, '');
  }
  if (typeof window === 'undefined') return '';
  
  // Use the active running origin + pathname so links work immediately without 404
  const origin = window.location.origin;
  const pathname = window.location.pathname.replace(/\/+$/, '');

  return `${origin}${pathname}`;
}

export function getAiStudioSharedUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname.replace(/\/+$/, '');
  if (origin.includes('ais-dev-')) {
    return `${origin.replace('ais-dev-', 'ais-pre-')}${pathname}`;
  }
  return `${origin}${pathname}`;
}

export function isDevUrl(url: string): boolean {
  return url.includes('ais-dev-') || url.includes('localhost') || url.includes('127.0.0.1');
}

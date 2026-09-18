function normalizeIdentifier(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function preferredIdentifierSet(preferredIdentifiers) {
  return new Set((preferredIdentifiers || []).map(normalizeIdentifier).filter(Boolean));
}

export function isPreferredBookmaker(bookmaker, preferredIdentifiers) {
  const preferred = preferredIdentifierSet(preferredIdentifiers);
  const key = normalizeIdentifier(bookmaker?.key);
  const title = normalizeIdentifier(bookmaker?.title);
  return preferred.has(key) || preferred.has(title);
}

export function selectBookmakers(bookmakers, preferredIdentifiers, preferredMinimum = 2) {
  const available = Array.isArray(bookmakers) ? bookmakers.filter(Boolean) : [];
  const preferred = available.filter((bookmaker) => isPreferredBookmaker(bookmaker, preferredIdentifiers));
  const minimum = Math.max(1, Number(preferredMinimum) || 2);
  const usePreferredOnly = preferred.length >= minimum;

  return {
    bookmakers: usePreferredOnly ? preferred : available,
    mode: usePreferredOnly ? 'preferred' : 'fallback',
    availableCount: available.length,
    selectedCount: usePreferredOnly ? preferred.length : available.length,
    preferredAvailableCount: preferred.length,
    preferredAvailable: preferred.map((bookmaker) => ({ key: bookmaker.key, title: bookmaker.title })),
    preferredMinimum: minimum
  };
}

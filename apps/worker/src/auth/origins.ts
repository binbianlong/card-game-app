function parseTrustedOrigins(value: string | undefined) {
  if (value === undefined || value.length === 0) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function getTrustedOrigin(origin: string, trustedOriginsValue: string | undefined) {
  const trustedOrigins = parseTrustedOrigins(trustedOriginsValue);

  return trustedOrigins.includes(origin) ? origin : null;
}

export { getTrustedOrigin, parseTrustedOrigins };

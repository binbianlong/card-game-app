import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import * as authSchema from "db";
import { drizzle } from "drizzle-orm/d1";

type AuthEnv = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TRUSTED_ORIGINS?: string;
};

function createAuth(env: AuthEnv) {
  return betterAuth({
    appName: "card-game-app",
    basePath: "/api/auth",
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(drizzle(env.DB), {
      provider: "sqlite",
      schema: authSchema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: createSocialProviders(env),
    trustedOrigins: parseTrustedOrigins(env.TRUSTED_ORIGINS),
  });
}

function createSocialProviders(env: AuthEnv) {
  if (
    env.GOOGLE_CLIENT_ID === undefined ||
    env.GOOGLE_CLIENT_ID.length === 0 ||
    env.GOOGLE_CLIENT_SECRET === undefined ||
    env.GOOGLE_CLIENT_SECRET.length === 0
  ) {
    return {};
  }

  return {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  };
}

function parseTrustedOrigins(value: string | undefined) {
  if (value === undefined || value.length === 0) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export { createAuth };
export type { AuthEnv };

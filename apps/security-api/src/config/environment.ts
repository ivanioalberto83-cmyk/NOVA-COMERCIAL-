export interface SecurityApiEnvironment {
  databaseUrl: string;
  jwtSecret: string;
  port: number;
}

export function validateEnvironment(env: NodeJS.ProcessEnv): SecurityApiEnvironment {
  return {
    databaseUrl: env.DATABASE_URL ?? '',
    jwtSecret: env.JWT_SECRET ?? '',
    port: Number(env.PORT ?? 3001),
  };
}

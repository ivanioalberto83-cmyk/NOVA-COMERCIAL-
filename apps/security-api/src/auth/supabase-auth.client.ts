export interface SupabaseAuthUser {
  id: string;
  email?: string;
}

export interface SupabaseAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: SupabaseAuthUser;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface SupabaseSessionResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  user?: { id?: unknown; email?: unknown };
}

export class SupabaseAuthClient {
  private readonly baseUrl: string;

  constructor(
    supabaseUrl: string,
    private readonly apiKey: string,
    private readonly fetcher: FetchLike = globalThis.fetch,
  ) {
    let parsed: URL;
    try {
      parsed = new URL(supabaseUrl);
    } catch {
      throw new Error('SUPABASE_URL must be a valid URL');
    }
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error('SUPABASE_URL must be a valid HTTP(S) URL');
    }
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('SUPABASE_ANON_KEY is required');
    }
    this.baseUrl = parsed.toString().replace(/\/$/, '');
  }

  async signInWithPassword(email: string, password: string): Promise<SupabaseAuthSession> {
    return this.requestSession('/auth/v1/token?grant_type=password', {
      email,
      password,
    });
  }

  async refreshSession(refreshToken: string): Promise<SupabaseAuthSession> {
    return this.requestSession('/auth/v1/token?grant_type=refresh_token', {
      refresh_token: refreshToken,
    });
  }

  async getUser(accessToken: string): Promise<SupabaseAuthUser> {
    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      throw new Error('A Supabase access token is required');
    }
    const response = await this.fetcher(this.baseUrl + '/auth/v1/user', {
      method: 'GET',
      headers: {
        apikey: this.apiKey,
        authorization: 'Bearer ' + accessToken,
      },
    });
    const payload = await this.readJson(response);
    if (!response.ok) throw new Error('Supabase Auth request failed');
    return this.parseUser(payload);
  }

  async signOut(accessToken: string): Promise<void> {
    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      throw new Error('A Supabase access token is required');
    }
    const response = await this.fetcher(this.baseUrl + '/auth/v1/logout', {
      method: 'POST',
      headers: {
        apikey: this.apiKey,
        authorization: 'Bearer ' + accessToken,
      },
    });
    if (!response.ok) {
      await this.readJson(response);
      throw new Error('Supabase Auth request failed');
    }
  }

  private async requestSession(
    path: string,
    body: Record<string, string>,
  ): Promise<SupabaseAuthSession> {
    const response = await this.fetcher(this.baseUrl + path, {
      method: 'POST',
      headers: {
        apikey: this.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await this.readJson(response);
    if (!response.ok) throw new Error('Supabase Auth request failed');
    if (!payload || typeof payload !== 'object') {
      throw new Error('Supabase Auth returned an invalid session');
    }
    const data = payload as SupabaseSessionResponse;
    const user = this.parseUser(data.user);
    if (typeof data.access_token !== 'string' || data.access_token.length === 0 ||
        typeof data.refresh_token !== 'string' || data.refresh_token.length === 0 ||
        typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) ||
        typeof data.token_type !== 'string' || data.token_type.length === 0) {
      throw new Error('Supabase Auth returned an invalid session');
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      user,
    };
  }

  private parseUser(value: unknown): SupabaseAuthUser {
    if (!value || typeof value !== 'object') {
      throw new Error('Supabase Auth returned an invalid user');
    }
    const user = value as { id?: unknown; email?: unknown };
    if (typeof user.id !== 'string' || user.id.length === 0) {
      throw new Error('Supabase Auth returned an invalid user');
    }
    return {
      id: user.id,
      ...(typeof user.email === 'string' ? { email: user.email } : {}),
    };
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
}

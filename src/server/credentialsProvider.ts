// Type declaration for Cloudflare KVNamespace (if not globally available)
// Remove or adjust if your environment already provides this type
interface KVNamespace {
  get: (
    key: string,
    type?: 'text' | 'json' | 'arrayBuffer' | 'stream',
  ) => Promise<any>
  put: (
    key: string,
    value: string | ArrayBuffer,
    options?: any,
  ) => Promise<void>
  delete: (key: string) => Promise<void>
}

// Cloudflare KV-based CredentialsProvider for Tidal sessions
// Usage: new KVCredentialsProvider(env.SESSIONS_KV, sessionId)
export class KVCredentialsProvider {
  constructor(
    private kv: KVNamespace,
    private sessionId: string,
  ) {}

  async getCredentials(): Promise<any> {
    return await this.kv.get(`tidal_session:${this.sessionId}`, 'json')
  }

  async setCredentials(credentials: any): Promise<void> {
    await this.kv.put(
      `tidal_session:${this.sessionId}`,
      JSON.stringify(credentials),
    )
  }

  async removeCredentials(): Promise<void> {
    await this.kv.delete(`tidal_session:${this.sessionId}`)
  }
}

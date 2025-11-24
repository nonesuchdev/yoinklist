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

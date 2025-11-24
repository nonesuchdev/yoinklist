// src/lib/sessionId.ts
export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('yoinklist_sessionId')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('yoinklist_sessionId', sessionId)
  }
  return sessionId
}

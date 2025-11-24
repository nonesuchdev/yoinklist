// src/lib/sessionId.ts
export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('yoinklist_sessionId')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('yoinklist_sessionId', sessionId)
    console.log('[sessionId] Created new sessionId:', sessionId)
  } else {
    console.log('[sessionId] Retrieved existing sessionId:', sessionId)
  }
  return sessionId
}

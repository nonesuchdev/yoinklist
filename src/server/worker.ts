import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { handleQueueMessage } from './queue-handler'

const serverEntry = createServerEntry({
  fetch(request) {
    return handler.fetch(request)
  },
})

export default {
  ...serverEntry,
  // @ts-ignore: Cloudflare types
  queue: async (batch, env) => {
    try {
      console.log('Queue handler called with batch:', batch)
      await handleQueueMessage(batch.messages, env)
    } catch (error) {
      console.error('Queue handler error:', error)
      throw error // Re-throw to fail the message
    }
  },
}

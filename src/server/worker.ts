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
    await handleQueueMessage(batch.messages, env)
  },
}

// @ts-ignore: Nitro build output has no types
import nitroApp from '../../.output/server/index.mjs'
import { handleQueueMessage } from './queue-handler'

export default {
  // @ts-ignore: Cloudflare types
  fetch: nitroApp.localFetch,
  // @ts-ignore: Cloudflare types
  queue: async (batch, env) => {
    await handleQueueMessage(batch.messages, env)
  },
}

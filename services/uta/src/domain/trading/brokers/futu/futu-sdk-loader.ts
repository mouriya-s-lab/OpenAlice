/**
 * Isolated loader for the futu-api SDK.
 *
 * futu-api's generated `proto.js` registers its entire protobuf schema into
 * protobufjs's process-global `roots["default"]` singleton. ccxt (eagerly
 * imported by the broker registry) uses the SAME protobufjs@6.11.6 instance
 * and leaves `roots["default"]` in a state whose `.addJSON` is gone, so
 * futu-api's load throws `"($protobuf.roots.default || ...).addJSON is not a
 * function"`. ibkr is unaffected only because it pulls a separate
 * protobufjs@7.5.5.
 *
 * Fix: hand futu-api a fresh Root to register into, then restore whatever was
 * there. Order-independent — neither SDK clobbers the other's "default" root.
 * proto.js executes once (CommonJS module cache), so the swap only matters on
 * the first load; later calls return the cached constructor.
 *
 * `createRequire` is used (not `import('protobufjs/light')`) to guarantee we
 * touch the very same CJS module instance futu-api's `require` resolves.
 */
import { createRequire } from 'node:module'
import type { FutuWebsocketCtor } from './futu-types.js'

const require = createRequire(import.meta.url)

interface ProtobufLight {
  roots: Record<string, unknown>
  Root: new () => unknown
}

let cached: FutuWebsocketCtor | null = null

export async function loadFutuApi(): Promise<FutuWebsocketCtor> {
  if (cached) return cached
  const pb = require('protobufjs/light') as ProtobufLight
  const saved = pb.roots['default']
  pb.roots['default'] = new pb.Root()
  try {
    const mod = await import('futu-api')
    cached = (mod.default ?? mod) as FutuWebsocketCtor
    return cached
  } finally {
    if (saved !== undefined) pb.roots['default'] = saved
    else delete pb.roots['default']
  }
}

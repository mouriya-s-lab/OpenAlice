// Ambient typing for the untyped `futu-api` package. Kept in a standalone
// .d.ts (no top-level import/export) so `declare module` acts as a module
// *definition*, not an augmentation — the latter is rejected by TS for a
// JS module that resolves to main.js with no bundled types.
declare module 'futu-api' {
  const ftWebsocket: import('./futu-types.js').FutuWebsocketCtor
  export default ftWebsocket
}

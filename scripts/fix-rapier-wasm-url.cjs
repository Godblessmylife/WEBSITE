// @dimforge/rapier3d-compat (0.12.0, as resolved in this project) ships
// with its WASM loader broken: the wasm-bindgen glue code should do
// `new URL("rapier_wasm3d_bg.wasm", import.meta.url)` so bundlers can
// resolve the binary correctly, but the published file instead has the
// literal string "<deleted>" in place of `import.meta.url`. That's not
// a valid URL base, so at runtime `new URL(...)` throws and Rapier's
// WASM (and therefore the whole physics engine / game) never
// initializes - this was the actual cause of the game's black screen,
// not a bug in our own code.
//
// Runs automatically after every `npm install` (see package.json's
// "postinstall" script) so the fix survives a clean install anywhere,
// not just on this machine. Idempotent: does nothing if already patched
// or if a future package update fixes it upstream.
const fs = require('fs')
const path = require('path')

const TARGET = path.join(
  __dirname,
  '..',
  'node_modules',
  '@dimforge',
  'rapier3d-compat',
  'rapier.es.js',
)
const BROKEN = 'new URL("rapier_wasm3d_bg.wasm","<deleted>")'
const FIXED = 'new URL("rapier_wasm3d_bg.wasm",import.meta.url)'

if (!fs.existsSync(TARGET)) {
  console.warn('[fix-rapier-wasm-url] rapier.es.js not found, skipping (package not installed?)')
  process.exit(0)
}

const source = fs.readFileSync(TARGET, 'utf8')

if (source.includes(FIXED)) {
  console.log('[fix-rapier-wasm-url] already patched, nothing to do')
} else if (source.includes(BROKEN)) {
  fs.writeFileSync(TARGET, source.replace(BROKEN, FIXED))
  console.log('[fix-rapier-wasm-url] patched rapier.es.js WASM URL resolution')
} else {
  console.warn('[fix-rapier-wasm-url] expected broken pattern not found - package may have changed, verify manually')
}

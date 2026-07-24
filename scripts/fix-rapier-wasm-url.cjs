// @dimforge/rapier3d-compat, as resolved in this environment, ships
// with its WASM loader broken: the wasm-bindgen glue code does
// `new URL("rapier_wasm3d_bg.wasm", "<deleted>")` instead of the
// correct `new URL("rapier_wasm3d_bg.wasm", import.meta.url)`.
// "<deleted>" is not a valid URL base, so this throws at runtime, and
// bundlers can't statically detect it as an asset reference either -
// the .wasm binary silently never makes it into the build. This was
// the actual cause of the game's black screen.
//
// npm resolved TWO copies of this package with DIFFERENT versions and
// DIFFERENT file layouts, both corrupted the same way:
//   - node_modules/@dimforge/rapier3d-compat (0.12.0, rapier.es.js)
//   - node_modules/@react-three/rapier/node_modules/@dimforge/rapier3d-compat
//     (0.19.2, nested because @react-three/rapier depends on a newer
//     range - rapier.mjs AND rapier_wasm3d.js both affected)
// An earlier version of this script only patched the first, hardcoded
// path (and its directory-name-based traversal skipped plain package
// directories like ".../rapier/node_modules/...", so it wouldn't have
// found the nested copy even if searching generically) - the bug came
// back because the nested copy was still broken. This version walks
// EVERY directory under node_modules unconditionally, so any current
// or future duplicate gets caught regardless of where npm nests it.
//
// Runs automatically after every `npm install` (package.json's
// "postinstall" script) so the fix survives a clean install anywhere.
// Idempotent and safe: does nothing where the pattern doesn't match.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'node_modules')
const BROKEN_PATTERN = /new URL\(\s*(['"])rapier_wasm3d_bg\.wasm\1\s*,\s*"<deleted>"\s*\)/g

function findRapierDirs(dir, found) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const full = path.join(dir, entry.name)
    if (entry.name === 'rapier3d-compat' && path.basename(dir) === '@dimforge') {
      found.push(full)
      continue // no need to descend into the package's own subfolders
    }
    findRapierDirs(full, found)
  }
}

const rapierDirs = []
findRapierDirs(ROOT, rapierDirs)

if (rapierDirs.length === 0) {
  console.warn('[fix-rapier-wasm-url] no @dimforge/rapier3d-compat installs found, skipping')
  process.exit(0)
}

let patchedCount = 0

for (const dir of rapierDirs) {
  // Только ESM-файлы. import.meta.url — синтаксическая ошибка в
  // CommonJS; пакет также ставит rapier.cjs/rapier.cjs.js (CJS-сборки,
  // определяются по имени) — их эта замена сломала бы ещё сильнее, чем
  // они уже сломаны, и наш Vite-билд их всё равно не грузит ("module"/
  // "exports.import" в package.json указывают на *.mjs/*.es.js).
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.m?js$/.test(f) && !/cjs/i.test(f))
  for (const file of files) {
    const filePath = path.join(dir, file)
    const source = fs.readFileSync(filePath, 'utf8')
    if (!BROKEN_PATTERN.test(source)) continue
    BROKEN_PATTERN.lastIndex = 0
    const fixed = source.replace(BROKEN_PATTERN, 'new URL("rapier_wasm3d_bg.wasm", import.meta.url)')
    fs.writeFileSync(filePath, fixed)
    console.log(`[fix-rapier-wasm-url] patched ${path.relative(ROOT, filePath)}`)
    patchedCount++
  }
}

console.log(
  patchedCount > 0
    ? `[fix-rapier-wasm-url] done, patched ${patchedCount} file(s) across ${rapierDirs.length} install(s)`
    : `[fix-rapier-wasm-url] checked ${rapierDirs.length} install(s), already patched`,
)

// Note: two copies of @dimforge/rapier3d-compat end up installed
// (0.12.0 top-level, 0.19.2 nested under @react-three/rapier) because
// ecctrl imports the package directly without declaring it as its own
// dependency (it relies on a hoisted copy being available), while
// @react-three/rapier pins an incompatible exact 0.19.2. Tried
// stripping @types/three's unrelated (and highly unusual for a types-
// only package) dependency on rapier3d-compat@~0.12.0 to free up the
// top-level slot for 0.19.2 to hoist into - `npm dedupe` didn't
// collapse it (relies on the lockfile, not a hand-edited manifest) and
// removing the top-level copy outright broke ecctrl's import. Left as
// a known ~1.4 MB duplicate in the game's lazy-loaded chunk rather than
// risk destabilizing the dependency tree further for a cosmetic win.

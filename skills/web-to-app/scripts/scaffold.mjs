#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

function help() {
  console.log(`Usage: node scaffold.mjs --url <https://...> [options]

Options:
  --name <name>            Product name (default: website hostname)
  --platforms <list>       macos,windows,linux (default: current platform)
  --width <pixels>         Window width, 480-3840 (default: 1280)
  --height <pixels>        Window height, 360-2160 (default: 820)
  --identifier <id>        Bundle identifier (default: app.web2app.<slug>)
  --out <directory>        Parent output directory (default: ./output)
  --fixed                  Disable window resizing
  --always-on-top          Keep the window above other windows
  --help                   Show this help`)
}

function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--fixed' || arg === '--always-on-top' || arg === '--help') result[arg.slice(2)] = true
    else if (arg.startsWith('--')) result[arg.slice(2)] = argv[++index]
  }
  return result
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'web-app'
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content, 'utf8')
}

const args = parseArgs(process.argv.slice(2))
if (args.help) { help(); process.exit(0) }
if (!args.url) { console.error('Missing required --url.'); help(); process.exit(1) }

let siteUrl
try {
  siteUrl = new URL(args.url)
  if (!['http:', 'https:'].includes(siteUrl.protocol)) throw new Error('unsupported scheme')
} catch {
  console.error('URL must be a valid http:// or https:// address.')
  process.exit(1)
}

const name = args.name || siteUrl.hostname.replace(/^www\./, '')
const slug = slugify(name)
const width = Number(args.width || 1280)
const height = Number(args.height || 820)
if (!Number.isInteger(width) || width < 480 || width > 3840 || !Number.isInteger(height) || height < 360 || height > 2160) {
  console.error('Window dimensions are outside the supported range.')
  process.exit(1)
}

const platforms = String(args.platforms || process.platform).split(',').map((item) => item.trim())
const validPlatforms = new Set(['macos', 'windows', 'linux', 'darwin', 'win32'])
if (platforms.some((item) => !validPlatforms.has(item))) {
  console.error('Platforms must be a comma-separated list of macos, windows, and linux.')
  process.exit(1)
}

const parent = path.resolve(args.out || 'output')
const project = path.join(parent, slug)
if (fs.existsSync(project)) {
  console.error(`Refusing to overwrite existing directory: ${project}`)
  process.exit(1)
}

const identifier = args.identifier || `app.web2app.${slug.replaceAll('-', '')}`
const config = {
  $schema: 'https://schema.tauri.app/config/2',
  productName: name,
  version: '0.1.0',
  identifier,
  build: {},
  app: {
    windows: [{
      label: 'main', title: name, url: siteUrl.href, width, height,
      minWidth: 480, minHeight: 360, center: true,
      resizable: !args.fixed, alwaysOnTop: Boolean(args['always-on-top']),
    }],
    security: { csp: null },
  },
  bundle: { active: true, targets: 'all' },
}

write(path.join(project, 'package.json'), `${JSON.stringify({ name: slug, private: true, version: '0.1.0', scripts: { tauri: 'tauri' }, devDependencies: { '@tauri-apps/cli': '^2.0.0' } }, null, 2)}\n`)
write(path.join(project, 'src-tauri', 'tauri.conf.json'), `${JSON.stringify(config, null, 2)}\n`)
write(path.join(project, 'src-tauri', 'build.rs'), 'fn main() { tauri_build::build() }\n')
write(path.join(project, 'src-tauri', 'Cargo.toml'), `[package]\nname = "${slug.replaceAll('-', '_')}"\nversion = "0.1.0"\ndescription = "${name.replaceAll('"', '\\"')}"\nedition = "2021"\n\n[build-dependencies]\ntauri-build = { version = "2", features = [] }\n\n[dependencies]\ntauri = { version = "2", features = [] }\n`)
write(path.join(project, 'src-tauri', 'src', 'main.rs'), '#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]\n\nfn main() {\n  tauri::Builder::default()\n    .run(tauri::generate_context!())\n    .expect("error while running the application");\n}\n')
write(path.join(project, 'web2app.config.json'), `${JSON.stringify({ name, url: siteUrl.href, platforms, width, height }, null, 2)}\n`)

console.log(`Created ${project}`)
console.log(`Targets: ${platforms.join(', ')}`)
console.log('Next: cd into the project, run npm install, then npm run tauri build')

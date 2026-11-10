import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

test('CommandPalette Component File Exists and Exports Default Function', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  assert.ok(fs.existsSync(palettePath), 'CommandPalette.js must exist in src/components/shared')
  
  const code = fs.readFileSync(palettePath, 'utf8')
  assert.ok(
    code.includes('export default function CommandPalette'),
    'CommandPalette.js must export default function CommandPalette'
  )
})

test('CommandPalette Implements Apple Glassmorphism and Spotlight Geometry', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  // Glassmorphic backdrop blur and translucent background
  assert.ok(
    code.includes('backdrop-blur-2xl'),
    'CommandPalette must use backdrop-blur-2xl for Apple translucent vibrancy'
  )
  assert.ok(
    code.includes('bg-white/90 dark:bg-zinc-900/90') || code.includes('backdrop-blur'),
    'CommandPalette must use Apple translucent glass backdrop'
  )
  assert.ok(
    code.includes('rounded-[20px]'),
    'CommandPalette must use refined rounded-[20px] geometry'
  )
  assert.ok(
    code.includes('inset_0_1px_0_0_rgba(255,255,255'),
    'CommandPalette must feature specular top rim lighting'
  )
})

test('CommandPalette Features Spotlight Scope Filter Tabs', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  assert.ok(code.includes('SCOPE_TABS'), 'CommandPalette must define SCOPE_TABS')
  assert.ok(code.includes('"navigation"'), 'SCOPE_TABS must include navigation scope')
  assert.ok(code.includes('"actions"'), 'SCOPE_TABS must include actions scope')
  assert.ok(code.includes('"records"'), 'SCOPE_TABS must include records scope')
  assert.ok(code.includes('"system"'), 'SCOPE_TABS must include system scope')
  assert.ok(
    code.includes('Tab') && code.includes('cycle'),
    'CommandPalette must support Tab cycling through scope filters'
  )
})

test('CommandPalette Implements macOS Two-Pane Inspector Preview', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  // Split view
  assert.ok(
    code.includes('md:flex') && (code.includes('md:w-[360px]') || code.includes('lg:w-[390px]')),
    'CommandPalette must include desktop inspector preview panel with increased width'
  )
  assert.ok(
    code.includes('focusedItem'),
    'CommandPalette must track focusedItem for live inspection'
  )
  assert.ok(
    code.includes('rawStudent'),
    'CommandPalette inspector must support Student Record metadata preview'
  )
  assert.ok(
    code.includes('rawRequest'),
    'CommandPalette inspector must support Document Request metadata preview'
  )
  assert.ok(
    code.includes('Copy') || code.includes('handleCopyIdentifier'),
    'CommandPalette inspector must support instant ID clipboard copy'
  )
})

test('CommandPalette Persists Recent Commands in LocalStorage', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  assert.ok(
    code.includes('RECENT_COMMANDS_KEY') || code.includes('pupsj_command_recent'),
    'CommandPalette must define a storage key for recent commands'
  )
  assert.ok(
    code.includes('saveRecentCommand'),
    'CommandPalette must implement saveRecentCommand'
  )
  assert.ok(
    code.includes('clearRecentCommands'),
    'CommandPalette must allow clearing recent commands history'
  )
})

test('CommandPalette Supports Live Deep University Search with Debouncing', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  assert.ok(
    code.includes('/api/students?q='),
    'CommandPalette must live search /api/students'
  )
  assert.ok(
    code.includes('/api/document-requests?q='),
    'CommandPalette must live search /api/document-requests'
  )
  assert.ok(
    code.includes('AbortController'),
    'CommandPalette must use AbortController to prevent stale search requests'
  )
  assert.ok(
    code.includes('HighlightMatches'),
    'CommandPalette must include substring match highlighting'
  )
})

test('CommandPalette Status Bar Conforms to Apple HIG Chiclet Keys', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  assert.ok(code.includes('navigate'), 'Footer must indicate navigation keys')
  assert.ok(code.includes('select'), 'Footer must indicate select key')
  assert.ok(code.includes('dismiss'), 'Footer must indicate dismiss key')
  assert.ok(code.includes('scope'), 'Footer must indicate scope toggle')
})

test('Sidebar.js Integrates New CommandPalette Component', () => {
  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  const code = fs.readFileSync(sidebarPath, 'utf8')

  assert.ok(
    code.includes('import CommandPalette from "@/components/shared/CommandPalette"'),
    'Sidebar.js must import CommandPalette component'
  )
  assert.ok(
    code.includes('<CommandPalette'),
    'Sidebar.js must render <CommandPalette'
  )
  assert.ok(
    code.includes('open={commandOpen}'),
    'Sidebar.js must pass commandOpen state to CommandPalette'
  )
  assert.ok(
    code.includes('onOpenChange={setCommandOpen}'),
    'Sidebar.js must pass setCommandOpen to CommandPalette'
  )
})

test('CommandPalette Renders Student ProfileAvatar in List and Inspector Preview', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  assert.ok(
    code.includes('import ProfileAvatar from "@/components/shared/ProfileAvatar"'),
    'CommandPalette must import ProfileAvatar'
  )
  assert.ok(
    code.includes('item.type === "student" ? (') && code.includes('<ProfileAvatar'),
    'CommandPalette must render ProfileAvatar for student list items'
  )
  assert.ok(
    code.includes('focusedItem.type === "student" ? (') && code.includes('<ProfileAvatar'),
    'CommandPalette must render ProfileAvatar in inspector preview panel'
  )
  assert.ok(
    code.includes('getInitials'),
    'CommandPalette must define getInitials helper for avatar fallback'
  )
})

test('CommandPalette Renders Icons via Universal PaletteIcon Helper', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  assert.ok(
    code.includes('function PaletteIcon'),
    'CommandPalette must define PaletteIcon helper'
  )
  assert.ok(
    code.includes('icon.$$typeof') || code.includes('typeof icon.render === "function"'),
    'PaletteIcon must recognize Hugeicons forwardRef objects and function components'
  )
  assert.ok(
    code.includes('<PaletteIcon'),
    'CommandPalette must use <PaletteIcon to render list and preview icons'
  )
})

test('CommandPalette Badges and Buttons Align With Apple HIG and Repository Standards', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  // Badges must be rounded-full with NO icons
  assert.ok(
    !code.includes('<WarehouseIcon'),
    'CommandPalette badges must not contain WarehouseIcon or icons'
  )
  assert.ok(
    code.includes('rounded-full bg-black/[0.04] dark:bg-white/[0.06]'),
    'Badges must use the borderless compound status pill pattern'
  )

  // Primary action button: text only, no trailing symbols like ↵
  assert.ok(
    code.includes('Open Student Record') && !code.includes('↵</span>'),
    'Primary action button must be text only without trailing return arrows'
  )

  // Secondary action button: outlined text only, standard styling, no leading icons like Copy01Icon
  assert.ok(
    (code.includes('variant="outline"') && code.includes('Copy {focusedItem.type === "student"')) ||
    (code.includes('<CopyButton') && code.includes('focusedItem.type === "student" ? "Student No" : "Identifier"')),
    'Secondary action button must be outlined text-only'
  )
  assert.ok(
    code.includes('border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700') ||
    code.includes('border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700'),
    'Secondary action button must follow standard Apple outlined styling'
  )
  assert.ok(
    !code.includes('<Copy01Icon size="1em" className="mr-1.5'),
    'Secondary action button must not include leading copy icon'
  )
})

test('CommandPalette Avatar and Icon Preview Are Rounded-Full with Compact Geometry', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  assert.ok(
    code.includes('size-12 rounded-full'),
    'Inspector avatar and icon preview must be rounded-full with balanced size-12 geometry'
  )
  assert.ok(
    code.includes('sm:max-w-4xl') && code.includes('lg:max-w-[1000px]'),
    'CommandPalette modal must have increased width'
  )
})

test('CommandPalette Global Ctrl+K Handler Prevents Double-Toggle Glitch', () => {
  const palettePath = path.join(ROOT_DIR, 'src/components/shared/CommandPalette.js')
  const code = fs.readFileSync(palettePath, 'utf8')

  assert.ok(
    code.includes('e.stopPropagation()'),
    'Ctrl+K keydown handler must stop event propagation'
  )
  assert.ok(
    code.includes('setIsPaletteOpen(!isPaletteOpen)'),
    'Ctrl+K handler must cleanly toggle boolean state without racing'
  )
})

test('ProfileAvatar Implements Standardized macOS Fallback Styling and SuperAdmin Adoption', () => {
  const avatarPath = path.join(ROOT_DIR, 'src/components/shared/ProfileAvatar.jsx')
  const avatarUiPath = path.join(ROOT_DIR, 'src/components/ui/avatar.jsx')
  const staffTabPath = path.join(ROOT_DIR, 'src/components/systemadmin/GlobalStaffTab.js')
  const officeSheetPath = path.join(ROOT_DIR, 'src/components/systemadmin/OfficeDetailSheet.js')
  const auditTabPath = path.join(ROOT_DIR, 'src/components/systemadmin/GlobalAuditLogsTab.js')

  // 1. ProfileAvatar macOS styling
  assert.ok(fs.existsSync(avatarPath), 'ProfileAvatar.jsx must exist')
  const avatarCode = fs.readFileSync(avatarPath, 'utf8')
  assert.ok(avatarCode.includes('MAC_AVATAR_THEMES'), 'ProfileAvatar must define macOS avatar theme palettes')
  assert.ok(avatarCode.includes('shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)'), 'ProfileAvatar must include macOS specular highlight')
  assert.ok(avatarCode.includes('bg-gradient-to-b from-blue-400'), 'ProfileAvatar must have Apple vibrant gradients')

  // 2. AvatarFallback base styling
  const avatarUiCode = fs.readFileSync(avatarUiPath, 'utf8')
  assert.ok(avatarUiCode.includes('shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)'), 'AvatarFallback must include macOS specular rim lighting')

  // 3. GlobalStaffTab uses ProfileAvatar in table and slide-over
  const staffCode = fs.readFileSync(staffTabPath, 'utf8')
  assert.ok(staffCode.includes('import ProfileAvatar from "@/components/shared/ProfileAvatar"'), 'GlobalStaffTab must import ProfileAvatar')
  assert.ok(staffCode.includes('<ProfileAvatar') && staffCode.includes('staffId={member.id}'), 'GlobalStaffTab table must render ProfileAvatar for staff')
  assert.ok(staffCode.includes('staffId={inspectMember.id}'), 'GlobalStaffTab slide-over must render ProfileAvatar for inspectMember')

  // 4. OfficeDetailSheet uses ProfileAvatar for stationed personnel
  const officeCode = fs.readFileSync(officeSheetPath, 'utf8')
  assert.ok(officeCode.includes('import ProfileAvatar from "@/components/shared/ProfileAvatar"'), 'OfficeDetailSheet must import ProfileAvatar')
  assert.ok(officeCode.includes('<ProfileAvatar') && officeCode.includes('staffId={staff.id}'), 'OfficeDetailSheet must render ProfileAvatar for stationed staff')

  // 5. GlobalAuditLogsTab uses AuditActorAvatar
  const auditCode = fs.readFileSync(auditTabPath, 'utf8')
  assert.ok(auditCode.includes('<AuditActorAvatar'), 'GlobalAuditLogsTab must render AuditActorAvatar')
})


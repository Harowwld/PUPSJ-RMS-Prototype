import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

test('DropdownMenu Component Implements Apple macOS Acrylic Frosted Glass and Header Spacing', () => {
  const dropdownPath = path.join(ROOT_DIR, 'src/components/ui/dropdown-menu.jsx')
  assert.ok(fs.existsSync(dropdownPath), 'dropdown-menu.jsx must exist')
  const code = fs.readFileSync(dropdownPath, 'utf8')

  // Apple Frosted Glass Material
  assert.ok(code.includes('backdrop-blur-2xl'), 'DropdownMenuContent must feature backdrop-blur-2xl')
  assert.ok(code.includes('bg-white/92 dark:bg-zinc-900/92'), 'DropdownMenuContent must feature translucent acrylic vibrancy')
  assert.ok(code.includes('shadow-[0_16px_36px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.7)]'), 'DropdownMenuContent must feature top specular highlight')
  assert.ok(code.includes('rounded-2xl'), 'DropdownMenuContent must feature Apple squircle geometry')

  // Header Spacing for Rounded Corners
  assert.ok(code.includes('px-4.5 py-2.5'), 'DropdownMenuHeader must have generous px-4.5 py-2.5 padding to clear rounded-2xl corners')

  // Items
  assert.ok(code.includes('rounded-xl px-2.5 py-1.5'), 'DropdownMenuItem must have rounded-xl and comfortable padding')
  assert.ok(code.includes('active:scale-[0.98]'), 'DropdownMenuItem must feature Apple physical press feedback')
})

test('Popover Component Implements Apple macOS Translucency and Optical Header Spacing', () => {
  const popoverPath = path.join(ROOT_DIR, 'src/components/ui/popover.jsx')
  assert.ok(fs.existsSync(popoverPath), 'popover.jsx must exist')
  const code = fs.readFileSync(popoverPath, 'utf8')

  // Apple Frosted Glass Material
  assert.ok(code.includes('backdrop-blur-2xl'), 'PopoverContent must feature backdrop-blur-2xl')
  assert.ok(code.includes('bg-white/92 dark:bg-zinc-900/92'), 'PopoverContent must feature translucent acrylic vibrancy')
  assert.ok(code.includes('shadow-[0_20px_48px_rgba(0,0,0,0.14),inset_0_1px_0_0_rgba(255,255,255,0.75)]'), 'PopoverContent must feature top specular highlight')
  assert.ok(code.includes('rounded-2xl'), 'PopoverContent must feature rounded-2xl geometry')

  // Optical Header Spacing
  assert.ok(code.includes('px-4.5 py-2.5'), 'PopoverHeader must have px-4.5 py-2.5 padding so labels are not crowded by rounded-2xl corners')
  assert.ok(code.includes('PopoverTitle') && code.includes('tracking-tight'), 'PopoverTitle must have Apple tracking-tight')
})

test('OfficeTableControls Uses Apple Optical Padding for Popover Headers and Footers', () => {
  const controlsPath = path.join(ROOT_DIR, 'src/components/systemadmin/OfficeTableControls.js')
  assert.ok(fs.existsSync(controlsPath), 'OfficeTableControls.js must exist')
  const code = fs.readFileSync(controlsPath, 'utf8')

  assert.ok(!code.includes('PopoverHeader className="px-3 py-1.5"'), 'OfficeTableControls must not use cramped px-3 py-1.5')
  assert.ok(!code.includes('PopoverHeader className="px-3.5 py-2"'), 'OfficeTableControls must not use cramped px-3.5 py-2')
  assert.ok(code.includes('PopoverHeader className="px-4.5 py-2.5"'), 'OfficeTableControls must use optical px-4.5 py-2.5 padding')
})

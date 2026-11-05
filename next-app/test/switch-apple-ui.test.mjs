import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

test('Switch Component Implements Apple UISwitch Physical Track & Thumb Elevation', () => {
  const switchPath = path.join(ROOT_DIR, 'src/components/ui/switch.jsx')
  assert.ok(fs.existsSync(switchPath), 'switch.jsx must exist')
  const code = fs.readFileSync(switchPath, 'utf8')

  // 1. Apple Neutral Track Colors & Inset Depth
  assert.ok(code.includes('bg-[#E9E9EA] dark:bg-[#39393D]'), 'Switch track must feature Apple neutral colors')
  assert.ok(code.includes('shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]'), 'Switch track must feature physical inset depth shadow')
  assert.ok(code.includes('border border-black/[0.06]'), 'Switch track must feature hairline boundary border')

  // 2. Apple System Green Active State & Brand Variants
  assert.ok(code.includes('data-[checked]:bg-[#34C759]'), 'Switch must feature Apple System Green (#34C759)')
  assert.ok(code.includes('dark:data-[checked]:bg-[#30D158]'), 'Switch must feature Apple Dark Mode System Green (#30D158)')
  assert.ok(code.includes('data-[checked]:bg-pup-maroon'), 'Switch must support University brand variant')

  // 3. Apple Floating Pure White Disc with 3-Layer Depth Shadow
  assert.ok(
    code.includes('shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.18),0_1px_1px_rgba(0,0,0,0.1),0_3px_8px_rgba(0,0,0,0.12)]'),
    'Switch thumb must feature Apple 3-layer physical elevation shadow with top rim highlight'
  )
  assert.ok(code.includes('border border-black/[0.04]'), 'Switch thumb must have subtle boundary border')

  // 4. Fluid Motion & Tactile Press Feedback
  assert.ok(
    code.includes('ease-[cubic-bezier(0.16,1,0.3,1)]'),
    'Switch thumb must use Apple fluid spring transition curve'
  )
  assert.ok(code.includes('active:scale-[0.96]'), 'Switch must feature tactile scale-on-press feedback')

  // 5. Proper Sizing
  assert.ok(code.includes('h-6 w-11'), 'Default size must be h-6 w-11')
  assert.ok(code.includes('h-5 w-9'), 'Small size must be h-5 w-9')
  assert.ok(code.includes('translate-x-5'), 'Default translation must be translate-x-5')
  assert.ok(code.includes('translate-x-4'), 'Small translation must be translate-x-4')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

test('Dialog Component Implements Apple macOS Alert Sheet Styling', () => {
  const dialogPath = path.join(ROOT_DIR, 'src/components/ui/dialog.jsx')
  assert.ok(fs.existsSync(dialogPath), 'dialog.jsx must exist')
  const code = fs.readFileSync(dialogPath, 'utf8')

  // 1. Apple Scrim Backdrop
  assert.ok(code.includes('backdrop-blur-sm'), 'DialogOverlay must use backdrop-blur-sm for Apple dimmed scrim')
  assert.ok(code.includes('bg-black/40'), 'DialogOverlay must use semi-transparent black overlay')

  // 2. Card Surface & Specular Lighting
  assert.ok(code.includes('backdrop-blur-2xl'), 'DialogContent must feature backdrop-blur-2xl')
  assert.ok(code.includes('bg-white/95 dark:bg-zinc-900/95'), 'DialogContent must feature translucent acrylic vibrancy')
  assert.ok(code.includes('rounded-[22px]'), 'DialogContent must use Apple squircle rounded-[22px] geometry')
  assert.ok(
    code.includes('shadow-[0_24px_54px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.85)]'),
    'DialogContent must feature Apple top specular highlight rim'
  )

  // 3. Floating Circular Disc Close Button
  assert.ok(
    code.includes('size-7 rounded-full'),
    'DialogContent close button must be a circular floating disc'
  )

  // 4. Typography Hierarchy
  assert.ok(
    code.includes('text-[17px] font-bold tracking-tight'),
    'DialogTitle must use Apple standard 17px bold typography'
  )
})

test('ConfirmModal and PromptModal Align with Apple Alert Specifications', () => {
  const confirmPath = path.join(ROOT_DIR, 'src/components/shared/ConfirmModal.js')
  const promptPath = path.join(ROOT_DIR, 'src/components/shared/PromptModal.js')

  const confirmCode = fs.readFileSync(confirmPath, 'utf8')
  assert.ok(confirmCode.includes('rounded-[22px]'), 'ConfirmModal must use rounded-[22px]')
  assert.ok(confirmCode.includes('backdrop-blur-2xl'), 'ConfirmModal must use backdrop-blur-2xl')
  assert.ok(confirmCode.includes('variant="outline"'), 'ConfirmModal secondary action must be outlined')

  const promptCode = fs.readFileSync(promptPath, 'utf8')
  assert.ok(promptCode.includes('rounded-[22px]'), 'PromptModal must use rounded-[22px]')
  assert.ok(promptCode.includes('backdrop-blur-2xl'), 'PromptModal must use backdrop-blur-2xl')
  assert.ok(promptCode.includes('variant="outline"'), 'PromptModal secondary action must be outlined')
})

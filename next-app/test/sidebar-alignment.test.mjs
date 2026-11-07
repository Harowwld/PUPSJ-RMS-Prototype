import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()

test('Sidebar uses clean LayoutLeftIcon for collapse and expand states', () => {
  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  assert.ok(fs.existsSync(sidebarPath), 'Sidebar.js must exist')
  const content = fs.readFileSync(sidebarPath, 'utf8')

  assert.ok(
    content.includes('LayoutLeftIcon'),
    'Sidebar.js must import and use LayoutLeftIcon'
  )
  assert.ok(
    !content.includes('SidebarLeft01Icon'),
    'Sidebar.js must NOT use cluttered SidebarLeft01Icon'
  )
})

test('Sidebar Logo row icon slot aligns with navigation column (w-[38px] h-[38px] & ml-1.5)', () => {
  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  const content = fs.readFileSync(sidebarPath, 'utf8')

  // Logo should be enclosed in a matching 38px slot
  assert.ok(
    content.includes('w-[38px] h-[38px] flex items-center justify-center shrink-0') &&
    content.includes('eManage'),
    'Sidebar logo must be housed in a 38px icon slot'
  )

  // Label text should start at the standardized ml-1.5 offset
  assert.ok(
    content.includes('group-hover/logo:opacity-80 transition-opacity ml-1.5 truncate'),
    'Sidebar eManage label must use ml-1.5 to align with nav labels'
  )
})

test('Sidebar Command Palette trigger aligns with icon column (w-[38px] h-[38px] & ml-1.5)', () => {
  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  const content = fs.readFileSync(sidebarPath, 'utf8')

  assert.ok(
    content.includes('pl-1 pr-2.5 flex items-center justify-between rounded-xl'),
    'Command palette trigger must use pl-1 for consistent outer padding'
  )
  assert.ok(
    content.includes('Search views, records...</span>') ||
    content.includes('Search views, records...\n'),
    'Command palette trigger must include placeholder text'
  )
})

test('Sidebar Profile Menu avatar aligns with icon column and uses upper-lower pointer icon', () => {
  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  const content = fs.readFileSync(sidebarPath, 'utf8')

  assert.ok(
    content.includes('w-[38px] h-9 flex items-center justify-center shrink-0'),
    'Profile avatar must be centered in a 38px slot'
  )
  assert.ok(
    content.includes('UnfoldMoreIcon'),
    'Profile menu button must use UnfoldMoreIcon (upper-lower pointer selector)'
  )
  assert.ok(
    !content.includes('ArrowUp01Icon'),
    'Profile menu button must NOT use ArrowUp01Icon'
  )
})

test('DashboardShellSkeleton mirrors the standardized 38px icon column geometry', () => {
  const skelPath = path.join(ROOT_DIR, 'src/components/shared/DashboardShellSkeleton.js')
  assert.ok(fs.existsSync(skelPath), 'DashboardShellSkeleton.js must exist')
  const content = fs.readFileSync(skelPath, 'utf8')

  assert.ok(
    content.includes('h-[38px] w-[38px] shrink-0 items-center justify-center'),
    'DashboardShellSkeleton must mirror 38px icon slots'
  )
})

test('Sidebar search command palette kbd badge uses rounded-full border', () => {
  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  const content = fs.readFileSync(sidebarPath, 'utf8')

  assert.ok(
    content.includes('border border-black/10 dark:border-white/10 rounded-full shadow-2xs leading-none shrink-0 select-none'),
    'Desktop search trigger kbd badge must use rounded-full border'
  )
  assert.ok(
    content.includes('border border-black/10 dark:border-white/10 rounded-full shadow-2xs leading-none'),
    'Mobile search trigger kbd badge must use rounded-full border'
  )
})

test('Sidebar highlights use standard rounded-xl and not rounded-full or rounded-[8px]', () => {
  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  const content = fs.readFileSync(sidebarPath, 'utf8')

  // Must not have non-standard rounded-[8px] in Sidebar.js
  assert.ok(
    !content.includes('rounded-[8px]'),
    'Sidebar.js must NOT contain arbitrary rounded-[8px]'
  )

  // Must use rounded-xl on nav items
  assert.ok(
    content.includes('h-[40px] items-center rounded-xl text-[13.5px]'),
    'Nav items must use standard rounded-xl'
  )

  // Active pill must use layoutId="sidebar-active-pill" and rounded-xl
  assert.ok(
    content.includes('layoutId="sidebar-active-pill"'),
    'Sidebar active indicator must use layoutId="sidebar-active-pill" for smooth sliding morph'
  )
  assert.ok(
    content.includes('className="absolute inset-0 rounded-xl shadow-2xs z-0 pointer-events-none"'),
    'Active highlight pill must use rounded-xl (not rounded-full)'
  )
})

test('Sidebar uses critically damped spring physics for desktop rail collapse/expand', () => {
  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  const motionPath = path.join(ROOT_DIR, 'src/lib/motion.js')
  const content = fs.readFileSync(sidebarPath, 'utf8')
  const motionContent = fs.readFileSync(motionPath, 'utf8')

  assert.ok(
    content.includes('SIDEBAR_MORPH_TRANSITION'),
    'Sidebar must use SIDEBAR_MORPH_TRANSITION'
  )
  assert.ok(
    motionContent.includes('SIDEBAR_MORPH_TRANSITION = {') &&
    motionContent.includes('stiffness: 380') &&
    motionContent.includes('damping: 35') &&
    motionContent.includes('mass: 0.75'),
    'motion.js must define critically damped spring physics (stiffness 380, damping 35, mass 0.75)'
  )
  assert.ok(
    content.includes('<motion.aside'),
    'Sidebar must render a motion.aside for spring animation'
  )
})

test('Sidebar implements smooth gliding hover transition with shared layoutId pill', () => {
  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  const content = fs.readFileSync(sidebarPath, 'utf8')

  assert.ok(
    content.includes('const [hoveredKey, setHoveredKey] = useState(null)'),
    'Sidebar must manage hoveredKey state for smooth hover transitions'
  )
  assert.ok(
    content.includes('onMouseLeave={() => setHoveredKey(null)}'),
    'Sidebar nav container must reset hoveredKey on mouse leave'
  )
  assert.ok(
    content.includes('layoutId="sidebar-hover-pill"'),
    'Sidebar items must use layoutId="sidebar-hover-pill" for shared morphing hover background'
  )
  assert.ok(
    content.includes('bg-black/[0.05] dark:bg-white/[0.06]'),
    'Hover pill must use subtle Apple-style glass background'
  )
})

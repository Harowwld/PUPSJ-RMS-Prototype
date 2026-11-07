import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "table-ui-"));
const sourceRoot = path.resolve("src");
const babelPath = require.resolve("next/dist/compiled/babel/core");
const presetPath = require.resolve("next/dist/compiled/babel/preset-react");
await fs.writeFile(path.join(temp, "loader.cjs"), `const {transformSync}=require(${JSON.stringify(babelPath)});module.exports=function(source){return transformSync(source,{filename:this.resourcePath,babelrc:false,configFile:false,presets:[[${JSON.stringify(presetPath)},{runtime:'automatic'}]]}).code;};`);
await fs.writeFile(path.join(temp, "entry.jsx"), `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Table,TableRow,TableText,TableStatus} from '@/components/ui/table';
import {TablePreferencesProvider,TableDensityControl} from '@/components/shared/TablePreferences';
import TableScrollControls from '@/components/shared/TableScrollControls';
import useTableScroll from '@/hooks/useTableScroll';
import TablePagination from '@/components/shared/TablePagination';
import {TooltipProvider,Tooltip,TooltipTrigger,TooltipContent} from '@/components/ui/tooltip';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import StudentRequestsSkeleton from '@/components/student/skeletons/StudentRequestsTableSkeleton';
import {ViewIcon,PencilEdit01Icon} from 'hugeicons-react';
window.events=[];
function LazyScroll(){
 const [loaded,setLoaded]=React.useState(false),scroll=useTableScroll([]);window.showLazy=()=>setLoaded(true);
 return loaded?<section className="min-w-0"><div className="flex items-center justify-between gap-4"><span>Table controls</span><TableScrollControls scrollContainerRef={scroll.containerRef} scrollTargetLabel="lazy table" isScrolledX={scroll.isScrolledX} onResetScroll={scroll.resetScroll} onScrollLeft={scroll.scrollLeft} onScrollRight={scroll.scrollRight}/></div><output id="lazy-scrolled">{String(scroll.isScrolledX)}</output><div id="lazy-viewport" ref={scroll.containerRef} className="min-w-0 overflow-x-auto"><Table columns={[{kind:'text',width:1800}]}><tbody><tr><td>Loaded after the initial render</td></tr></tbody></Table></div></section>:null;
}
function App(){
 const [user,setUser]=React.useState({id:'qa-a',role:'Staff'}),[page,setPage]=React.useState(1),[pageSize,setPageSize]=React.useState(10),[total,setTotal]=React.useState(23),[selected,setSelected]=React.useState(false);
 window.changeUser=setUser;window.shrink=()=>setTotal(1);window.empty=()=>setTotal(0);
 const long='VeryLongUnbrokenStudentName'.repeat(20);
 const actions=<div><Tooltip><TooltipTrigger asChild><button onClick={()=>window.events.push('view')}><ViewIcon size={16}/></button></TooltipTrigger><TooltipContent>View Student</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><button onClick={()=>window.events.push('edit')}><PencilEdit01Icon size={16}/></button></TooltipTrigger><TooltipContent>Edit Student</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><button disabled onClick={()=>window.events.push('disabled')}>Locked</button></TooltipTrigger><TooltipContent>Locked Student</TooltipContent></Tooltip><DropdownMenu><DropdownMenuTrigger>Legacy overflow</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>window.events.push('archive')}>Archive Student</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>;
 return <TooltipProvider><TablePreferencesProvider user={user}><main className="min-w-0 p-4 space-y-4">
 <div className="flex flex-wrap gap-3"><TableDensityControl label="First density"/><TableDensityControl label="Second density"/></div>
 <div id="viewport" className="w-full min-w-0 overflow-x-auto"><Table id="records" className="min-w-[900px]" columns={['selection',{kind:'identifier',width:170},{kind:'text',maxWidth:340},'status','year','number','actions']}>
 <thead><tr><th><input aria-label="Select all" type="checkbox" checked={selected} onChange={e=>setSelected(e.target.checked)}/></th><th>ID</th><th>Name</th><th>Status</th><th>Year</th><th>Files</th><th>Actions</th></tr></thead>
 <tbody><tr onClick={()=>window.events.push('row')}><td><input aria-label="Select student" type="checkbox" checked={selected} onClick={e=>e.stopPropagation()} onChange={e=>setSelected(e.target.checked)}/></td><td><span className="rounded-full bg-red-100 px-4 py-2">2026-00001</span></td><td><TableText>{long}</TableText></td><td><span className="rounded-full px-4 py-2">Approved</span></td><td>2026</td><td>12</td><td>{actions}</td></tr>
 <TableRow selected={selected}><td><input aria-label="Select second student" type="checkbox" checked={selected} onChange={()=>{}}/></td><td>2026-00002</td><td><TableText secondary>Secondary details remain visible</TableText></td><td><TableStatus value="Future status"/></td><td>2025</td><td>0</td><td><Tooltip><TooltipTrigger asChild><button onClick={()=>window.events.push('single')}><ViewIcon size={16}/></button></TooltipTrigger><TooltipContent>View Single Student</TooltipContent></Tooltip></td></TableRow>
 <tr><td colSpan={7}><div style={{height:90}}>Expanded details</div></td></tr></tbody></Table></div>
 <TablePagination page={page} pageSize={pageSize} totalCount={total} onPageChange={setPage} onPageSizeChange={setPageSize} label="Students"/>
 <div className="w-full overflow-x-auto"><Table id="other" columns={['text']}><thead><tr><th>Second table</th></tr></thead><tbody><tr><td>Same density</td></tr></tbody></Table></div>
 <div className="w-full overflow-x-auto"><Table id="matrix" layout="matrix" columns={[{kind:'identifier',width:180},{kind:'text',width:240},'category']}><thead><tr><th>ID</th><th>Name</th><th>Requirement</th></tr></thead><tbody><tr><td>2026-00001</td><td><TableText>{long}</TableText></td><td><button aria-label="Upload requirement" onClick={()=>window.events.push('upload')}>Upload Document</button></td></tr></tbody></Table></div>
 <LazyScroll/><StudentRequestsSkeleton rowCount={2}/>
 </main></TablePreferencesProvider></TooltipProvider>;
}
createRoot(document.getElementById('root')).render(<App/>);
`);
const webpack = require("next/dist/compiled/webpack/webpack").webpack;
await new Promise((resolve, reject) => webpack({ mode: "development", devtool: false, entry: path.join(temp, "entry.jsx"), output: { path: temp, filename: "bundle.js" }, module: { rules: [{ test: /\.[cm]?jsx?$/, include: [temp, sourceRoot], use: path.join(temp, "loader.cjs") }, { test: /\.m?js$/, resolve: { fullySpecified: false } }] }, resolve: { modules: [path.resolve("node_modules"), "node_modules"], alias: { "@": sourceRoot }, extensions: [".js", ".jsx"] } }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
const tailwind = require("@tailwindcss/postcss");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const from = path.resolve("src/app/globals.css");
const { css } = await postcss([tailwind({ base: process.cwd() })]).process(await fs.readFile(from, "utf8"), { from });
const font = await fs.readFile("public/assets/fonts/jakarta/PlusJakartaSans-Variable.woff2");
const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_PATH || "/opt/brave-bin/brave", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.setRequestInterception(true);
  page.on("request", (request) => request.respond({ status: 200, contentType: "text/html", body: "<html><body></body></html>" }));
  await page.goto("http://table-fixture.test");
  const html = (theme) => `<html class="${theme}"><head><style>${css}</style><style>@font-face{font-family:TableQA;src:url(data:font/woff2;base64,${font.toString("base64")});font-weight:100 900}html{--font-jakarta:TableQA}body{margin:0}</style></head><body><div id="root"></div></body></html>`;
  const mount = async (theme) => { await page.setContent(html(theme)); await page.addScriptTag({ path: path.join(temp, "bundle.js") }); await page.waitForSelector('[aria-label="First density"]:not([disabled])'); await page.evaluate(() => document.fonts.ready); };
  const waitForMenuFocus = async (label) => page.waitForFunction((text) => document.activeElement.textContent.trim() === text, { timeout: 3000 }, label).catch(async (error) => { console.log(await page.evaluate(() => ({ active: document.activeElement.outerHTML, menu: document.querySelector('[role="menu"]')?.outerHTML, events: window.events }))); throw error; });
  const setDensity = async (value) => {
    await page.click('[aria-label="First density"]');
    await page.waitForSelector('[role="listbox"]');
    const label = value[0].toUpperCase() + value.slice(1);
    const options = await page.$$('[role="option"]');
    for (const option of options) if ((await option.evaluate((element) => element.textContent)).trim() === label) { await option.click(); break; }
    await page.waitForFunction((density) => document.querySelector("#records").dataset.density === density, {}, value);
  };
  await fs.mkdir(".local/table-qa", { recursive: true });
  const qaWidths = process.env.TABLE_QA_FAST ? [1440] : [1440, 768, 320];
  const qaThemes = process.env.TABLE_QA_FAST ? ["light"] : ["light", "dark", "high-contrast", "high-contrast dark"];
  for (const width of qaWidths) for (const theme of qaThemes) {
    await page.setViewport({ width, height: 1000 });
    await page.evaluate(() => localStorage.clear());
    await mount(theme);
    for (const [density, height] of [["compact", 40], ["normal", 52], ["comfortable", 64]]) {
      await setDensity(density);
      const geometry = await page.evaluate(() => {
        const table = document.querySelector("#records"), row = table.tBodies[0].rows[0];
        return { row: row.getBoundingClientRect().height, header: table.tHead.rows[0].getBoundingClientRect().height, tableWidth: table.getBoundingClientRect().width, viewportWidth: document.querySelector("#viewport").clientWidth, actions: row.cells[6].getBoundingClientRect().width, selection: row.cells[0].getBoundingClientRect().width, align: Array.from(row.cells).map((cell) => getComputedStyle(cell).textAlign), other: document.querySelector("#other").dataset.density, overflow: document.documentElement.scrollWidth > innerWidth, identifier: getComputedStyle(row.querySelector('[data-slot="table-identifier"]')).height, constrained: row.cells[2].getBoundingClientRect().width, actionHeading: table.tHead.rows[0].cells[6].querySelector('.sr-only')?.textContent.trim(), actionHeadingBox: table.tHead.rows[0].cells[6].querySelector('.sr-only')?.getBoundingClientRect().width, columnWidths: Array.from(row.cells, (cell) => cell.getBoundingClientRect().width) };
      });
      assert.ok(Math.abs(geometry.row - height) <= 1, JSON.stringify({ density, geometry }));
      assert.ok(Math.abs(geometry.header - 40) <= 1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.actions - 48) <= 1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.selection - 48) <= 1, JSON.stringify(geometry));
      assert.ok(geometry.tableWidth >= geometry.viewportWidth - 1, JSON.stringify(geometry));
      if (geometry.viewportWidth >= 900) assert.ok(Math.abs(geometry.tableWidth - geometry.viewportWidth) <= 1, JSON.stringify(geometry));
      assert.deepEqual(geometry.align, ["center", "left", "left", "center", "center", "right", "center"]);
      assert.equal(geometry.other, density); assert.equal(geometry.overflow, false); assert.equal(geometry.identifier, "24px"); assert.ok(geometry.constrained <= 340); assert.equal(geometry.actionHeading, "Actions"); assert.ok(geometry.actionHeadingBox <= 1); assert.ok(geometry.columnWidths[2] <= 340);
    }
    await page.$eval("#viewport", (element) => { element.scrollLeft = element.scrollWidth; });
    await page.focus('#records [aria-label="Row actions"]'); await page.keyboard.press("ArrowDown"); await page.waitForSelector('[role="menu"]');
    await waitForMenuFocus("View Student"); await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.events.includes("view"));
    await page.waitForSelector('[role="menu"]', { hidden: true });
    assert.equal(await page.evaluate(() => window.events.includes("row")), false);
    await page.focus('#records [aria-label="Row actions"]'); await page.keyboard.press("ArrowDown"); await page.waitForSelector('[role="menu"]');
    await waitForMenuFocus("View Student");
    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(() => document.activeElement.textContent.trim() === "Edit Student", { timeout: 3000 }).catch(async (error) => { console.log(await page.evaluate(() => ({ active: document.activeElement.outerHTML, items: Array.from(document.querySelectorAll('[role="menuitem"]'), (item) => item.outerHTML) }))); throw error; });
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.events.includes("edit")); await page.waitForSelector('[role="menu"]', { hidden: true });
    await page.click('#records [aria-label="Row actions"]'); await page.waitForSelector('[role="menu"]');
    const locked = await page.$('[role="menuitem"][disabled], [role="menuitem"][aria-disabled="true"]'); assert.ok(locked, "Unavailable actions must remain disabled"); await locked.evaluate((element) => element.click());
    assert.equal(await page.evaluate(() => window.events.includes("disabled")), false);
    assert.equal(await page.$$eval('[role="menu"] [data-slot="dropdown-menu-trigger"]', (elements)=>elements.length),0);
    await page.keyboard.press('End');await page.keyboard.press('Enter');await page.waitForFunction(()=>window.events.includes('archive'));await page.waitForSelector('[role="menu"]',{hidden:true});
    await page.click('#records [aria-label="Row actions"]');await page.waitForSelector('[role="menu"]');
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="menu"]', { hidden: true });
    await page.waitForFunction(() => document.activeElement.getAttribute("aria-label") === "Row actions", { timeout: 3000 }).catch(async (error) => { console.log(await page.evaluate(() => ({ active: document.activeElement.outerHTML, menus: document.querySelectorAll('[role="menu"]').length }))); throw error; });
    await page.click('[aria-label="View Single Student"]'); assert.equal(await page.evaluate(() => window.events.includes("single")), true);
    await page.$eval("#viewport", (element) => { element.scrollLeft = 0; });
    await page.click('[aria-label="Select all"]');
    const selectedRows = await page.$$eval('#records tbody tr[data-selected="true"]', (rows) => rows.map((row) => ({ checks: Array.from(row.querySelectorAll('input[type="checkbox"]')).every((checkbox) => checkbox.checked), backgrounds: Array.from(row.cells, (cell) => getComputedStyle(cell).backgroundColor) })));
    assert.equal(selectedRows.length, 2); assert.ok(selectedRows.every((row) => row.checks)); assert.ok(selectedRows.every((row) => new Set(row.backgrounds).size === 1));
    assert.equal(await page.$eval('[aria-label="Select student"]', (element) => element.checked), true); assert.equal(await page.$eval('[aria-label="Select second student"]', (element) => element.checked), true);
    const matrix = await page.evaluate(() => { const row = document.querySelector('#matrix').tBodies[0].rows[0]; return Array.from(row.cells).slice(0, 2).map((cell) => cell.getBoundingClientRect().width); });
    assert.deepEqual(matrix, [180, 240]);
    await page.click('[aria-label="Next page of Students"]'); await page.waitForFunction(() => document.querySelector('[data-slot="table-pagination"]').textContent.includes("11–20"));
    await page.click('[aria-label="Next page of Students"]'); await page.waitForFunction(() => document.querySelector('[data-slot="table-pagination"]').textContent.includes("21–23"));
    await page.click('[aria-label="Previous page of Students"]'); await page.waitForFunction(() => document.querySelector('[data-slot="table-pagination"]').textContent.includes("11–20"));
    await page.click('[aria-label="Next page of Students"]'); await page.waitForFunction(() => document.querySelector('[data-slot="table-pagination"]').textContent.includes("21–23"));
    await page.click('[aria-label="20 rows per page"]'); await page.waitForFunction(() => document.querySelector('[data-slot="table-pagination"]').textContent.includes("1–20"));
    await page.click('[aria-label="Next page of Students"]'); await page.evaluate(() => window.shrink()); await page.waitForFunction(() => document.querySelector('[aria-current="page"]').textContent === "1");
    await page.evaluate(() => window.empty()); await page.waitForFunction(() => document.querySelector('[data-slot="table-pagination"]').textContent.includes("Showing 0 of 0"));
    await page.screenshot({ path: `.local/table-qa/${width}-${theme.replaceAll(" ", "-")}.png`, fullPage: true });
    await mount(theme); assert.equal(await page.$eval("#records", (element) => element.dataset.density), "comfortable");
    await page.evaluate(() => window.changeUser({ id: "qa-b", role: "Staff" })); await page.waitForFunction(() => document.querySelector("#records").dataset.density === "normal");
    await page.evaluate(() => window.changeUser({ id: "qa-a", role: "Student" })); await page.waitForFunction(() => document.querySelector("#records").dataset.density === "normal");
    await page.evaluate(() => window.changeUser({ id: "qa-a", role: "Staff" })); await page.waitForFunction(() => document.querySelector("#records").dataset.density === "comfortable");
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px ${theme}: row geometry, alignment, truncation, action menus, pagination, density persistence and account isolation`);
  }
  await page.evaluate(() => window.showLazy()); await page.waitForSelector('#lazy-viewport');
  await page.click('[aria-label="Scroll lazy table right"]'); await page.waitForFunction(() => document.querySelector('#lazy-scrolled').textContent === 'true');
  await page.click('[data-slot="table-scroll-controls"] button[title="Reset horizontal scroll to default"]'); await page.waitForFunction(() => document.querySelector('#lazy-viewport').scrollLeft < 1);
  await page.click('[aria-label="Scroll lazy table right"]'); await page.waitForFunction(() => document.querySelector('#lazy-scrolled').textContent === 'true');
  await page.click('[aria-label="Scroll lazy table left"]'); await page.waitForFunction(() => document.querySelector('#lazy-viewport').scrollLeft < 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewport({ width: 1440, height: 1000 }); await mount('light'); await setDensity('normal');
  for (const scale of [.68, .9, 1.125]) {
    const geometry = await page.evaluate((factor) => { document.querySelector('#root').style.overflow='hidden'; const table=document.querySelector('#records');table.style.transform='scale('+factor+')';table.style.transformOrigin='top left';const row=table.tBodies[0].rows[0];return {height:row.getBoundingClientRect().height,actions:row.cells[6].getBoundingClientRect().width}; }, scale);
    assert.ok(Math.abs(geometry.height-52*scale)<1);assert.ok(Math.abs(geometry.actions-48*scale)<1);
  }
  await page.setViewport({width:320,height:1000,hasTouch:true,isMobile:true}); await mount('light');
  assert.equal(await page.$eval('.table-action-button', (element)=>element.getBoundingClientRect().width),44);
  await page.evaluate(() => { localStorage.setItem('pup_table_density_staff_qa-a','compact');window.dispatchEvent(new StorageEvent('storage',{key:'pup_table_density_staff_qa-a',newValue:'compact'})); });
  await page.waitForFunction(()=>document.querySelector('#records').dataset.density==='compact');
  console.log('PASS delayed table mounting, scroll controls, application zoom, touch targets and storage-event synchronization');
  await page.evaluate(() => localStorage.setItem("pup_table_density_staff_qa-a", "invalid")); await mount("light");
  assert.equal(await page.$eval("#records", (element) => element.dataset.density), "normal");
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); }; Storage.prototype.getItem = () => { throw new Error("Storage unavailable"); }; });
  await mount("light"); await setDensity("compact");
  assert.deepEqual(errors, []);
  console.log("PASS invalid preferences and unavailable storage");
} finally { await browser.close(); await fs.rm(temp, { recursive: true, force: true }); }

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
import { getRoleBranding, ROLE_BRANDING } from "../src/lib/roleBranding.js";

const require = createRequire(import.meta.url);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "actions-qa-"));
const { transformSync } = require("next/dist/compiled/babel/core");
for (const name of ["button", "switch"]) {
  const { code } = transformSync(await fs.readFile(`src/components/ui/${name}.jsx`, "utf8"), {
    babelrc: false, configFile: false,
    presets: [[require.resolve("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]],
    plugins: [require.resolve("next/dist/compiled/babel/plugin-transform-modules-commonjs")],
  });
  await fs.writeFile(path.join(temp, `${name}.js`), code);
}
await fs.writeFile(path.join(temp, "entry.js"), `
const React = require('react'); const {createRoot} = require('react-dom/client');
const {Button} = require('./button'); const {Switch} = require('./switch'); const h = React.createElement;
window.changes = 0; window.clicks = 0;
function App() { const [checked,setChecked] = React.useState(false);
return h('form', {id:'fixture', className:'flex flex-col gap-6 p-6'},
 h(Button,{id:'primary',type:'button',onClick:()=>window.clicks++},'Save Changes'),
 h(Button,{id:'disabled-button',disabled:true,type:'button',onClick:()=>window.clicks++},'Saving'),
 ...['success','warning','danger','outline'].map(variant=>h(Button,{key:variant,variant,type:'button'},variant)),
 h('label',{htmlFor:'controlled'},'Automatic backup'),
 h(Switch,{id:'controlled',name:'backup',value:'enabled',checked,onCheckedChange:value=>{setChecked(value);window.changes++;},'aria-label':'Automatic backup'}),
 h(Switch,{id:'compact',size:'sm',defaultChecked:true,'aria-label':'Retention'}),
 h(Switch,{id:'disabled-switch',disabled:true,defaultChecked:true,'aria-label':'Locked setting',onCheckedChange:()=>window.changes++})); }
createRoot(document.getElementById('root')).render(h(App));
`);
await new Promise((resolve, reject) => require("next/dist/compiled/webpack/webpack").webpack({
  mode: "development", devtool: false, entry: path.join(temp, "entry.js"),
  output: { path: temp, filename: "bundle.js" },
  module: { rules: [{ include: temp, type: "javascript/auto" }, { test: /\.m?js$/, resolve: { fullySpecified: false } }] },
  resolve: { modules: [path.resolve("node_modules"), "node_modules"], alias: { "@": path.resolve("src") }, extensions: [".js", ".jsx"] },
}, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({all:false,errors:true}))) : resolve()));
const tailwind = require("@tailwindcss/postcss");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const from = path.resolve("src/app/globals.css");
const { css } = await postcss([tailwind({ base: process.cwd() })]).process(await fs.readFile(from, "utf8"), { from });
const font = await fs.readFile('public/assets/fonts/jakarta/PlusJakartaSans-Variable.woff2');
const browser = await puppeteer.launch({executablePath:process.env.BROWSER_PATH || "/opt/brave-bin/brave",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
try {
  const page = await browser.newPage();
  page.on('pageerror', error => console.error(error));
  const backgrounds = {};
  await fs.mkdir('.local/actions-qa', {recursive:true});
  for (const width of [1440,320]) for (const theme of ['light','dark']) {
    await page.setViewport({width,height:1000});
    await page.setContent(`<html class="${theme}"><head><style>${css}</style><style>@font-face{font-family:ActionsQA;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');font-weight:100 900}html{--font-jakarta:ActionsQA}body{font-family:ActionsQA,sans-serif}</style></head><body><div id="root"></div></body></html>`);
    await page.addScriptTag({path:path.join(temp,'bundle.js')});
    await page.waitForSelector('#controlled');
    await page.evaluate(()=>document.fonts.ready);
    await page.$eval('#primary',el=>el.style.transitionProperty='none');
    const contexts = [{role:'SuperAdmin'},{role:'Admin',office:'Registrar'},{role:'Admin',office:'OSAS'},{role:'Admin',office:'Clinic'},{role:'Staff'},{role:'Student'},...Object.values(ROLE_BRANDING).map(brand=>({role:'Admin',accent_color:brand.color})),{role:'Admin',accent_color:'#663399',accent_foreground:'#ffffff'}];
    for (const context of contexts) {
      const branding = getRoleBranding(context);
      await page.$eval('#fixture', (el, brand) => {
        el.style.setProperty('--brand-accent',brand.color);
        el.style.setProperty('--brand-foreground',brand.foreground);
      }, branding);
      const aligned = await page.$eval('#primary', el => {
        const sample = document.createElement('span');
        sample.style.backgroundColor='var(--brand-accent)';
        sample.style.color='var(--brand-foreground)';
        el.append(sample);
        const actual=getComputedStyle(el),expected=getComputedStyle(sample);
        const result=actual.backgroundColor===expected.backgroundColor && actual.color===expected.color;
        sample.remove(); return result;
      });
      assert.equal(aligned,true,`${JSON.stringify(context)} primary must inherit its role theme in ${theme} mode`);
    }
    await page.$eval('#fixture',el=>el.removeAttribute('style'));
    const metrics = await page.evaluate(() => {
      const names = {controlled:'Automatic backup',compact:'Retention','disabled-switch':'Locked setting'};
      const measure = id => {const el=names[id] ? document.querySelector(`[role=switch][aria-label="${names[id]}"]`) : document.getElementById(id),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {width:r.width,height:r.height,bg:s.backgroundColor,opacity:s.opacity};};
      const thumb = document.querySelector('[aria-label="Automatic backup"] [data-slot=switch-thumb]');
      const compactThumb = document.querySelector('[aria-label="Retention"] [data-slot=switch-thumb]');
      return {primary:measure('primary'),normal:measure('controlled'),compact:measure('compact'),disabled:measure('disabled-switch'),thumbWidth:thumb.getBoundingClientRect().width,compactThumbWidth:compactThumb.getBoundingClientRect().width,thumbColor:getComputedStyle(thumb).backgroundColor,hiddenInputWidth:document.getElementById('controlled').getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(metrics.primary.height,40);
    assert.equal(metrics.normal.width,44); assert.equal(metrics.normal.height,24);
    assert.equal(metrics.compact.width,36); assert.equal(metrics.compact.height,20);
    assert.equal(metrics.disabled.opacity,'0.5'); assert.equal(metrics.overflow,false);
    assert.equal(metrics.thumbWidth,20); assert.equal(metrics.compactThumbWidth,16);
    assert.equal(metrics.thumbColor,'rgb(255, 255, 255)'); assert.equal(metrics.hiddenInputWidth,1);
    if (backgrounds.enabled) assert.equal(metrics.compact.bg,backgrounds.enabled);
    backgrounds.enabled = metrics.compact.bg;
    await page.click('label[for=controlled]');
    await page.waitForFunction(()=>document.querySelector('[role=switch][aria-label="Automatic backup"]').getAttribute('aria-checked')==='true');
    assert.equal(await page.evaluate(()=>window.changes),1);
    assert.equal(await page.evaluate(()=>new FormData(document.querySelector('form')).get('backup')),'enabled');
    await page.focus('[role=switch][aria-label="Automatic backup"]'); await page.keyboard.press('Space');
    await page.waitForFunction(()=>document.querySelector('[role=switch][aria-label="Automatic backup"]').getAttribute('aria-checked')==='false');
    assert.equal(await page.evaluate(()=>window.changes),2);
    await page.click('[role=switch][aria-label="Locked setting"]');
    assert.equal(await page.evaluate(()=>window.changes),2);
    await page.click('#primary'); await page.click('#disabled-button');
    assert.equal(await page.evaluate(()=>window.clicks),1);
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('[role=switch][aria-label="Automatic backup"]')).transitionProperty==='none');
    assert.equal(await page.$eval('[role=switch][aria-label="Automatic backup"]',el=>getComputedStyle(el).transitionProperty),'none');
    await page.emulateMediaFeatures([]);
    await page.screenshot({path:`.local/actions-qa/${width}-${theme}.png`});
    console.log(`${width}px ${theme}: button and switch interactions passed`);
  }
} finally { await browser.close(); await fs.rm(temp,{recursive:true,force:true}); }

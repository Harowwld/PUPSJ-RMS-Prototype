import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const temp = await fs.mkdtemp(path.join(os.tmpdir(),'system-ui-'));
const {transformSync} = require('next/dist/compiled/babel/core');
for (const [name,source] of Object.entries({select:'ui/select.jsx',input:'ui/input.jsx',notice:'shared/NoticeBanner.js'})) {
  const {code} = transformSync(await fs.readFile(`src/components/${source}`,'utf8'),{babelrc:false,configFile:false,presets:[[require.resolve('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]],plugins:[require.resolve('next/dist/compiled/babel/plugin-transform-modules-commonjs')]});
  await fs.writeFile(path.join(temp,`${name}.js`),code);
}
await fs.writeFile(path.join(temp,'entry.js'),`
const React=require('react'),{createRoot}=require('react-dom/client'),{Select}=require('./select'),{Input}=require('./input'),Notice=require('./notice').default,h=React.createElement;
window.changes=[];
function App(){ const [value,setValue]=React.useState('1'); return h('main',{className:'p-6 space-y-4'},
 h('h1',{id:'heading',className:'text-3xl leading-tight'},'Component standards'),
 h('code',{id:'mono',className:'font-mono'},'2026-00001'),
 h(Input,{id:'verification',className:'text-2xl',placeholder:'Verification'}),
 h(Notice,{dismissKey:'qa',tone:'warning'},'Check the physical archive before releasing this document.'),
 h('form',{id:'form'},h('label',{htmlFor:'program'},'Program'),h(Select,{id:'program',name:'program',value,onChange:e=>{setValue(e.target.value);window.changes.push(e.target.value);}},
 h('optgroup',{label:'Programs'},h('option',{value:1},'Alpha'),h('option',{value:2,disabled:true},'Disabled'),h('option',{value:3},'Bravo'),h('option',{value:4},'Charlie')))),
 h(Select,{'aria-label':'Locked program',disabled:true,options:['Alpha','Bravo']}),
 h(Select,{'aria-label':'Inline program',usePortal:false,defaultValue:0,options:[{value:0,label:'Zero'},{value:1,label:'One'}]}),
 h('div',{style:{position:'fixed',bottom:12,right:12,width:180}},h(Select,{'aria-label':'Bottom edge',options:Array.from({length:30},(_,i)=>({value:i,label:'Option '+i}))})),
 h('button',{id:'after',type:'button'},'Continue')); }
createRoot(document.getElementById('root')).render(h(App));
`);
await new Promise((resolve,reject)=>require('next/dist/compiled/webpack/webpack').webpack({mode:'development',devtool:false,entry:path.join(temp,'entry.js'),output:{path:temp,filename:'bundle.js'},module:{rules:[{include:temp,type:'javascript/auto'},{test:/\.m?js$/,resolve:{fullySpecified:false}}]},resolve:{modules:[path.resolve('node_modules'),'node_modules'],alias:{'@':path.resolve('src')},extensions:['.js','.jsx']}},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
const tailwind=require('@tailwindcss/postcss'),postcss=createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const from=path.resolve('src/app/globals.css');
const {css}=await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile(from,'utf8'),{from});
const font=await fs.readFile('public/assets/fonts/jakarta/PlusJakartaSans-Variable.woff2');
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_PATH||'/opt/brave-bin/brave',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request',request=>request.respond({status:200,contentType:'text/html',body:'<html><body></body></html>'}));
  await page.goto('http://ui-fixture.test');
  await fs.mkdir('.local/system-components-qa',{recursive:true});
  for(const width of [1440,320]) for(const theme of ['light','dark']) {
    await page.setViewport({width,height:800});
    await page.evaluate(()=>sessionStorage.clear());
    const html=`<html class="${theme}"><head><style>${css}</style><style>@font-face{font-family:UIQA;src:url(data:font/woff2;base64,${font.toString('base64')});font-weight:100 900}html{--font-jakarta:UIQA}</style></head><body><div id="root"></div></body></html>`;
    await page.setContent(html); await page.addScriptTag({path:path.join(temp,'bundle.js')});
    await page.waitForSelector('#program'); await page.evaluate(()=>document.fonts.ready);
    const type=await page.evaluate(()=>({heading:getComputedStyle(document.getElementById('heading')).fontSize,leading:getComputedStyle(document.getElementById('heading')).lineHeight,input:getComputedStyle(document.getElementById('verification')).fontSize,mono:getComputedStyle(document.getElementById('mono')).fontFamily,radius:getComputedStyle(document.querySelector('[data-slot=notice-banner]')).borderRadius}));
    assert.equal(type.heading,'30px'); assert.equal(type.input,'24px'); assert.match(type.mono,/UIQA/); assert.doesNotMatch(type.mono,/monospace/); assert.equal(type.radius,'0px');
    assert.equal(type.leading,'37.5px');
    await page.focus('#program'); await page.keyboard.press('ArrowDown');
    await page.waitForSelector('[role=listbox]');
    await page.keyboard.press('End'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#program').textContent.includes('Charlie'));
    assert.equal(await page.evaluate(()=>new FormData(document.querySelector('#form')).get('program')),'4');
    await page.focus('#program'); await page.keyboard.press('ArrowDown'); await page.waitForSelector('[role=listbox]');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#program',el=>el.textContent.includes('Charlie')),true);
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#program').textContent.includes('Bravo'));
    await page.waitForSelector('[role=listbox]',{hidden:true});
    assert.deepEqual(await page.evaluate(()=>window.changes),[4,3]);
    await page.focus('#program'); await page.keyboard.press('ArrowDown'); await page.waitForSelector('[role=listbox]'); await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.querySelector('#program').getAttribute('aria-expanded')==='false');
    await page.waitForFunction(()=>document.activeElement.id==='program');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'program');
    await page.waitForSelector('[role=listbox]',{hidden:true});
    await page.click('[aria-label="Locked program"]');
    assert.equal(await page.$eval('[aria-label="Locked program"]',el=>el.getAttribute('aria-expanded')),'false');
    await page.click('#program');
    await page.waitForSelector('[role=listbox]',{visible:true});
    await page.keyboard.press('c'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#program').textContent.includes('Charlie'));
    await page.waitForSelector('[role=listbox]',{hidden:true});
    await page.click('[aria-label="Inline program"]'); await page.waitForSelector('[role=listbox]',{visible:true});
    await page.click('#after'); await page.waitForSelector('[role=listbox]',{hidden:true});
    await page.click('[aria-label="Bottom edge"]'); await page.waitForSelector('[role=listbox]');
    const bounds=await page.$eval('[data-slot=select-popup]',el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};});
    assert.ok(bounds.top>=0 && bounds.bottom<=800 && bounds.left>=0 && bounds.right<=width,JSON.stringify(bounds));
    await page.screenshot({path:`.local/system-components-qa/${width}-${theme}.png`});
    await page.keyboard.press('Escape'); await page.click('[aria-label="Dismiss notice"]');
    await page.waitForFunction(()=>!document.querySelector('[data-slot=notice-banner]'));
    assert.equal(await page.$('[data-slot=notice-banner]'),null);
    await page.setContent(html); await page.addScriptTag({path:path.join(temp,'bundle.js')});
    await page.waitForSelector('#program'); await page.waitForFunction(()=>!document.querySelector('[data-slot=notice-banner]'));
    assert.equal(errors.length,0,errors.join('\n'));
    console.log(`PASS ${width}px ${theme}: typography, notice persistence, dropdown keyboard, form value, disabled state and viewport bounds`);
  }
} finally {await browser.close(); await fs.rm(temp,{recursive:true,force:true});}

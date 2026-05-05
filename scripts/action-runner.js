#!/usr/bin/env node
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const {loadActions,getActionById,getActionByCliFlag}=require('./action-registry');
const rootDir=path.resolve(__dirname,'..');
const args=process.argv.slice(2);
const yes=args.includes('--yes');
function val(flag){const i=args.indexOf(flag);return i>=0?args[i+1]:undefined;}
if(args.includes('--list')){console.log(JSON.stringify(loadActions(),null,2));process.exit(0);} 
if(args.includes('--group')){const g=val('--group');console.log(JSON.stringify(loadActions().filter(a=>a.group===g),null,2));process.exit(0);} 
let action;
if(args.includes('--id')) action=getActionById(val('--id'));
else if(args.includes('--cli')) action=getActionByCliFlag(val('--cli'));
if(!action){console.error('[error] Action not found.');process.exit(1);} 
if(action.kind==='planned'||action.planned){console.log(`[planned] ${action.description||`${action.label} is not implemented in this phase.`}`);process.exit(0);} 
if(action.dangerous&&!yes){console.error(`[error] Action requires confirmation: ${action.label}`);console.error('[info] Re-run with --yes after confirming intent.');process.exit(1);} 
const r=spawnSync(action.command,action.args||[],{cwd:rootDir,stdio:"inherit",env:process.env,shell:false});
if (r.error) {
  console.error("[error] Failed to start process: " + r.error.message);
  process.exit(1);
}
process.exit(r.status??1);

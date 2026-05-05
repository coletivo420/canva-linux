const fs = require('node:fs');
const path = require('node:path');
const rootDir = path.resolve(__dirname, '..');
const actionsFile = path.join(rootDir, 'scripts/actions.json');
function loadActions(){ const actions = JSON.parse(fs.readFileSync(actionsFile,'utf8')); validateActions(actions); return actions; }
function validateActions(actions){ if(!Array.isArray(actions)) throw new Error('actions.json must contain an array'); const allowedKinds=new Set(['command','planned','internal']); const ids=new Set(); for(const action of actions){ if(!action.id) throw new Error('Action missing id'); if(ids.has(action.id)) throw new Error(`Duplicate action id: ${action.id}`); ids.add(action.id); if(!action.label) throw new Error(`Action missing label: ${action.id}`); if(!action.group) throw new Error(`Action missing group: ${action.id}`); if(!action.section) throw new Error(`Action missing section: ${action.id}`); if(!action.kind) throw new Error(`Action missing kind: ${action.id}`); if(!allowedKinds.has(action.kind)) throw new Error(`Unsupported action kind: ${action.id} -> ${action.kind}`); if(action.kind==='command'){ if(!action.command) throw new Error(`Command action missing command: ${action.id}`); if(!Array.isArray(action.args)) throw new Error(`Command action args must be an array: ${action.id}`);} }}
const getActionsByGroup=(group)=>loadActions().filter((a)=>a.group===group);
const getActionById=(id)=>loadActions().find((a)=>a.id===id);
const getActionByCliFlag=(flag)=>loadActions().find((a)=>Array.isArray(a.cli)&&a.cli.includes(flag));
module.exports={loadActions,validateActions,getActionsByGroup,getActionById,getActionByCliFlag};

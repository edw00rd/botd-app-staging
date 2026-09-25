import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';

const mode=process.argv[2];
if(!['staging','production'].includes(mode)||process.argv.length!==3) throw new Error('Choose npm run deploy:staging or deploy:production explicitly. For builds use npm run build:staging or build:production.');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain')) throw new Error('Commit the reviewed source and keep the working tree clean before deployment.');
const commit=git('rev-parse','HEAD');
const sourceTree=git('rev-parse','HEAD^{tree}');
for(const line of fs.readFileSync('SHA256SUMS.txt','utf8').trim().split('\n')) {
 const match=line.match(/^([a-f0-9]{64})  (.+)$/);if(!match)throw new Error('Invalid source manifest');
 const actual=crypto.createHash('sha256').update(fs.readFileSync(match[2])).digest('hex');
 if(actual!==match[1])throw new Error(`Source checksum mismatch: ${match[2]}`);
}
let approvedStagingCommit='';
if(mode==='production') {
 approvedStagingCommit=String(process.env.BOTD_APPROVED_STAGING_COMMIT||'').trim();
 if(!/^[a-f0-9]{40}$/.test(approvedStagingCommit)) throw new Error('Production requires BOTD_APPROVED_STAGING_COMMIT to be the full accepted staging commit.');
 let approvedTree='';
 try{approvedTree=git('rev-parse',`${approvedStagingCommit}^{tree}`)}catch{throw new Error('The approved staging commit is not present in this Git repository. Import the validated staging history before production deployment.');}
 if(approvedTree!==sourceTree) throw new Error('Production source tree does not exactly match BOTD_APPROVED_STAGING_COMMIT.');
}
execFileSync('npm',['run','check'],{stdio:'inherit'});
execFileSync('node_modules/.bin/wrangler',['deploy','--config',mode==='staging'?'wrangler.jsonc':'wrangler.production.jsonc'],{stdio:'inherit'});
console.log(`Record ${mode} deployed source commit: ${commit}; source tree: ${sourceTree};${approvedStagingCommit?` approved staging commit: ${approvedStagingCommit};`:''} retain the Worker deployment/version ID printed above.`);

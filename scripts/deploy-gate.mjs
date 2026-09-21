import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
const mode=process.argv[2];
if(!['staging','production'].includes(mode)||process.argv.length!==3) throw new Error('Choose npm run deploy:staging or deploy:production explicitly. For builds use npm run build:staging or build:production.');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain')) throw new Error('Commit the reviewed source and keep the working tree clean before deployment.');
const commit=git('rev-parse','HEAD');
for(const line of fs.readFileSync('SHA256SUMS.txt','utf8').trim().split('\n')) {
 const match=line.match(/^([a-f0-9]{64})  (.+)$/);if(!match)throw new Error('Invalid source manifest');
 const actual=crypto.createHash('sha256').update(fs.readFileSync(match[2])).digest('hex');
 if(actual!==match[1])throw new Error(`Source checksum mismatch: ${match[2]}`);
}
if(mode==='production' && process.env.BOTD_APPROVED_STAGING_COMMIT!==commit) throw new Error('Production requires BOTD_APPROVED_STAGING_COMMIT to equal this exact Git revision after staging acceptance and explicit release approval.');
execFileSync('npm',['run','check'],{stdio:'inherit'});
execFileSync('node_modules/.bin/wrangler',['deploy','--config',mode==='staging'?'wrangler.jsonc':'wrangler.production.jsonc'],{stdio:'inherit'});
console.log(`Record ${mode} deployed source commit: ${commit}; retain the Worker deployment/version ID printed above.`);

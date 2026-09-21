#!/usr/bin/env python3
"""Run from the staging repository. Default: inspect only. --apply: local changes only."""
import hashlib, pathlib, subprocess, sys, shutil
stage=pathlib.Path(__file__).resolve().parents[1]
def git(*args): return subprocess.check_output(['git',*args],text=True).strip()
root=pathlib.Path(git('rev-parse','--show-toplevel')).resolve()
expected='73fe965fce3ff16cef512f6568288504f50ded29'
if pathlib.Path.cwd().resolve()!=root: raise SystemExit('Run from staging repository root.')
if stage==root or root in stage.parents: raise SystemExit('Extract the package outside the repository, such as /tmp.')
if git('rev-parse','HEAD')!=expected: raise SystemExit('STOP: staging baseline changed; reconcile before applying.')
if git('status','--porcelain'): raise SystemExit('STOP: working tree must be clean; move uploaded ZIP out first.')
remote=git('remote','get-url','origin')
if remote not in ['https://github.com/edw00rd/botd-app-staging','https://github.com/edw00rd/botd-app-staging.git','git@github.com:edw00rd/botd-app-staging.git']: raise SystemExit('STOP: not the confirmed staging repository.')
tracked=set(git('ls-files','-z').split('\0'));tracked.discard('')
files={}
for line in (stage/'SHA256SUMS.txt').read_text().splitlines():
 digest,name=line.split('  ',1);p=pathlib.PurePosixPath(name)
 if p.is_absolute() or '..' in p.parts: raise SystemExit('Unsafe manifest path')
 src=stage/name
 if src.is_symlink() or hashlib.sha256(src.read_bytes()).hexdigest()!=digest: raise SystemExit('Checksum failure: '+name)
 files[name]=src
files['SHA256SUMS.txt']=stage/'SHA256SUMS.txt'
for name in files:
 dest=root/name
 if any(x.is_symlink() for x in [dest,*dest.parents]): raise SystemExit('Refusing symlink destination: '+name)
 if dest.exists() and name not in tracked: raise SystemExit('Refusing to overwrite untracked local path: '+name)
removed=sorted(tracked-set(files))
allowed={'docs/V6.8_RELEASE_README.txt','supabase/01_schema.sql','supabase/02_staging_safety.sql','supabase/03_verify.sql','supabase/04_subscription_state_ordering.sql'}
if set(removed)-allowed: raise SystemExit('Unexpected tracked removal: '+repr(removed))
for name in removed: print('REMOVE tracked file:',name)
for name,src in sorted(files.items()):
 dst=root/name
 if not dst.exists() or dst.read_bytes()!=src.read_bytes(): print('UPDATE' if dst.exists() else 'ADD',name)
if sys.argv[1:]!=['--apply']:
 if sys.argv[1:]: raise SystemExit('Only --apply is supported')
 print('Dry run only. No changes made.');raise SystemExit()
branch='release/v6.8.1-staging-gate-rc1';tag='rollback/staging-pre-v6.8.1-'+expected[:12]
if subprocess.run(['git','show-ref','--verify','--quiet','refs/heads/'+branch]).returncode==0: raise SystemExit('Release branch already exists; inspect it first.')
if subprocess.run(['git','show-ref','--verify','--quiet','refs/tags/'+tag]).returncode==0:
 if git('rev-list','-n','1',tag)!=expected: raise SystemExit('Rollback tag does not match baseline')
else: subprocess.check_call(['git','tag','-a',tag,'-m','Staging baseline before 6.8.1 shared release candidate',expected])
subprocess.check_call(['git','switch','-c',branch])
for name in removed: (root/name).unlink()
for name,src in files.items():
 dst=root/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst)
print('Applied locally. No commit, push or deployment performed. Rollback tag:',tag)

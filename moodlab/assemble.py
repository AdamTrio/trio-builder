import base64, json, pathlib
t=pathlib.Path('template.html').read_text()
three=pathlib.Path('../src/lib/three.min.js').read_text()
assert '</script' not in three
tex={}
for f in sorted(pathlib.Path('tex').glob('*.jpg')):
    tex[f.stem]='data:image/jpeg;base64,'+base64.b64encode(f.read_bytes()).decode()
out=t.replace('__THREE__',three).replace('__TEX__',json.dumps(tex))
pathlib.Path('mood-lab.html').write_text(out)
# a standalone copy for Netlify (full document)
pathlib.Path('site').mkdir(exist_ok=True)
pathlib.Path('site/index.html').write_text('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+out.replace('<style>','<style>',1)+'</html>')
print(len(out)/1e6,'MB')

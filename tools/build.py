#!/usr/bin/env python3
"""Assemble the three builder variants from src/ (replaces the old patch.py).

  python3 tools/build.py            -> dist/eventspace-src-staged.html   (local)
                                       dist/trio-builder-admin.html      (admin)
                                       dist/trio-room-builder.html       (room, public)

The shell is already shape-aware (HEXSHAPE / HEXCORE.makeRoom), so a variant is
only: title, splash-logo alt, the builder flag, and whether the Romy song + logo
bytes are in the file. The public build has them STRIPPED, not hidden.
"""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DIST = ROOT / 'src', ROOT / 'dist'

VARIANTS = {
    'local': dict(out='eventspace-src-staged.html', title='TRIO — DEATH BY ROMY Event Space',
                  alt='Death By Romy', builder='', romy=True),
    'admin': dict(out='trio-builder-admin.html', title='Trio Builder', alt='',
                  builder="<script data-stage>window.HEXBUILDER={space:'admin'};</script>\n", romy=False, mood=True),   # v39: no Romy splash/song — the event page owns both
    'room':  dict(out='trio-room-builder.html', title='Trio Room Builder', alt='',
                  builder="<script data-stage>window.HEXBUILDER={space:'room'};</script>\n", romy=False),
}

def moodtex():
    """v42: the Mood Room's texture library — builder-only (data-stage), a bake carries just what it uses"""
    import json
    tex = {f.stem: 'data:image/jpeg;base64,' + base64.b64encode(f.read_bytes()).decode()
           for f in sorted((SRC / 'assets/mood').glob('*.jpg'))}
    return "<script data-stage>window.HEXMOODTEX=" + json.dumps(tex) + ";</script>\n"

def kittex():
    """v73: the World's Realistic-kit textures (WebP) — builder-only; a baked world carries them only when it uses that kit"""
    import json
    tex = {f.stem: 'data:image/webp;base64,' + base64.b64encode(f.read_bytes()).decode()
           for f in sorted((SRC / 'assets/kit').glob('*.webp'))}
    return "<script data-stage>window.HEXKITTEX=" + json.dumps(tex) + ";</script>\n"

def wkits():
    """v77: outside art-style kits (Coded Kit Spec) — in the admin builder; a baked world carries only the kits it uses"""
    out = ''
    for f in sorted((SRC / 'kits').glob('trio-kit-*.js')):
        slug = f.stem.replace('trio-kit-', '')
        js = f.read_text(encoding='utf-8'); assert '</script' not in js.lower(), f
        out += '<script data-wkit="%s">\n%s</script>\n' % ('cyber' if slug == 'cyber' else slug, js)
    return out

def build(v):
    s = (SRC / 'shell.html').read_text(encoding='utf-8')
    s = re.sub(r'\{\{TRIO:FILE ([^}]+)\}\}',
               lambda m: (SRC / m.group(1)).read_text(encoding='utf-8'), s)
    song = 'data:audio/mpeg;base64,' + base64.b64encode((SRC / 'assets/song.mp3').read_bytes()).decode() \
        if v['romy'] else '@@AUDIO@@'
    logo = base64.b64encode((SRC / 'assets/logo.webp').read_bytes()).decode() if v['romy'] else '@@LOGO@@'
    s = s.replace('{{TRIO:WKITS}}', wkits() if v.get('mood') else '')
    for k, val in (('TITLE', v['title']), ('SLOGO_ALT', v['alt']), ('BUILDER', v['builder'] + (moodtex()+kittex() if v.get('mood') else '')),
                   ('SONG', song), ('LOGO', logo)):
        assert s.count('{{TRIO:%s}}' % k) == 1, k
        s = s.replace('{{TRIO:%s}}' % k, val)
    assert '{{TRIO:' not in s
    if not v['romy']:                       # belt and braces: nothing Romy-sized left in a public file
        assert 'data:audio/mpeg;base64' not in s
    return s

if __name__ == '__main__':
    DIST.mkdir(exist_ok=True)
    for name, v in VARIANTS.items():
        html = build(v)
        (DIST / v['out']).write_text(html, encoding='utf-8')
        print(f'{name:6s} -> dist/{v["out"]:30s} {len(html.encode()):>10,d} bytes')

#!/usr/bin/env python3
"""Carve the v33 admin build back into a source tree.

  src/shell.html          the room shell with {{TRIO:...}} slots
  src/lib/*.js|css        every injected block, one file each
  src/assets/song.mp3     the Romy track (decoded from the data URL)
  src/assets/logo.webp    the Romy splash logo
"""
import base64, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
admin = (ROOT / sys.argv[1]).read_text(encoding='utf-8') if len(sys.argv) > 1 else \
        (ROOT / 'ref/trio-builder-admin-v33.html').read_text(encoding='utf-8')

(SRC / 'lib').mkdir(parents=True, exist_ok=True)
(SRC / 'assets').mkdir(parents=True, exist_ok=True)

def cut_once(s, old, new):
    assert s.count(old) == 1, ('not unique', old[:80], s.count(old))
    return s.replace(old, new)

s = admin

# 1. per-variant bits
s = cut_once(s, '<title>Trio Builder</title>', '<title>{{TRIO:TITLE}}</title>')
s = cut_once(s, '<img id="slogo" alt="Death By Romy"', '<img id="slogo" alt="{{TRIO:SLOGO_ALT}}"')
s = cut_once(s, "<script data-stage>window.HEXBUILDER={space:'admin'};</script>\n", '{{TRIO:BUILDER}}')

m = re.search(r'<audio id="track" src="data:audio/mpeg;base64,([A-Za-z0-9+/=]+)"', s)
song = base64.b64decode(m.group(1))
assert base64.b64encode(song).decode() == m.group(1)
(SRC / 'assets/song.mp3').write_bytes(song)
s = s[:m.start(1) - len('data:audio/mpeg;base64,')] + '{{TRIO:SONG}}' + s[m.end(1):]

m = re.search(r"  logo:'data:image/webp;base64,([A-Za-z0-9+/=]+)' \};", s)
logo = base64.b64decode(m.group(1))
assert base64.b64encode(logo).decode() == m.group(1)
(SRC / 'assets/logo.webp').write_bytes(logo)
s = s[:m.start(1)] + '{{TRIO:LOGO}}' + s[m.end(1):]

# 2. injected blocks, in file order
BLOCKS = [
    ('<script>\nconsole.warn( \'Scripts "build/three.js"', 'lib/three.min.js'),
    ('<style data-hexlib>\n', 'lib/nav.css'),
    ('<script data-hexlib>\n/* GLTFLoader', 'lib/gltfloader-classic.js'),
    ('<script data-hexlib>\n', 'lib/hexcore.js'),
    ('<script data-hexlib>\n', 'lib/hexfx.js'),
    ('<script data-stage>\n/* meshoptimizer', 'lib/meshopt-simplifier-classic.js'),
    ('<style data-stage>\n', 'lib/stage.css'),
    ('<script data-stage>\n', 'lib/stage.js'),
]
pos = 0
for opener, name in BLOCKS:
    i = s.index(opener, pos)
    tag_end = s.index('\n', i) + 1              # content starts on the next line
    close = '</style>' if opener.startswith('<style') else '</script>'
    j = s.index(close, tag_end)
    (SRC / name).write_text(s[tag_end:j], encoding='utf-8')
    slot = '{{TRIO:FILE %s}}' % name
    s = s[:tag_end] + slot + s[j:]
    pos = tag_end + len(slot)

(SRC / 'shell.html').write_text(s, encoding='utf-8')
print('shell.html', len(s), 'bytes')
for p in sorted((SRC / 'lib').iterdir()):
    print(f'  {p.name:36s} {p.stat().st_size:>9,d} bytes  {p.read_text().count(chr(10)):>5d} lines')
print('  song.mp3', len(song), ' logo.webp', len(logo))

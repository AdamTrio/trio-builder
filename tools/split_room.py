#!/usr/bin/env python3
"""Turn a published room (one big .html) into a hostable folder:

    room/index.html        the room, media pulled out  (target: under 5 MB)
    room/media/clip-N.mp4  every clip that was dropped in, as its own file
    room/media/song.xxx    the room song, as its own file

  python3 tools/split_room.py the27s.html out/the27s

Nothing about the room changes except WHERE its clips and song live: a baked data: URL
becomes a relative ./media/ path the browser streams and caches. Clips stay muted loops.
"""
import base64, json, pathlib, re, sys

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
html = src.read_text(encoding='utf-8')
(out / 'media').mkdir(parents=True, exist_ok=True)

m = re.search(r'window\.HEXBAKE=(\{.*?\});</script>', html, re.S)
bake = json.loads(m.group(1).replace('\\u003c', '<'))
EXT = {'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'audio/mpeg': 'mp3',
       'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'm4a', 'audio/wav': 'wav', 'audio/ogg': 'ogg'}
written = []

def dump(data_url, stem):
    head, b64 = data_url.split(',', 1)
    mime = head[5:].split(';')[0]
    name = f'{stem}.{EXT.get(mime, "bin")}'
    (out / 'media' / name).write_bytes(base64.b64decode(b64))
    written.append((name, (out / 'media' / name).stat().st_size))
    return 'media/' + name

# video tiles: an asset that is a data:video → the tile plays a URL instead
n = 0
for kind, rack in (bake.get('racks') or {}).items():
    for t in rack.get('tiles') or []:
        a = t.get('asset')
        if a and str((bake.get('assets') or {}).get(a, '')).startswith('data:video'):
            n += 1
            t['url'] = dump(bake['assets'][a], f'clip-{n}')
            t['asset'] = None
# the game screen, when it's a video loop
G = (bake.get('boards') or {}).get('game') or {}
if G.get('screen') and str((bake.get('assets') or {}).get(G['screen'], '')).startswith('data:video'):
    bake['assets'][G['screen']] = dump(bake['assets'][G['screen']], 'screen')
    G['screenKind'] = 'video'
# video walls / banners / floor
for sid, v in (bake.get('videos') or {}).items():
    if str(v.get('src', '')).startswith('data:video'):
        v['src'] = dump(v['src'], 'wall-' + re.sub(r'[^a-z0-9]', '', sid.lower()))
# set backgrounds that loop (windows & sets)
nv = 0
for st in bake.get('sets') or []:
    for k in ('floor', 'middle', 'back'):
        aid = (st.get(k) or {}).get('asset')
        if aid and str((bake.get('assets') or {}).get(aid, '')).startswith('data:video'):
            nv += 1
            bake['assets'][aid] = dump(bake['assets'][aid], f'set-video-{nv}')
    eggs = [M.get('egg') for M in st.get('models') or []] + [P.get('egg') for P in st.get('spots') or []]
    for E in eggs:
        for b in (E or {}).get('blocks') or []:
            aid = b.get('asset')
            if aid and str((bake.get('assets') or {}).get(aid, '')).startswith('data:video'):
                nv += 1
                bake['assets'][aid] = dump(bake['assets'][aid], f'egg-clip-{nv}')
# Easter egg clips on room props
for pr in bake.get('props') or []:
    for b in ((pr.get('egg') or {}).get('blocks') or []):
        aid = b.get('asset')
        if aid and str((bake.get('assets') or {}).get(aid, '')).startswith('data:video'):
            nv += 1
            bake['assets'][aid] = dump(bake['assets'][aid], f'egg-clip-{nv}')
# wall art / banners / floor images, big photo tiles and models → files too (small things stay inline)
BIG = 100 * 1024
EXT.update({'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'model/gltf-binary': 'glb'})
for sid, v in list((bake.get('surfaces') or {}).items()):
    if isinstance(v, str) and v.startswith('data:image') and len(v) > BIG:
        bake['surfaces'][sid] = dump(v, 'surface-' + re.sub(r'[^a-z0-9]', '', sid.lower()))
nm = 0
for k, v in list((bake.get('assets') or {}).items()):
    if isinstance(v, str) and (v.startswith('data:model') or (v.startswith('data:image') and len(v) > BIG)):
        nm += 1
        bake['assets'][k] = dump(v, ('model-' if v.startswith('data:model') else 'image-') + str(nm))
# drop assets nothing points at any more
used = set()
for rack in (bake.get('racks') or {}).values():
    used |= {t.get('asset') for t in rack.get('tiles') or [] if t.get('asset')}
used |= {p.get('asset') for p in bake.get('props') or [] if p.get('asset')}
used |= {v for v in (bake.get('surfaces') or {}).values() if isinstance(v, str)}
for k in list((bake.get('assets') or {}).keys()):
    if k not in used and str(bake['assets'][k]).startswith('data:video'):
        del bake['assets'][k]
# the song: a surface or the <audio> built-in
song = (bake.get('surfaces') or {}).get('song')
if isinstance(song, str) and song.startswith('data:audio'):
    bake['surfaces']['song'] = dump(song, 'song')
new_bake = json.dumps(bake, separators=(',', ':')).replace('<', '\\u003c')
html = html[:m.start(1)] + new_bake + html[m.end(1):]
am = re.search(r'(<audio id="track" src=")(data:audio[^"]+)(")', html)
if am:
    rel = dump(am.group(2), 'song-builtin')   # only there when no room song was set
    html = html[:am.start(2)] + rel + html[am.end(2):]

(out / 'index.html').write_text(html, encoding='utf-8')
size = (out / 'index.html').stat().st_size
print(f'index.html  {size/1048576:.2f} MB' + ('' if size < 5 * 1048576 else '   ⚠ over 5 MB'))
for name, sz in written:
    print(f'media/{name:24s} {sz/1048576:.2f} MB')
print(f'folder total {sum(s for _, s in written)/1048576 + size/1048576:.2f} MB')

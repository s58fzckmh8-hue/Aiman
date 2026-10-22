"""Reproduce the four pinned CC0 civilian GLBs. Python 3 stdlib; verified HTTPS/checksums."""
from pathlib import Path
import hashlib
import json
import struct
import urllib.request
ASSETS = Path(__file__).resolve().parents[1] / 'public' / 'assets'

def repack(data):
    assert data[:4] == b'glTF'
    n = struct.unpack('<I', data[12:16])[0]
    doc = json.loads(data[20:20 + n])
    binary = data[28 + n:]
    doc['animations'] = [a for a in doc.get('animations', []) if a.get('name') in ['Idle', 'Idle_Neutral', 'Walk', 'Run', 'Interact']]
    refs = []
    for mesh in doc.get('meshes', []):
        for p in mesh['primitives']:
            for k, v in p['attributes'].items():
                refs.append((p['attributes'], k))
            if 'indices' in p:
                refs.append((p, 'indices'))
            for t in p.get('targets', []):
                refs.extend(((t, k) for k in t))
    for s in doc.get('skins', []):
        if 'inverseBindMatrices' in s:
            refs.append((s, 'inverseBindMatrices'))
    for a in doc['animations']:
        for s in a['samplers']:
            refs.extend([(s, 'input'), (s, 'output')])
    used = sorted({o[k] for o, k in refs})
    mapping = {old: new for new, old in enumerate(used)}
    doc['accessors'] = [doc['accessors'][i] for i in used]
    for o, k in refs:
        o[k] = mapping[o[k]]
    viewrefs = []
    for a in doc['accessors']:
        if 'bufferView' in a:
            viewrefs.append((a, 'bufferView'))
        for v in a.get('sparse', {}).values():
            if isinstance(v, dict) and 'bufferView' in v:
                viewrefs.append((v, 'bufferView'))
    for im in doc.get('images', []):
        if 'bufferView' in im:
            viewrefs.append((im, 'bufferView'))
    used = sorted({o[k] for o, k in viewrefs})
    mapping = {old: new for new, old in enumerate(used)}
    newbin = bytearray()
    views = []
    for i in used:
        v = dict(doc['bufferViews'][i])
        assert v.get('buffer', 0) == 0
        while len(newbin) % 4:
            newbin.append(0)
        start = v.get('byteOffset', 0)
        offset = len(newbin)
        newbin.extend(binary[start:start + v['byteLength']])
        v['byteOffset'] = offset
        views.append(v)
    for o, k in viewrefs:
        o[k] = mapping[o[k]]
    doc['bufferViews'] = views
    doc['buffers'] = [{'byteLength': len(newbin)}]
    while len(newbin) % 4:
        newbin.append(0)
    js = json.dumps(doc, separators=(',', ':')).encode()
    while len(js) % 4:
        js += b' '
    result = struct.pack('<4sII', b'glTF', 2, 28 + len(js) + len(newbin)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(newbin), b'BIN\x00') + newbin
    return bytes(result)

def main():
    manifest = json.loads((ASSETS / 'manifest.json').read_text())
    for item in manifest:
        if not item['file'].startswith('npc_'):
            continue
        with urllib.request.urlopen(item['url'], timeout=30) as response:
            source = response.read(8000001)
        assert len(source) <= 8000000, 'Unexpected source size'
        assert hashlib.sha256(source).hexdigest() == item['sourceSha256'], 'Source integrity mismatch'
        packed = repack(source)
        assert hashlib.sha256(packed).hexdigest() == item['sha256'], 'Processed integrity mismatch'
        assert len(packed) == item['bytes']
        destination = ASSETS / item['file']
        if not destination.exists() or destination.read_bytes() != packed:
            destination.write_bytes(packed)
        print(item['file'], len(packed), 'verified')
if __name__ == '__main__':
    main()

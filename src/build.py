import json
s=open('src/app.html').read()
s=s.replace('__ICONS__', json.dumps(json.load(open('icons.json'))))
s=s.replace('__RESPUESTAS__', json.dumps(json.load(open('respuestas.json')),ensure_ascii=False))
open('dist/index.html','w').write(s)
print('ok', len(s))

from pathlib import Path
path = Path('src/app/dashboard/account/exports/page.tsx')
text = path.read_text(encoding='utf-8')
old = '            {!selection?.orgId ? (\n              <p className="text-sm text-slate-500 dark:text-slate-400">\n                Selecciona una organizaciИn para solicitar o revisar exportaciones.\n              </p>\n            ) : '
if old not in text:
    raise SystemExit('message block not found')
new = '            {!targetOrgId ? (\n              <p className="text-sm text-slate-500 dark:text-slate-400">\n                {isGlobalSuperAdmin\n                  ? "Selecciona una organizaciИn del panel superior para solicitar o revisar exportaciones."\n                  : "Selecciona una organizaciИn para solicitar o revisar exportaciones."}\n              </p>\n            ) : '
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')

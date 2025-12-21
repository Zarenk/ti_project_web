from pathlib import Path
path = Path('src/app/dashboard/account/exports/page.tsx')
text = path.read_text(encoding='utf-8')
old = '          <CardContent className="space-y-6">\r\n            {!selection?.orgId ? (\r\n              <p className="text-sm text-slate-500 dark:text-slate-400">\r\n                Selecciona una organizaciИn para solicitar o revisar exportaciones.\r\n              </p>\r\n'
if old not in text:
    raise SystemExit('block not found')
new = '          <CardContent className="space-y-6">\r\n            {!targetOrgId ? (\r\n              <p className="text-sm text-slate-500 dark:text-slate-400">\r\n                {isGlobalSuperAdmin\r\n                  ? "Selecciona una organizaciИn del panel superior para solicitar o revisar exportaciones."\r\n                  : "Selecciona una organizaciИn para solicitar o revisar exportaciones."}\r\n              </p>\r\n'
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')

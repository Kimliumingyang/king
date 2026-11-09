from pathlib import Path
import zipfile,shutil,json,html
root=Path(__file__).resolve().parents[1];kit=root/'asset-kit';download=root/'game-assets/downloads';download.mkdir(exist_ok=True)
manifest=json.loads((root/'game-assets/asset-manifest.json').read_text());rows=manifest['assets']
header='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DDTK 美术与音频清单</title><style>body{margin:32px;background:#f0ddc2;color:#37333f;font:15px Arial}h1{color:#75445e}input{padding:12px;width:min(500px,90%);margin-bottom:18px}table{border-collapse:collapse;background:#fff4df}td,th{padding:12px;border:1px solid #cbb4a4;text-align:left;max-width:430px;word-break:break-word}th{background:#75445e;color:white}code{font-size:12px}</style>'
body='<h1>Don\'t Drop the King! 美术 / 动效 / 音频清单</h1><p>111 项 · v0.6.0 · 英文 ID 与路径按表格命名；最终原画/音频待交付。</p><p><a href="DDTK_Art_Audio_Kit_v0.6.0.zip" download>下载完整 ZIP</a> · <a href="DDTK_Art_Audio_List_v0.6.0.xlsx" download>下载 Excel</a> · <a href="DDTK_Art_Audio_List_v0.6.0.csv" download>下载 CSV</a></p><input placeholder="搜索国王 / 背景 / 音效 / 文件 ID…" aria-label="搜索资源" oninput="document.querySelectorAll(\'tbody tr\').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(this.value.toLowerCase()))"><table><thead><tr><th>ID / 名称</th><th>文件位置</th><th>尺寸 / 动效</th><th>使用位置与要求</th></tr></thead><tbody>'
for r in rows:body+='<tr><td><b>'+html.escape(r['name_cn'])+'</b><br><code>'+r['id']+'</code></td><td><code>game-assets/'+r['path']+'</code></td><td>'+str(r['width'])+'×'+str(r['height'])+' / '+str(r['frames'])+' 帧 / '+str(r['fps'])+'fps<br>'+r['priority']+'</td><td>'+html.escape(r['where']+'；'+r['animation'])+'</td></tr>'
(download/'index.html').write_text('<!doctype html>'+header+body+'</tbody></table>')
for ext in ['xlsx','csv']:shutil.copyfile(kit/f'DDTK_美术音频总清单.{ext}',download/f'DDTK_Art_Audio_List_v0.6.0.{ext}')
with zipfile.ZipFile(download/'DDTK_Art_Audio_Kit_v0.6.0.zip','w',zipfile.ZIP_DEFLATED) as z:
 for path in sorted(kit.rglob('*')):
  if path.is_file():z.write(path,Path('DDTK_Art_Audio_Kit_v0.6.0')/path.relative_to(kit))
 z.write(root/'design-spec/reference/APPROVED_GAMEPLAY_STYLE.png','DDTK_Art_Audio_Kit_v0.6.0/reference/APPROVED_GAMEPLAY_STYLE.png')
print('Packaged',len(rows),'asset rows:',(download/'DDTK_Art_Audio_Kit_v0.6.0.zip').stat().st_size,'bytes')

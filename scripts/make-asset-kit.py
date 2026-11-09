"""Generate the artist handoff and runtime replacement manifest from one catalog."""
import json,csv,io,zipfile,html
from pathlib import Path
root=Path(__file__).resolve().parents[1];out=root/'asset-kit';out.mkdir(exist_ok=True);rows=[]
previous_file=root/'game-assets/asset-manifest.json'
previous={a['id']:a for a in json.loads(previous_file.read_text()).get('assets',[])} if previous_file.exists() else {}
def add(id,cn,kind,path,w=0,h=0,frames=1,fps=0,loop=False,where='',action='',priority='P1'):
 rows.append(dict(id=id,name_cn=cn,kind=kind,path='assets/'+path,width=w,height=h,frames=frames,fps=fps,loop=loop,where=where,animation=action,priority=priority,enabled=False,status='待用户美术/音频，当前内置样稿或合成声音'))
worlds=[('foothills','皇家丘陵','L01–L05'),('wastes','摇晃荒原','L06–L10'),('citadel','月光城堡','L11–L15')]
for key,cn,levels in worlds:
 for layer,desc in [('far','天空、星球、云、远山'),('mid','蘑菇林/岩柱/城堡剪影'),('foreground','底部岩石和植物，画面上方透明')]:
  add('bg_'+key+'_'+layer,cn+'·'+desc,'background',f'backgrounds/bg_{key}_{layer}.png',2560,1440,where=levels+'；'+layer+' 视差层',action='背景可无缝横向平铺，远景 0.12、中景 0.35、前景 0.7',priority='P0')
for state,cn,n,fps,loop in [('idle','傲慢待机/呼吸/眨眼',6,6,True),('warn','失衡惊觉/扶王冠',6,8,True),('slide','滑动/挥手求稳',6,10,True),('airborne','被抛出/慌张翻滚',6,10,True),('rescue','磁吸回船',6,8,True),('victory','到达王座/得意',6,6,True),('hiccup','打嗝/酒杯震动',8,10,False),('sneeze','喷嚏/纸巾飞走',8,10,False),('nap','打盹/垂头',8,8,True),('toast','举杯/洒酒到披风',8,10,False),('scepter','挥权杖',8,10,False),('hurry','张口催促',8,10,False)]:
 add('king_'+state,'国王·'+cn,'sheet',f'characters/king/king_{state}.png',360,380,n,fps,loop,where='所有关卡；'+state,action='需要动效；单行横排，360×380/帧；不要把皇冠画入身体',priority='P0')
for state,cn in [('idle','佩戴'),('loose','歪斜预警'),('fall','先于国王飞落')]:add('crown_'+state,'王冠·'+cn,'sheet',f'characters/crown/crown_{state}.png',160,116,6,10,True,where='国王头顶/倾角危险/掉落弹跳',action='需要动效；代码控制平移旋转弹道；皇冠独立分件',priority='P0')
for who,cn in [('left','左士兵'),('right','右士兵')]:
 for state,label in [('idle','操作/眨眼'),('panic','流汗/惊恐'),('cheer','到达欢呼')]:add('guard_'+who+'_'+state,cn+'·'+label,'sheet',f'characters/guards/guard_{who}_{state}.png',180,264,6,8,True,where='UFO '+who+' 侧；每名两根长触角',action='需要动效；仅视觉附着，不增加主质量',priority='P0')
for id,cn,w,h,n,where in [('ufo_idle','UFO·普通悬浮',520,144,6,'所有关卡；主体'),('ufo_boost','UFO·增强喷口',520,144,6,'按住 Boost'),('rescue_craft','救援小飞碟/磁铁',240,160,8,'Royal Rescue 的 1 秒演出'),('throne_idle','皇家王座',360,440,1,'每关终点；不参与碰撞'),('checkpoint_idle','检查点旗/灯',128,256,6,'每关自动检查点；点亮状态'),('coin_idle','金币旋转',64,64,8,'实际拾取点'),('fx_warning','危险感叹号',128,128,6,'失衡、事件预警'),('fx_sweat','士兵汗滴',96,96,6,'急刹/危险'),('fx_wine','酒滴',96,96,8,'举杯事件/颠簸'),('fx_tissue','纸巾',128,128,8,'喷嚏事件'),('fx_sleep','Zzz',128,128,6,'打盹事件'),('fx_dust','灰尘/着陆',160,128,8,'实际接触地面/失控落地'),('fx_magnet','救援磁力束',256,512,8,'复活磁吸'),('fx_dock','停靠光环',256,128,8,'停稳进度'),('fx_spark','脉冲火花',128,128,8,'磁力脉冲预警/发动')]:
 add(id,cn,'sheet' if n>1 else 'image',f'props/{id}.png',w,h,n,10 if n>1 else 0,n>1,where, '需要动效' if n>1 else '静态',priority='P1')
for id,cn,w,h in [('rock','无缝岩壁',512,512),('grass','连续草边',512,96),('gap_marker','断崖警示旗',128,160),('roof','限高顶棚',600,100),('seesaw','跷跷板/轴分件',360,80),('platform','移动平台',400,96),('bridge','破桥单节',256,96),('spring','弹跳蘑菇',256,192),('magnet','磁场发生器',192,256),('wind','风区飘带',256,128)]:
 add('terrain_'+id,'地形·'+cn,'image',f'terrain/terrain_{id}.png',w,h,where='所有主题复用；实际碰撞地形位置',action='结构静态；移动/倒塌/反弹由代码控制；岩壁、草边按地形轮廓裁切',priority='P1')
for id,cn,w,h in [('logo','游戏标题',800,360),('panel','奶油纸质面板',640,640),('button_primary','酒红主按钮',600,120),('button_secondary','奶油次按钮',600,120),('button_disabled','禁用按钮',600,120),('icon_menu','菜单',96,96),('icon_pause','暂停',96,96),('icon_restart','重开',96,96),('icon_sound_on','声音开启',96,96),('icon_sound_off','静音',96,96),('icon_lock','锁定',96,96),('icon_star','星级',96,96),('icon_coin','金币',96,96),('icon_engine','发动机升级',96,96),('icon_stabilizer','稳定升级',96,96),('icon_grip','摩擦升级',96,96),('icon_battery','电池升级',96,96),('icon_rescue','救援升级',96,96),('key_left','左移/刹车',128,128),('key_right','右移',128,128),('key_boost','Boost',256,128)]:
 add('ui_'+id,'UI·'+cn,'ui',f'ui/ui_{id}.png',w,h,where='首页、HUD、弹窗、车库、任务、选关；按对应 ID',action='静态；按钮状态图不要烘焙英文文字；面板可九宫格，提供切片边距',priority='P2')
for id,cn,where,loop,desc in [('bgm_menu','皇家候机大厅','首页、选关、车库、任务',True,'60–90 秒；轻木管/拨弦/小型太空宫廷圆舞曲'),('bgm_foothills','皇家丘陵之旅','L01–L05',True,'60–90 秒；轻快但不催促，低密度留警报频段'),('bgm_wastes','摇晃荒原之旅','L06–L10',True,'60–90 秒；怪诞弹拨/低音节奏'),('bgm_citadel','月光城堡之旅','L11–L15',True,'60–90 秒；月夜钟琴/克制管弦'),('amb_foothills','丘陵空气','L01–L05，低音量环境循环',True,'20–40 秒，无缝；风/外星鸟鸣'),('amb_wastes','荒原空气','L06–L10',True,'20–40 秒；低风/远处石声'),('amb_citadel','城堡空气','L11–L15',True,'20–40 秒；月夜风/远处钟声')]:
 add(id,cn,'audio',f'audio/{id}.mp3',loop=loop,where=where,action=desc+'；不要人声，暂停/后台停止；救援/失败/结算压低音乐',priority='P1')
sfx=[('ui_click','UI 确认','点击主按钮'),('ui_back','返回','Back/Cancel'),('ui_denied','操作不可用','金币不足/保存失败；禁用按钮不发声'),('hover_loop','悬浮引擎','正常游玩，随速度轻微变化，循环'),('boost_loop','Hover Boost','Boost 且仍有能量，循环，松手/暂停停止'),('warning','危险预警','进入 DANGER/事件预警，限频'),('slide','国王摩擦滑动','国王相对甲板速度明显，限频'),('crown_drop','王冠脱落','皇冠第一次脱落，先于国王失败'),('crown_hit','王冠落地','皇冠首次触地'),('eject','国王飞出','KING_EJECTED 进入，喜剧 whoosh'),('fail','护送失败','失败菜单出现一次'),('rescue','皇家磁吸救援','救援开始，约 1 秒'),('checkpoint','检查点','第一次激活检查点'),('pickup','拾取金币','新 pickup ID 收集一次'),('dock','停靠完成','真实停稳 1.5 秒后'),('reward','结算奖励','结算弹窗首次显示'),('upgrade','升级成功','支付成功一次'),('mission','任务领取','奖励实际到账一次'),('hiccup','皇家打嗝','事件发动，短而不恶心'),('sneeze','皇家喷嚏','事件发动，纸巾伴奏'),('nap','皇家打盹','事件发动，短打鼾'),('toast','皇家干杯','事件发动，杯碰/酒滴'),('scepter','权杖挥动','事件发动，轻摆风声'),('hurry','国王催促','事件发动，无强制加速；可无语言嘟囔'),('spring','蘑菇弹起','实际蘑菇脉冲触发一次'),('bridge','桥梁坍塌','首节实际倒塌，限频'),('magnet','磁场脉冲','玩家所在磁场实际激活'),('wind','横风阵风','玩家所在风区实际激活')]
for id,cn,where in sfx:add('sfx_'+id,cn,'audio',f'audio/sfx_{id}.mp3',loop=id.endswith('loop'),where=where,action=('无缝 2–4 秒' if id.endswith('loop') else '0.1–1.5 秒；单次，允许 2–3 个变体后续扩展')+'；44.1/48kHz，源 WAV 24bit，交付 MP3 192kbps+可选 OGG；去 DC/首尾爆音，峰值≤-1dBTP',priority='P1')
for row in rows:
 old=previous.get(row['id'],{})
 for key in ['path','enabled','width','height','frames','fps','loop','status']:
  if key in old:row[key]=old[key]
manifest={'schemaVersion':1,'note':'只将已上传且验证通过的资源 enabled 设为 true。图片缺失回退内置 SVG，声音回退合成样稿。所有路径相对构建根目录。','assets':rows}
(root/'game-assets/asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
fields=list(rows[0]);stream=io.StringIO(newline='');writer=csv.DictWriter(stream,fields);writer.writeheader();writer.writerows(rows);(out/'DDTK_美术音频总清单.csv').write_text('\ufeff'+stream.getvalue(),encoding='utf8')
(out/'DDTK_资源接入模板.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
# Minimal standards-compliant XLSX: no third-party dependency needed.
headers={'id':'资源 ID / 英文命名','name_cn':'中文名','kind':'类型','path':'GitHub 文件位置（game-assets/ 内）','width':'单帧宽','height':'单帧高','frames':'帧数','fps':'帧率','loop':'循环','where':'使用位置 / 触发条件','animation':'制作与动效要求','priority':'优先级','enabled':'已接入开关','status':'进度'}
def col(n):
 s=''
 while n:n,r=divmod(n-1,26);s=chr(65+r)+s
 return s
cells=[]
for y,r in enumerate([headers]+rows,1):
 line=[]
 for x,k in enumerate(fields,1):line.append(f'<c r="{col(x)}{y}" s="{2 if y==1 else 1}" t="inlineStr"><is><t xml:space="preserve">{html.escape(str(r[k]))}</t></is></c>')
 cells.append(f'<row r="{y}" ht="{32 if y==1 else 78}" customHeight="1">{"".join(line)}</row>')
with zipfile.ZipFile(out/'DDTK_美术音频总清单.xlsx','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
 z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
 z.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="美术音频总清单" sheetId="1" r:id="rId1"/></sheets></workbook>')
 z.writestr('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
 z.writestr('xl/styles.xml','<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFF0DDC2"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF75445E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')
 z.writestr('xl/worksheets/sheet1.xml',f'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="4" width="32" customWidth="1"/><col min="5" max="9" width="10" customWidth="1"/><col min="10" max="11" width="70" customWidth="1"/><col min="12" max="14" width="24" customWidth="1"/></cols><sheetData>{"".join(cells)}</sheetData><autoFilter ref="A1:N{len(rows)+1}"/></worksheet>')
print(f'Generated {len(rows)} art/audio asset rows')

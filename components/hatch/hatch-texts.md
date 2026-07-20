# 孵化场 文案汇总（供修改）

> 改完告诉我,我会填回 `components/hatch/HatchGame.tsx` 对应位置。
> 每条格式:`键名` | 中文 | English。直接改中英文两栏即可,键名别动。

## 标题与开场

| 键名 | 中文 | English |
|---|---|---|
| title | R公司孵化场实况 | R Corp HATCHERY |
| subtitle | 保证存活 | R Corp. · Clone yourself out of the clones |
| pickFaction | （这句不要） |
| rabbitName | 高兴的兔子 | Rabbit |
| reindeerName | 不太高兴的驯鹿 | Reindeer |
| rabbitDesc | 靠近敌人自动匕首攻击，命中后短暂加速。鼠标点击/摇杆：快速压制。去痛快地撕咬鲜草吧！| Fast & fragile. Auto: dagger (hits grant a burst of speed). Click: aimed gunshot — limited magazine, bullets refill over time. Eats its own dead without a second tought. |
| reindeerDesc | 自动发动追踪敌人的能量轰击。鼠标点击/摇杆：精神鞭挞。难以忍受，一直都是…… | Slow & sturdy. Auto: psychic filaments. Click: great lightning that seeks several foes in your aim — casting it hurts your own mind. May refuse to eat itself: hesitant, half heal, 1.5x XP. |
| hint | WASD/方向键移动 · 鼠标/摇杆释放技能 · 吞噬尸体增强 | WASD / Arrows move · Auto weapon fires itself · Click to use your skill · HP drains constantly — only corpses restore it |

## HUD

| 键名 | 中文 | English |
|---|---|---|
| day | 第（"第N天/7"的前缀） | Day |
| kills | 击杀 | Kills |
| body | 第（"第N具"的前缀） | Body |
| left | 剩余 | Left |
| serial | 编号 | No. |
| reaping | 回收执行中 | DISPOSAL IN PROGRESS |

## 升级界面

| 键名 | 中文 | English |
|---|---|---|
| levelup | 猎 取 | GROWTH |
| rarityFine | 优越 | FINE |
| rarityAnom | 异常 | ANOMALOUS |

### 武器升级线（数组第1项=武器名，第2~5项=升到2~5级时的描述）

| 键名 | 中文 | English |
|---|---|---|
| gun[0] | 枪 | Gun |
| gun[1] | 弹匣扩容 | Bigger magazine |
| gun[2] | 快速装填 | Faster reload · pierce |
| gun[3] | 火力集中 | Heavier rounds |
| gun[4] | 歼灭 | Annihilation |
| dagger[0] | 匕首 | Dagger |
| dagger[1] | 迅捷 | Faster slashes |
| dagger[2] | 强壮 | Wider slash |
| dagger[3] | 执念 | Deeper cuts |
| dagger[4] | 撕咬鲜草 | Frenzy |
| bolt[0] | 精神鞭挞 | Great Lightning |
| bolt[1] | 攻击容量 | One more fork |
| bolt[2] | 集束充能 | Longer reach |
| bolt[3] | 心神凝聚 | Deeper paralysis |
| bolt[4] | 滚开！ | Storm |
| psy[0] | 能量轰击 | Psychic Filaments |
| psy[1] | 双重轰击 | Second filament |
| psy[2] | 集束 | Longer reach |
| psy[3] | 凝滞 | Heavier static |
| psy[4] | 混乱 | Overwhelm |

### 被动与回血

| 键名 | 中文 | English |
|---|---|---|
| mov | 移速 +8% | Move Speed +8% |
| vit | 最大生命 +15 | Max HP +15 |
| cdr | 装填时间 -8% | Cooldown -8% |
| pick | 拾取范围 + | Pickup Range + |
| heal | 应急口粮 | Emergency Ration |
| healDesc | HP弹 | Restore full HP right now. |

## 换体

| 键名 | 中文 | English |
|---|---|---|
| takeover | 视角移交 | PERSPECTIVE SHIFTED |
| takeoverSub | （这个写编号n 死亡，视角移交编号m）然后换行“我辽阔，我包含众多”——惠特曼| You are now No.{serial} — your {n}th body. It killed you. It is you. |

## 结算

| 键名 | 中文 | English |
|---|---|---|
| win | 合格 —— 出厂 | SOLE SURVIVOR — SHIPPED OUT |
| winSub | 仅有一只能离开孵化场。 | Only the strongest clone leaves the hatchery. |
| lose | 第七日 —— 全部回收 | DAY 7 — ALL DISPOSED |
| loseSub | 禁忌不允许任何克隆体活过七天。 | The A Corp. treaty allows no clone to live past 7 days. |
| statKills | 击杀 | Kills |
| statEaten | 吞食自我 | Corpses eaten |
| statTime | 用时 | Time |
| statTimeUnit | 天 | days |
| statCombo | 最高连杀 | Best combo |
| statBodies | 更换次数 | Bodies used |
| retry | 重新克隆 | Again |

## 首页入口（App.tsx）

| 键名 | 中文 | English |
|---|---|---|
| 入口按钮文字 | 孵化场 | Hatchery |
| aria-label | 孵化场 | The Hatchery |

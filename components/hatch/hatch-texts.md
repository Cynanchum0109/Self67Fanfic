# 孵化场 文案汇总（供修改）

> 改完告诉我,我会填回 `components/hatch/HatchGame.tsx` 对应位置。
> 每条格式:`键名` | 中文 | English。直接改中英文两栏即可,键名别动。

## 标题与开场

| 键名 | 中文 | English |
|---|---|---|
| title | R公司孵化场实况 | R Corp Hatchery — Live |
| subtitle | 保证存活 | Survival guaranteed. |
| pickFaction | （这句不要） |
| rabbitName | 高兴的兔子 | Happy Rabbit |
| reindeerName | 不太高兴的驯鹿 | Not-So-Happy Reindeer |
| rabbitDesc | 靠近敌人自动匕首攻击，命中后短暂加速。鼠标点击/摇杆：快速压制。去痛快地撕咬鲜草吧！| Auto dagger strikes at close range; hits grant a burst of speed. Click / stick: rapid suppression. Go tear into the fresh grass! |
| reindeerDesc | 自动发动追踪敌人的能量轰击。鼠标点击/摇杆：精神鞭挞。难以忍受，一直都是…… | Auto energy blasts that seek nearby foes. Click / stick: Mind Whip. Unbearable — it always has been… |
| hint | WASD/方向键移动 · 鼠标/摇杆释放技能 · 吞噬尸体增强 · 手机请横屏游玩 | WASD / Arrows to move · Click / stick to cast · Devour corpses to grow · Play in landscape on mobile |

## HUD

| 键名 | 中文 | English |
|---|---|---|
| day | 第（"第N天/7"的前缀） | Day |
| kills | 击杀 | Kills |
| body | 第（"第N具"的前缀） | Body |
| left | 剩余 | Left |
| serial | 编号 | No. |
| reaping | 回收执行中 | RETRIEVAL IN PROGRESS |

## 升级界面

| 键名 | 中文 | English |
|---|---|---|
| levelup | 猎 取 | HUNT |
| rarityFine | 优越 | SUPERIOR |
| rarityAnom | 异常 | ANOMALOUS |

### 武器升级线（数组第1项=武器名，第2~5项=升到2~5级时的描述）

| 键名 | 中文 | English |
|---|---|---|
| gun[0] | 枪 | Gun |
| gun[1] | 弹匣扩容 | Bigger magazine |
| gun[2] | 快速装填 | Fast reload |
| gun[3] | 火力集中 | Focused fire |
| gun[4] | 歼灭 | Annihilation |
| dagger[0] | 匕首 | Dagger |
| dagger[1] | 迅捷 | Swiftness |
| dagger[2] | 强壮 | Vigor |
| dagger[3] | 执念 | Obsession |
| dagger[4] | 撕咬鲜草 | Tear the Fresh Grass |
| bolt[0] | 精神鞭挞 | Mind Whip |
| bolt[1] | 攻击容量 | Attack capacity |
| bolt[2] | 集束充能 | Beam charge |
| bolt[3] | 心神凝聚 | Focused mind |
| bolt[4] | 滚开！ | Get away! |
| psy[0] | 能量轰击 | Energy Blast |
| psy[1] | 双重轰击 | Double blast |
| psy[2] | 集束 | Convergence |
| psy[3] | 凝滞 | Stasis |
| psy[4] | 混乱 | Chaos |

### 被动与回血

| 键名 | 中文 | English |
|---|---|---|
| mov | 移速 +8% | Move Speed +8% |
| vit | 最大生命 +15 | Max HP +15 |
| cdr | 装填时间 -8% | Reload time -8% |
| pick | 拾取范围 + | Pickup Range + |
| heal | 应急口粮 | Emergency Ration |
| healDesc | HP弹 | HP Round |

## 换体

| 键名 | 中文 | English |
|---|---|---|
| takeover | 视角移交 | PERSPECTIVE SHIFTED |
| takeoverSub | （这个写编号n 死亡，视角移交编号m）然后换行“我辽阔，我包含众多”——惠特曼| No.{dead} dead — perspective shifts to No.{next}<br>“I am large, I contain multitudes.” — Walt Whitman |

## 结算

| 键名 | 中文 | English |
|---|---|---|
| win | 合格 —— 出厂 | QUALIFIED — SHIPPED OUT |
| winSub | 仅有一只能离开孵化场。 | Only one may leave the hatchery. |
| lose | 第七日 —— 全部回收 | DAY 7 — ALL RETRIEVED |
| loseSub | 禁忌不允许任何克隆体活过七天。 | The taboo allows no clone to live past seven days. |
| statKills | 击杀 | Kills |
| statEaten | 吞食自我 | Selves devoured |
| statTime | 用时 | Time |
| statTimeUnit | 天 | days |
| statCombo | 最高连杀 | Best combo |
| statBodies | 更换次数 | Bodies replaced |
| retry | 重新克隆 | Clone again |

## 首页入口（App.tsx）

| 键名 | 中文 | English |
|---|---|---|
| 入口按钮文字 | 孵化场 | Hatchery |
| aria-label | 孵化场 | The Hatchery |

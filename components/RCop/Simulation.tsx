import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { boostSpeeches } from './speech/boost';
import { crossKillSpeeches } from './speech/crossKill';
import { sameTeamKillSpeeches } from './speech/sameTeamKill';
import { idleSpeeches } from './speech/idle';

interface SimulationProps {
  onClose: () => void;
}

interface Agent {
  id: number;
  x: number;
  y: number;
  team: 0 | 1; // 0: Reindeer驯鹿(绿色), 1: Rabbit兔子(紫色)
  power: number;
  velocityX: number;
  velocityY: number;
  protected: boolean; // 终局保护
  truceUntil: number; // 停战时间戳
  wanderTargetX?: number; // 探索目标点X
  wanderTargetY?: number; // 探索目标点Y
  lastWanderChange?: number; // 上次改变探索方向的时间
  lastHeartEffectTime?: number; // 上次触发爱心特效的时间
}

interface PinkMistEffect {
  x: number;
  y: number;
  time: number;
  radius: number;
}

interface HeartEffect {
  x: number;
  y: number;
  time: number;
  scale: number;
}

interface DrugPoint {
  id: number;
  x: number;
  y: number;
  radius: number;
  ttl: number; // 剩余时间（毫秒）
  createdAt: number;
}

// 事件类型
type SpeechEventType = 'BOOST' | 'CROSS_KILL' | 'SAME_TEAM_KILL' | 'IDLE';

// 台词事件接口
interface SpeechEvent {
  type: SpeechEventType;
  speakerTeam: 0 | 1; // 触发者队伍
  x: number;
  y: number;
  time: number;
}

// 弹幕气泡接口
interface Bubble {
  text: string;
  x: number;
  y: number;
  createdAt: number;
  type: SpeechEventType;
  speakerTeam: 0 | 1; // 说话者队伍，用于确定颜色
}

const Simulation: React.FC<SimulationProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);
  const [endingText, setEndingText] = useState<string>('');
  const [endingPreText, setEndingPreText] = useState<string>('');
  const finalBattleRef = useRef<{ a0: Agent | null; a1: Agent | null; started: boolean }>({ a0: null, a1: null, started: false });
  const gameEndedRef = useRef(false);

  const agentsRef = useRef<Agent[]>([]);
  const drugPointsRef = useRef<DrugPoint[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const darkeningEffectsRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const pinkMistEffectsRef = useRef<PinkMistEffect[]>([]);
  const heartEffectsRef = useRef<HeartEffect[]>([]);
  const lastEncounterTimeRef = useRef<number>(0);
  const arenaBoundsRef = useRef({ left: 0, right: 1200, top: 0, bottom: 800 });
  const speechEventsRef = useRef<SpeechEvent[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const lastSchedulerTickRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const lastEventTypeTimeRef = useRef<Map<SpeechEventType, number>>(new Map());

  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;
  const AGENT_SIZE = 4;
  const INITIAL_AGENTS_PER_TEAM = 200;
  const DRUG_RADIUS = 50;
  const DRUG_TTL = 5000; // 5秒（减短）
  const DRUG_ATTRACTION_RADIUS = 500; // 药物吸引范围（大范围，增加到500像素）
  const TRUCE_DURATION = 2000; // 2秒
  const SENSE_RADIUS = 100;
  const REINDEER_MAX_SPEED = 2; // 驯鹿速度
  const RABBIT_MAX_SPEED = 3; // 兔子速度更快
  const REINDEER_AGGRESSIVENESS = 0.3; // 驯鹿攻击性阈值
  const RABBIT_AGGRESSIVENESS = 0.25; // 兔子攻击性阈值（降低攻击欲望）
  const POWER_GAIN_ON_DRUG = 5;
  const POWER_GAIN_ON_CROSS_TEAM = 3;
  const CROSS_TEAM_GROWTH_THRESHOLD = 0.5; // 跨队共同增强的阈值（提高阈值，让更多异队碰撞触发共同增强）
  const HEART_EFFECT_COOLDOWN = 500; // 爱心特效冷却时间（0.5秒）
  const NO_ENCOUNTER_TIME = 5000; // 5秒没有相遇开始缩圈（缩短）
  const SHRINK_RATE = 10; // 每秒缩小10像素（更快）
  const FINAL_BOOST_DIFF = 0.1; // 小差距：逃脱（增强）
  const FINAL_MID_DIFF = 0.35;   // 中差距：中间范畴
  
  // 弹幕系统常量
  const BUBBLE_LIFETIME = 1000; // 1秒（立刻开始淡出）
  const SCHEDULER_TICK_INTERVAL = 200; // 200ms调度一次
  const MAX_BUBBLES = 5;
  const MIN_BUBBLES = 1;
  const BUBBLE_OFFSET_RADIUS = 40; // 位置偏移半径
  const INITIAL_SAME_TEAM_KILL_BAN = 15000; // 开局15秒禁止同队击杀弹幕
  const EVENT_PROXIMITY_RADIUS = 60; // 同一事件周围小范围（60像素）
  
  // 事件优先级和冷却
  const eventPriorities: Record<SpeechEventType, number> = {
    BOOST: 4,
    CROSS_KILL: 3,
    IDLE: 2,
    SAME_TEAM_KILL: 1,
  };
  
  const eventCooldowns: Record<SpeechEventType, number> = {
    BOOST: 1000,
    CROSS_KILL: 2000,
    SAME_TEAM_KILL: 1500,
    IDLE: 3000,
  };

  // 统一的结束函数（防止覆盖）
  const endGame = (opts: {
    ending: string;
    preText: string;
    text: string;
  }) => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    setEnding(opts.ending);
    setEndingPreText(opts.preText);
    setEndingText(opts.text);
    setGameEnded(true);
    isRunningRef.current = false;
    setIsRunning(false);
    finalBattleRef.current = { a0: null, a1: null, started: false };
  };

  // 台词选择函数
  const getRandomSpeech = (type: SpeechEventType, team: 0 | 1): string | null => {
    const speeches = {
      BOOST: boostSpeeches,
      CROSS_KILL: crossKillSpeeches,
      SAME_TEAM_KILL: sameTeamKillSpeeches,
      IDLE: idleSpeeches,
    }[type];
    
    const pool = speeches[team === 0 ? 'team0' : 'team1'] || (speeches as any).mixed || [];
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // 初始化agents
  const initializeAgents = () => {
    const agents: Agent[] = [];
    const now = Date.now();
    
    // Reindeer驯鹿队（左侧，绿色）
    for (let i = 0; i < INITIAL_AGENTS_PER_TEAM; i++) {
      const x = Math.random() * (CANVAS_WIDTH * 0.3) + 50;
      const y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
      agents.push({
        id: i,
        x,
        y,
        team: 0,
        power: 1.5 + Math.random() * 2.5, // 驯鹿初始战力稍高
        velocityX: 0,
        velocityY: 0,
        protected: false,
        truceUntil: 0,
        wanderTargetX: x + (Math.random() - 0.5) * 200, // 初始探索目标
        wanderTargetY: y + (Math.random() - 0.5) * 200,
        lastWanderChange: now
      });
    }
    
    // Rabbit兔子队（右侧，紫色）
    for (let i = 0; i < INITIAL_AGENTS_PER_TEAM; i++) {
      const x = Math.random() * (CANVAS_WIDTH * 0.3) + CANVAS_WIDTH * 0.7 - 50;
      const y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
      agents.push({
        id: INITIAL_AGENTS_PER_TEAM + i,
        x,
        y,
        team: 1,
        power: 1 + Math.random() * 2,
        velocityX: 0,
        velocityY: 0,
        protected: false,
        truceUntil: 0,
        wanderTargetX: x + (Math.random() - 0.5) * 200,
        wanderTargetY: y + (Math.random() - 0.5) * 200,
        lastWanderChange: now
      });
    }
    
    agentsRef.current = agents;
    lastEncounterTimeRef.current = Date.now();
    arenaBoundsRef.current = { left: 0, right: CANVAS_WIDTH, top: 0, bottom: CANVAS_HEIGHT };
  };

  // 计算距离
  const distance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  // 查找最近的药物（大范围吸引）
  const findNearestDrug = (agent: Agent): DrugPoint | null => {
    let nearest: DrugPoint | null = null;
    let minDist = Infinity;
    
    drugPointsRef.current.forEach(drug => {
      const dist = distance(agent.x, agent.y, drug.x, drug.y);
      if (dist < DRUG_ATTRACTION_RADIUS && dist < minDist) {
        minDist = dist;
        nearest = drug;
      }
    });
    
    return nearest;
  };

  // 查找附近的敌人/盟友
  const findNearbyAgents = (agent: Agent, radius: number = SENSE_RADIUS) => {
    return agentsRef.current.filter(a => {
      if (a.id === agent.id) return false;
      return distance(agent.x, agent.y, a.x, a.y) < radius;
    });
  };

  // 更新agent移动
  const updateAgentMovement = (agent: Agent, deltaTime: number) => {
    // 如果正在进行终局战斗，且这个agent是参与者，不执行正常移动逻辑
    if (finalBattleRef.current.started && !gameEnded) {
      const battle = finalBattleRef.current;
      if (battle.a0 && battle.a1 && (agent.id === battle.a0.id || agent.id === battle.a1.id)) {
        return; // 终局战斗由processFinalBattle处理
      }
    }
    
    const now = Date.now();
    const maxSpeed = agent.team === 0 ? REINDEER_MAX_SPEED : RABBIT_MAX_SPEED;
    const aggressiveness = agent.team === 0 ? REINDEER_AGGRESSIVENESS : RABBIT_AGGRESSIVENESS;
    
    // 检查药物（最高优先级，大范围吸引）
    const nearestDrug = findNearestDrug(agent);
    if (nearestDrug) {
      const dx = nearestDrug.x - agent.x;
      const dy = nearestDrug.y - agent.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        agent.velocityX = (dx / dist) * maxSpeed;
        agent.velocityY = (dy / dist) * maxSpeed;
      }
      // 不要return，继续执行位置更新
    } else {
      // 战斗/躲避逻辑
      const nearby = findNearbyAgents(agent);
      let targetAgent: Agent | null = null;
      let isPursuing = false;
      
      nearby.forEach(other => {
        if (now < agent.truceUntil && other.team !== agent.team) return; // 停战期间
        
        const powerDiff = (other.power - agent.power) / Math.max(agent.power, other.power);
        
        if (other.team !== agent.team) {
          // 跨队
          if (powerDiff > aggressiveness) {
            // 敌人更强，躲避
            targetAgent = other;
            isPursuing = false;
          } else if (powerDiff < -aggressiveness) {
            // 我更强，追击
            targetAgent = other;
            isPursuing = true;
          }
        } else {
          // 同队
          if (powerDiff > aggressiveness) {
            // 队友更强，可能被杀，躲避
            targetAgent = other;
            isPursuing = false;
          } else if (powerDiff < -aggressiveness) {
            // 我更强，可能杀队友
            targetAgent = other;
            isPursuing = true;
          }
        }
      });
      
      if (targetAgent) {
        const dx = targetAgent.x - agent.x;
        const dy = targetAgent.y - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          if (isPursuing) {
            agent.velocityX = (dx / dist) * maxSpeed;
            agent.velocityY = (dy / dist) * maxSpeed;
          } else {
            agent.velocityX = -(dx / dist) * maxSpeed;
            agent.velocityY = -(dy / dist) * maxSpeed;
          }
        }
      } else {
        // 随机游走 - 使用探索目标点系统，避免频繁切换方向
        const bounds = arenaBoundsRef.current;
        const now = Date.now();
        
        // 确保有探索目标点
        if (!agent.wanderTargetX || !agent.wanderTargetY) {
          agent.wanderTargetX = agent.x + (Math.random() - 0.5) * 300;
          agent.wanderTargetY = agent.y + (Math.random() - 0.5) * 300;
          agent.lastWanderChange = now;
        }
        
        // 计算到目标点的距离
        const dx = agent.wanderTargetX - agent.x;
        const dy = agent.wanderTargetY - agent.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        
        // 如果到达目标点附近（30像素内）或超过3秒，选择新目标
        const timeSinceLastChange = now - (agent.lastWanderChange || 0);
        const shouldChangeTarget = distToTarget < 30 || timeSinceLastChange > 3000;
        
        if (shouldChangeTarget) {
          // 选择新的探索目标点（在边界内）
          const angle = Math.random() * Math.PI * 2;
          const targetDistance = 150 + Math.random() * 200; // 150-350像素距离
          agent.wanderTargetX = Math.max(
            bounds.left + 50,
            Math.min(bounds.right - 50, agent.x + Math.cos(angle) * targetDistance)
          );
          agent.wanderTargetY = Math.max(
            bounds.top + 50,
            Math.min(bounds.bottom - 50, agent.y + Math.sin(angle) * targetDistance)
          );
          agent.lastWanderChange = now;
        }
        
        // 朝向目标点移动
        if (distToTarget > 0) {
          const targetSpeed = maxSpeed * 0.6; // 探索时使用60%速度，保持稳定
          agent.velocityX = (dx / distToTarget) * targetSpeed;
          agent.velocityY = (dy / distToTarget) * targetSpeed;
        } else {
          // 如果已经在目标点，给一个小的随机速度
          const angle = Math.random() * Math.PI * 2;
          agent.velocityX = Math.cos(angle) * maxSpeed * 0.3;
          agent.velocityY = Math.sin(angle) * maxSpeed * 0.3;
        }
      }
    }
    
    // 更新位置（所有情况都会执行到这里）
    agent.x += agent.velocityX;
    agent.y += agent.velocityY;
    
    // 边界检查（使用动态边界）
    const bounds = arenaBoundsRef.current;
    agent.x = Math.max(bounds.left + AGENT_SIZE, Math.min(bounds.right - AGENT_SIZE, agent.x));
    agent.y = Math.max(bounds.top + AGENT_SIZE, Math.min(bounds.bottom - AGENT_SIZE, agent.y));
  };

  // 处理药物交互
  const processDrugInteractions = () => {
    const now = Date.now();
    const drugsToRemove: number[] = [];
    
    drugPointsRef.current.forEach(drug => {
      const agentsInRadius = agentsRef.current.filter(agent => {
        return distance(agent.x, agent.y, drug.x, drug.y) < drug.radius;
      });
      
      if (agentsInRadius.length === 0) return;
      
      const teamsInRadius = new Set(agentsInRadius.map(a => a.team));
      
      if (teamsInRadius.size === 2) {
        // 两队都在 - 明显的粉色烟雾和爱心特效
        const randomAgent = agentsInRadius[Math.floor(Math.random() * agentsInRadius.length)];
        agentsInRadius.forEach(agent => {
          agent.power += POWER_GAIN_ON_DRUG;
          agent.truceUntil = now + TRUCE_DURATION;
        });
        agentsInRadius.forEach(agent => {
          // 检查爱心特效冷却时间
          const canTriggerHeart = !agent.lastHeartEffectTime || (now - agent.lastHeartEffectTime) >= HEART_EFFECT_COOLDOWN;
          if (canTriggerHeart) {
            // 爱心特效固定在原位置，不跟随agent移动
            const heartX = agent.x;
            const heartY = agent.y;
            pinkMistEffectsRef.current.push({ x: heartX, y: heartY, time: now, radius: 0 });
            // 50%概率生成BOOST事件，位置跟随粉红烟雾
            if (Math.random() < 0.5) {
              speechEventsRef.current.push({
                type: 'BOOST',
                speakerTeam: agent.team,
                x: heartX,
                y: heartY,
                time: now,
              });
            }
            heartEffectsRef.current.push({ x: heartX, y: heartY, time: now, scale: 0 });
            agent.lastHeartEffectTime = now; // 更新冷却时间
          } else {
            // 即使不能触发爱心，也要添加粉色烟雾
            const heartX = agent.x;
            const heartY = agent.y;
            pinkMistEffectsRef.current.push({ x: heartX, y: heartY, time: now, radius: 0 });
            // 50%概率生成BOOST事件，位置跟随粉红烟雾
            if (Math.random() < 0.5) {
              speechEventsRef.current.push({
                type: 'BOOST',
                speakerTeam: agent.team,
                x: heartX,
                y: heartY,
                time: now,
              });
            }
          }
        });
        // 在药物位置也添加特效
        pinkMistEffectsRef.current.push({ x: drug.x, y: drug.y, time: now, radius: 0 });
        // 50%概率生成BOOST事件，位置跟随粉红烟雾（使用随机agent的队伍）
        if (Math.random() < 0.5) {
          speechEventsRef.current.push({
            type: 'BOOST',
            speakerTeam: randomAgent.team,
            x: drug.x,
            y: drug.y,
            time: now,
          });
        }
        heartEffectsRef.current.push({ x: drug.x, y: drug.y, time: now, scale: 0 });
        drugsToRemove.push(drug.id);
        lastEncounterTimeRef.current = now; // 更新相遇时间
      } else if (now - drug.createdAt >= drug.ttl) {
        // 药物过期（受保护的agent不会被杀死）
        agentsInRadius.forEach(agent => {
          if (!agent.protected) {
            agentsRef.current = agentsRef.current.filter(a => a.id !== agent.id);
            darkeningEffectsRef.current.push({ x: agent.x, y: agent.y, time: now });
          }
        });
        drugsToRemove.push(drug.id);
      }
    });
    
    drugPointsRef.current = drugPointsRef.current.filter(d => !drugsToRemove.includes(d.id));
  };

  // 处理agent交互
  const processAgentInteractions = () => {
    const now = Date.now();
    const agentsToRemove: number[] = [];
    let hasEncounter = false;
    
    agentsRef.current.forEach(agent => {
      if (agentsToRemove.includes(agent.id)) return;
      
      const nearby = findNearbyAgents(agent, AGENT_SIZE * 3);
      
      nearby.forEach(other => {
        if (agentsToRemove.includes(other.id)) return;
        if (now < agent.truceUntil && other.team !== agent.team) return;
        
        const aggressiveness = agent.team === 0 ? REINDEER_AGGRESSIVENESS : RABBIT_AGGRESSIVENESS;
        const powerDiff = (other.power - agent.power) / Math.max(agent.power, other.power);
        
        if (agent.team === other.team) {
          // 同队：只要有战力差距就击杀，不检查aggressiveness，不发生共同增强
          // 注意：受保护对象不会遇到同队（因为保护时该队只剩1个）
          if (Math.abs(powerDiff) > 0.001) { // 避免浮点数误差
            if (powerDiff > 0) {
              // other更强，杀agent
              // 如果是驯鹿击杀，获得更多战力加成
              const killBonus = other.team === 0 ? 0.6 : 0.5;
              other.power += agent.power * killBonus;
              agentsToRemove.push(agent.id);
              darkeningEffectsRef.current.push({ x: agent.x, y: agent.y, time: now });
              // 生成同队击杀事件
              speechEventsRef.current.push({
                type: 'SAME_TEAM_KILL',
                speakerTeam: other.team,
                x: other.x,
                y: other.y,
                time: now,
              });
            } else {
              // agent更强，杀other
              // 如果是驯鹿击杀，获得更多战力加成
              const killBonus = agent.team === 0 ? 0.6 : 0.5;
              agent.power += other.power * killBonus;
              agentsToRemove.push(other.id);
              darkeningEffectsRef.current.push({ x: other.x, y: other.y, time: now });
              // 生成同队击杀事件
              speechEventsRef.current.push({
                type: 'SAME_TEAM_KILL',
                speakerTeam: agent.team,
                x: agent.x,
                y: agent.y,
                time: now,
              });
            }
          }
        } else {
          // 跨队相遇
          hasEncounter = true;
          // 异队：只在战力差距 > aggressiveness 时击杀，否则共同增强
          if (Math.abs(powerDiff) > aggressiveness) {
            if (powerDiff > 0) {
              // other更强，杀agent（但受保护的agent不会被击杀，改为共同增强）
              if (!agent.protected) {
                // 如果是驯鹿击杀，获得更多战力加成
                const killBonus = other.team === 0 ? 0.6 : 0.5;
                other.power += agent.power * killBonus;
                agentsToRemove.push(agent.id);
                darkeningEffectsRef.current.push({ x: agent.x, y: agent.y, time: now });
                // 生成跨队击杀事件
                speechEventsRef.current.push({
                  type: 'CROSS_KILL',
                  speakerTeam: other.team,
                  x: other.x,
                  y: other.y,
                  time: now,
                });
              } else {
                // 受保护的agent遇到击杀情况，改为共同增强
                agent.power += POWER_GAIN_ON_CROSS_TEAM;
                other.power += POWER_GAIN_ON_CROSS_TEAM;
                const agentCanTriggerHeart = !agent.lastHeartEffectTime || (now - agent.lastHeartEffectTime) >= HEART_EFFECT_COOLDOWN;
                const otherCanTriggerHeart = !other.lastHeartEffectTime || (now - other.lastHeartEffectTime) >= HEART_EFFECT_COOLDOWN;
                const heartX = agent.x;
                const heartY = agent.y;
                const otherHeartX = other.x;
                const otherHeartY = other.y;
                pinkMistEffectsRef.current.push({ x: heartX, y: heartY, time: now, radius: 0 });
                // 50%概率生成BOOST事件，位置跟随粉红烟雾
                if (Math.random() < 0.5) {
                  speechEventsRef.current.push({
                    type: 'BOOST',
                    speakerTeam: agent.team,
                    x: heartX,
                    y: heartY,
                    time: now,
                  });
                }
                pinkMistEffectsRef.current.push({ x: otherHeartX, y: otherHeartY, time: now, radius: 0 });
                // 50%概率生成BOOST事件，位置跟随粉红烟雾
                if (Math.random() < 0.5) {
                  speechEventsRef.current.push({
                    type: 'BOOST',
                    speakerTeam: other.team,
                    x: otherHeartX,
                    y: otherHeartY,
                    time: now,
                  });
                }
                if (agentCanTriggerHeart) {
                  heartEffectsRef.current.push({ x: heartX, y: heartY, time: now, scale: 0 });
                  agent.lastHeartEffectTime = now;
                }
                if (otherCanTriggerHeart) {
                  heartEffectsRef.current.push({ x: otherHeartX, y: otherHeartY, time: now, scale: 0 });
                  other.lastHeartEffectTime = now;
                }
              }
            } else {
              // agent更强，杀other（但受保护的other不会被击杀，改为共同增强）
              if (!other.protected) {
                // 如果是驯鹿击杀，获得更多战力加成
                const killBonus = agent.team === 0 ? 0.6 : 0.5;
                agent.power += other.power * killBonus;
                agentsToRemove.push(other.id);
                darkeningEffectsRef.current.push({ x: other.x, y: other.y, time: now });
                // 生成跨队击杀事件
                speechEventsRef.current.push({
                  type: 'CROSS_KILL',
                  speakerTeam: agent.team,
                  x: agent.x,
                  y: agent.y,
                  time: now,
                });
              } else {
                // 受保护的other遇到击杀情况，改为共同增强
                agent.power += POWER_GAIN_ON_CROSS_TEAM;
                other.power += POWER_GAIN_ON_CROSS_TEAM;
                const agentCanTriggerHeart = !agent.lastHeartEffectTime || (now - agent.lastHeartEffectTime) >= HEART_EFFECT_COOLDOWN;
                const otherCanTriggerHeart = !other.lastHeartEffectTime || (now - other.lastHeartEffectTime) >= HEART_EFFECT_COOLDOWN;
                const heartX = agent.x;
                const heartY = agent.y;
                const otherHeartX = other.x;
                const otherHeartY = other.y;
                pinkMistEffectsRef.current.push({ x: heartX, y: heartY, time: now, radius: 0 });
                // 50%概率生成BOOST事件，位置跟随粉红烟雾
                if (Math.random() < 0.5) {
                  speechEventsRef.current.push({
                    type: 'BOOST',
                    speakerTeam: agent.team,
                    x: heartX,
                    y: heartY,
                    time: now,
                  });
                }
                pinkMistEffectsRef.current.push({ x: otherHeartX, y: otherHeartY, time: now, radius: 0 });
                // 50%概率生成BOOST事件，位置跟随粉红烟雾
                if (Math.random() < 0.5) {
                  speechEventsRef.current.push({
                    type: 'BOOST',
                    speakerTeam: other.team,
                    x: otherHeartX,
                    y: otherHeartY,
                    time: now,
                  });
                }
                if (agentCanTriggerHeart) {
                  heartEffectsRef.current.push({ x: heartX, y: heartY, time: now, scale: 0 });
                  agent.lastHeartEffectTime = now;
                }
                if (otherCanTriggerHeart) {
                  heartEffectsRef.current.push({ x: otherHeartX, y: otherHeartY, time: now, scale: 0 });
                  other.lastHeartEffectTime = now;
                }
              }
            }
          } else {
            // 战力差距 <= aggressiveness，触发共同增强（提高阈值让更多情况触发）
            // 只要在阈值内就触发共同增强，不需要再检查 CROSS_TEAM_GROWTH_THRESHOLD
            if (Math.abs(powerDiff) <= CROSS_TEAM_GROWTH_THRESHOLD) {
              // 力量相近（使用扩大的阈值），都增长
              agent.power += POWER_GAIN_ON_CROSS_TEAM;
              other.power += POWER_GAIN_ON_CROSS_TEAM;
              
              // 检查爱心特效冷却时间
              const agentCanTriggerHeart = !agent.lastHeartEffectTime || (now - agent.lastHeartEffectTime) >= HEART_EFFECT_COOLDOWN;
              const otherCanTriggerHeart = !other.lastHeartEffectTime || (now - other.lastHeartEffectTime) >= HEART_EFFECT_COOLDOWN;
              
              // 爱心特效固定在原位置，不跟随agent移动
              const heartX = agent.x;
              const heartY = agent.y;
              const otherHeartX = other.x;
              const otherHeartY = other.y;
              
              pinkMistEffectsRef.current.push({ x: heartX, y: heartY, time: now, radius: 0 });
              // 50%概率生成BOOST事件，位置跟随粉红烟雾
              if (Math.random() < 0.5) {
                speechEventsRef.current.push({
                  type: 'BOOST',
                  speakerTeam: agent.team,
                  x: heartX,
                  y: heartY,
                  time: now,
                });
              }
              pinkMistEffectsRef.current.push({ x: otherHeartX, y: otherHeartY, time: now, radius: 0 });
              // 50%概率生成BOOST事件，位置跟随粉红烟雾
              if (Math.random() < 0.5) {
                speechEventsRef.current.push({
                  type: 'BOOST',
                  speakerTeam: other.team,
                  x: otherHeartX,
                  y: otherHeartY,
                  time: now,
                });
              }
              
              if (agentCanTriggerHeart) {
                heartEffectsRef.current.push({ x: heartX, y: heartY, time: now, scale: 0 });
                agent.lastHeartEffectTime = now; // 更新冷却时间
              }
              if (otherCanTriggerHeart) {
                heartEffectsRef.current.push({ x: otherHeartX, y: otherHeartY, time: now, scale: 0 });
                other.lastHeartEffectTime = now; // 更新冷却时间
              }
            }
          }
        }
      });
    });
    
    if (hasEncounter) {
      lastEncounterTimeRef.current = now;
    }
    
    agentsRef.current = agentsRef.current.filter(a => !agentsToRemove.includes(a.id));
  };
  
  // 气泡位置计算
  const calculateBubblePosition = (event: SpeechEvent, existingBubbles: Bubble[]): { x: number; y: number } | null => {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const offset = 20 + Math.random() * BUBBLE_OFFSET_RADIUS;
      const x = event.x + Math.cos(angle) * offset;
      const y = event.y + Math.sin(angle) * offset;
      
      // 检查是否与现有气泡重叠（距离 < 40px）
      const tooClose = existingBubbles.some(b => {
        const dist = Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2);
        return dist < BUBBLE_OFFSET_RADIUS;
      });
      
      if (!tooClose) return { x, y };
    }
    return null; // 找不到合适位置
  };

  // 调度器主函数
  const schedulerTick = () => {
    const now = Date.now();
    const currentBubbles = bubblesRef.current.filter(b => now - b.createdAt < BUBBLE_LIFETIME);
    const shouldAddBubble = currentBubbles.length < MIN_BUBBLES || 
                           (currentBubbles.length < MAX_BUBBLES && speechEventsRef.current.length > 0);
    
    if (!shouldAddBubble) return;
    
    // 过滤有效事件（超过1秒未调度的删除）
    const validEvents = speechEventsRef.current.filter(e => now - e.time < 1000);
    
    // 检查开局15秒内禁止 SAME_TEAM_KILL
    const gameAge = now - gameStartTimeRef.current;
    let filteredEvents = validEvents.filter(e => {
      if (e.type === 'SAME_TEAM_KILL' && gameAge < INITIAL_SAME_TEAM_KILL_BAN) {
        return false;
      }
      return true;
    });
    
    // 检查同一事件周围小范围内是否已有相同类型的气泡在显示
    filteredEvents = filteredEvents.filter(event => {
      // 检查是否有相同类型的气泡在附近显示
      const hasNearbyBubble = currentBubbles.some(bubble => {
        if (bubble.type !== event.type) return false;
        const dist = Math.sqrt((bubble.x - event.x) ** 2 + (bubble.y - event.y) ** 2);
        return dist < EVENT_PROXIMITY_RADIUS;
      });
      return !hasNearbyBubble;
    });
    
    if (filteredEvents.length === 0) {
      // 如果没有事件，生成IDLE事件
      const aliveAgents = agentsRef.current;
      if (aliveAgents.length > 0) {
        const randomAgent = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];
        const idleEvent: SpeechEvent = {
          type: 'IDLE',
          speakerTeam: randomAgent.team,
          x: randomAgent.x,
          y: randomAgent.y,
          time: now,
        };
        filteredEvents.push(idleEvent);
      } else {
        return;
      }
    }
    
    // 按优先级排序
    const sortedEvents = [...filteredEvents].sort((a, b) => {
      return eventPriorities[b.type] - eventPriorities[a.type];
    });
    
    // 尝试从高优先级事件生成气泡
    for (const event of sortedEvents) {
      // 检查冷却时间
      const lastTime = lastEventTypeTimeRef.current.get(event.type) || 0;
      if (now - lastTime < eventCooldowns[event.type]) {
        continue;
      }
      
      // 获取台词
      const speech = getRandomSpeech(event.type, event.speakerTeam);
      if (!speech) continue;
      
      // 计算位置
      const position = calculateBubblePosition(event, currentBubbles);
      if (!position) continue;
      
      // 创建气泡
      const bubble: Bubble = {
        text: speech,
        x: position.x,
        y: position.y,
        createdAt: now,
        type: event.type,
        speakerTeam: event.speakerTeam,
      };
      
      bubblesRef.current.push(bubble);
      lastEventTypeTimeRef.current.set(event.type, now);
      
      // 移除已使用的事件
      const eventIndex = speechEventsRef.current.findIndex(e => 
        e.type === event.type && 
        e.speakerTeam === event.speakerTeam &&
        Math.abs(e.x - event.x) < 1 &&
        Math.abs(e.y - event.y) < 1 &&
        Math.abs(e.time - event.time) < 100
      );
      if (eventIndex >= 0) {
        speechEventsRef.current.splice(eventIndex, 1);
      }
      
      break; // 每tick最多添加一个气泡
    }
  };

  // 处理缩圈
  const processArenaShrink = (deltaTime: number) => {
    const now = Date.now();
    const timeSinceLastEncounter = now - lastEncounterTimeRef.current;
    
    if (timeSinceLastEncounter > NO_ENCOUNTER_TIME) {
      const shrinkAmount = (SHRINK_RATE * deltaTime) / 1000;
      const bounds = arenaBoundsRef.current;
      
      bounds.left += shrinkAmount;
      bounds.right -= shrinkAmount;
      bounds.top += shrinkAmount;
      bounds.bottom -= shrinkAmount;
      
      // 确保不会缩到太小
      if (bounds.right - bounds.left < 200 || bounds.bottom - bounds.top < 200) {
        bounds.left = (CANVAS_WIDTH - 200) / 2;
        bounds.right = (CANVAS_WIDTH + 200) / 2;
        bounds.top = (CANVAS_HEIGHT - 200) / 2;
        bounds.bottom = (CANVAS_HEIGHT + 200) / 2;
      }
      
      // 将超出边界的agents移回
      agentsRef.current.forEach(agent => {
        agent.x = Math.max(bounds.left + AGENT_SIZE, Math.min(bounds.right - AGENT_SIZE, agent.x));
        agent.y = Math.max(bounds.top + AGENT_SIZE, Math.min(bounds.bottom - AGENT_SIZE, agent.y));
      });
    }
  };

  // 处理终局战斗（让两个agent互相靠近）
  const processFinalBattle = (a0: Agent, a1: Agent) => {
    if (gameEndedRef.current) return;

    const dx0 = a1.x - a0.x;
    const dy0 = a1.y - a0.y;
    const dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
    const collisionDistance = AGENT_SIZE * 2;
    const maxSpeed = Math.max(REINDEER_MAX_SPEED, RABBIT_MAX_SPEED);
    const relativeSpeed = maxSpeed * 2;

    // 碰撞：触发终局结算（四结局）
    if (dist0 <= collisionDistance + relativeSpeed) {
      const now = Date.now();

      const powerDiff = (a1.power - a0.power) / Math.max(a0.power, a1.power);
      const d = Math.abs(powerDiff);

      // 1) 逃脱结局（增强范畴）
      if (d <= FINAL_BOOST_DIFF) {
        // 你原本的"事务所/逃脱"文本放这里
        endGame({
          ending: 'escape',
          preText: '“……我们开了一间小事务所。他仍会头疼，我的手也时不时颤抖。我们仍从噩梦中惊醒，然后共享这个夜晚。但生活就是这样开始的。”',
          text: '逃 脱',
        });

        // 你想要保留爱心特效的话可以放这
        const heartX = (a0.x + a1.x) / 2;
        const heartY = (a0.y + a1.y) / 2;
        pinkMistEffectsRef.current.push({ x: heartX, y: heartY, time: now, radius: 0 });
        heartEffectsRef.current.push({ x: heartX, y: heartY, time: now, scale: 0 });
        return;
      }

      // 2) 中间范畴（非击杀、非逃脱）
      if (d < FINAL_MID_DIFF) {
        endGame({
          ending: 'survive',
          preText: '“两人同行总会好些。\n  如果我们无法前进，\n  就让我们死在途中。\n  让我们死在一起。”',
          text: '存 活',
        });

        const heartX = (a0.x + a1.x) / 2;
        const heartY = (a0.y + a1.y) / 2;
        pinkMistEffectsRef.current.push({ x: heartX, y: heartY, time: now, radius: 0 });
        heartEffectsRef.current.push({ x: heartX, y: heartY, time: now, scale: 0 });
        return;
      }

      // 3) 击杀范畴：谁强谁杀（兔杀鹿 / 鹿杀兔）
      if (powerDiff > 0) {
        // 兔子更强 → 兔杀鹿（终局击杀结局）
        darkeningEffectsRef.current.push({ x: a0.x, y: a0.y, time: now });
        agentsRef.current = agentsRef.current.filter(a => a.id !== a0.id);

        endGame({
          ending: 'rabbit_kills_reindeer',
          preText: '“你可要痛快咬住我的脖子。\n 红血滴落。\n草脏了，天近了。两颗眼珠上映现出彩虹。\n我淡笑着，死了。\n我一直等候着呢，这一刻。”',
          text: '兔子 击杀 驯鹿',
        });
        return;
      } else {
        // 驯鹿更强 → 鹿杀兔（终局击杀结局）
        darkeningEffectsRef.current.push({ x: a1.x, y: a1.y, time: now });
        agentsRef.current = agentsRef.current.filter(a => a.id !== a1.id);

        endGame({
          ending: 'reindeer_kills_rabbit',
          preText: '“哈，我输了，你征服了我。我就把自己给你。\n摄食我吧，我们当合为一体。\n你要问我："这是最后的挣扎？假意屈服的计谋？"\n我回答："吃吧，你早已涎水直流了。"”',
          text: '驯鹿 击杀 兔子',
        });
        return;
      }
    }

    // 还没碰撞：继续互相靠近
    if (dist0 > 0) {
      a0.velocityX = (dx0 / dist0) * maxSpeed;
      a0.velocityY = (dy0 / dist0) * maxSpeed;
    }

    const dx1 = a0.x - a1.x;
    const dy1 = a0.y - a1.y;
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    if (dist1 > 0) {
      a1.velocityX = (dx1 / dist1) * maxSpeed;
      a1.velocityY = (dy1 / dist1) * maxSpeed;
    }

    a0.x += a0.velocityX;
    a0.y += a0.velocityY;
    a1.x += a1.velocityX;
    a1.y += a1.velocityY;
  };

  // 检查终局
  const checkEndgame = () => {
    if (gameEndedRef.current) return;

    const team0 = agentsRef.current.filter(a => a.team === 0);
    const team1 = agentsRef.current.filter(a => a.team === 1);

    // 1) 先判定终局战斗（只要 1v1 就进入）
    if (team0.length === 1 && team1.length === 1) {
      const a0 = team0[0];
      const a1 = team1[0];

      // 关闭保护，避免影响终局
      a0.protected = false;
      a1.protected = false;

      if (!finalBattleRef.current.started) {
        finalBattleRef.current = { a0, a1, started: true };
      } else {
        finalBattleRef.current.a0 = a0;
        finalBattleRef.current.a1 = a1;
      }

      processFinalBattle(a0, a1);
      return; // ⚠️ 关键：1v1 直接返回，绝不走归0结局
    } else {
      finalBattleRef.current = { a0: null, a1: null, started: false };
    }

    // 2) 如果没进入终局战斗，再判定归0 → 存活结局（两个）
    if (team0.length === 0 && team1.length > 0) {
      const now = Date.now();
      team1.forEach(agent => darkeningEffectsRef.current.push({ x: agent.x, y: agent.y, time: now }));
      endGame({
        ending: 'rabbit_survives',
        preText: '“……已经将遗体移交给鸿园集团。但不剩下多少了——我都不知道能不能称它为一具遗体。无论如何，这件事已经告一段落。就当它是一件圣诞礼物吧。”',
        text: '兔子 存活',
      });
      return;
    }

    if (team1.length === 0 && team0.length > 0) {
      const now = Date.now();
      team0.forEach(agent => darkeningEffectsRef.current.push({ x: agent.x, y: agent.y, time: now }));
      endGame({
        ending: 'reindeer_survives',
        preText: '“……有时我们吞食他们，有时他们吞食我们。他欢快地撕扯着自己的肉，淌下的血是红色的。”',
        text: '驯鹿 存活',
      });
      return;
    }

    // 3) 保护逻辑（只在非1v1且未结束时运行）
    if (team0.length === 1 && team1.length > 1) team0[0].protected = true;
    else team0.forEach(a => (a.protected = false));

    if (team1.length === 1 && team0.length > 1) team1[0].protected = true;
    else team1.forEach(a => (a.protected = false));
  };

  // 游戏循环
  const gameLoop = (currentTime: number) => {
    if (!isRunningRef.current && !gameEnded) return;
    
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    
    // 如果游戏未结束，更新游戏逻辑
    if (!gameEnded) {
      // 更新agents
      agentsRef.current.forEach(agent => {
        updateAgentMovement(agent, deltaTime);
      });
      
      // 处理交互
      processDrugInteractions();
      processAgentInteractions();
      processArenaShrink(deltaTime);
      checkEndgame();
      
      // 更新药物TTL
      const now = Date.now();
      drugPointsRef.current = drugPointsRef.current.filter(drug => {
        return now - drug.createdAt < drug.ttl;
      });
      
      // 更新视觉效果
      darkeningEffectsRef.current = darkeningEffectsRef.current.filter(e => now - e.time < 500);
      pinkMistEffectsRef.current = pinkMistEffectsRef.current.map(effect => {
        const age = now - effect.time;
        if (age > 2000) return null;
        return { ...effect, radius: Math.min(60, age / 10) };
      }).filter((e): e is PinkMistEffect => e !== null);
      // 爱心特效只过滤过期，不更新坐标（确保固定在原位置）
      heartEffectsRef.current = heartEffectsRef.current.filter(e => now - e.time < 1500);
      
      // 调度器tick
      if (now - lastSchedulerTickRef.current >= SCHEDULER_TICK_INTERVAL) {
        schedulerTick();
        lastSchedulerTickRef.current = now;
      }
      
      // 清理过期事件（超过1秒未调度的删除）
      speechEventsRef.current = speechEventsRef.current.filter(e => now - e.time < 1000);
      
      // 清理过期气泡
      bubblesRef.current = bubblesRef.current.filter(b => now - b.createdAt < BUBBLE_LIFETIME);
    }
    
    // 绘制（无论游戏是否结束都要绘制，以显示结局文字）
    draw();
    
    // 如果游戏未结束，继续循环
    if (isRunningRef.current && !gameEnded) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else if (gameEnded) {
      // 游戏结束时，停止循环（结局文字已经显示）
      // 不需要继续循环，因为draw()已经在上面调用了
    }
  };

  // 绘制
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清空画布
    ctx.fillStyle = '#F8F6FA';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const now = Date.now();
    
    // 绘制药物（逐渐减淡）和吸引范围
    drugPointsRef.current.forEach(drug => {
      const age = now - drug.createdAt;
      const remaining = drug.ttl - age;
      const alpha = Math.max(0.2, remaining / drug.ttl); // 从1.0逐渐减淡到0.2
      
      // 绘制吸引范围（半透明圆圈）
      ctx.strokeStyle = `rgba(255, 200, 150, ${alpha * 0.2})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(drug.x, drug.y, DRUG_ATTRACTION_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // 绘制药物本身
      ctx.fillStyle = `rgba(255, 200, 150, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(drug.x, drug.y, drug.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 绘制缩圈边界
    const bounds = arenaBoundsRef.current;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    ctx.setLineDash([]);
    
    // 绘制击杀特效（红色）- 在agents下方
    darkeningEffectsRef.current.forEach(effect => {
      const age = now - effect.time;
      const alpha = 1 - (age / 500);
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 30, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 绘制粉色烟雾（在原地弥漫开逐渐消失）- 在agents下方
    pinkMistEffectsRef.current.forEach(effect => {
      const age = now - effect.time;
      if (age > 2000) return;
      const alpha = 1 - (age / 2000);
      const radius = effect.radius;
      
      // 创建渐变
      const gradient = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, radius);
      gradient.addColorStop(0, `rgba(242, 182, 251, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(242, 182, 251, ${alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(242, 182, 251, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 绘制爱心特效（固定在原位置，不拖尾）- 在agents下方
    heartEffectsRef.current.forEach(effect => {
      const age = now - effect.time;
      if (age > 1500) return;
      const alpha = 1 - (age / 1500);
      // 爱心在原地逐渐放大并淡出，不跟随agent移动
      const scale = 0.5 + (age / 1500) * 1.0; // 从0.5放大到1.5
      
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.scale(scale, scale);
      ctx.fillStyle = `rgba(255, 105, 180, ${alpha})`;
      ctx.strokeStyle = `rgba(255, 20, 147, ${alpha * 0.8})`;
      ctx.lineWidth = 2;
      
      // 绘制爱心形状
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(0, -5, -5, -10, -5, -5);
      ctx.bezierCurveTo(-5, -2, -2, 0, 0, 3);
      ctx.bezierCurveTo(2, 0, 5, -2, 5, -5);
      ctx.bezierCurveTo(5, -10, 0, -5, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    
    // 绘制agents（在特效上方）
    agentsRef.current.forEach(agent => {
      ctx.fillStyle = agent.team === 0 ? '#6BD4C0' : '#7B5B89'; // 驯鹿绿色，兔子紫色
      if (agent.protected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, AGENT_SIZE + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, AGENT_SIZE, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 绘制弹幕气泡
    bubblesRef.current.forEach(bubble => {
      const age = now - bubble.createdAt;
      if (age > BUBBLE_LIFETIME) return;
      
      // 计算透明度（立刻开始淡出，总用时1秒）
      const alpha = 1 - (age / BUBBLE_LIFETIME);
      
      // 根据队伍设置颜色：team0（驯鹿）深绿色，team1（兔子）棕色
      const teamColor = bubble.speakerTeam === 0 
        ? `rgba(0, 100, 0, ${alpha})` // 深绿色
        : `rgba(139, 69, 19, ${alpha})`; // 棕色
      
      // 绘制文本（无背景）
      ctx.font = '28px Inter';
      ctx.fillStyle = teamColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubble.text, bubble.x, bubble.y - 10);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    });
    
    // 绘制统计信息
    const team0Count = agentsRef.current.filter(a => a.team === 0).length;
    const team1Count = agentsRef.current.filter(a => a.team === 1).length;
    const totalPower0 = agentsRef.current.filter(a => a.team === 0).reduce((sum, a) => sum + a.power, 0);
    const totalPower1 = agentsRef.current.filter(a => a.team === 1).reduce((sum, a) => sum + a.power, 0);
    const avgPower0 = team0Count > 0 ? totalPower0 / team0Count : 0;
    const avgPower1 = team1Count > 0 ? totalPower1 / team1Count : 0;
    
    ctx.fillStyle = '#333';
    ctx.font = '16px Inter';
    ctx.fillText(`Reindeer驯鹿: ${team0Count} (战力: ${avgPower0.toFixed(1)})`, 20, 30);
    ctx.fillText(`Rabbit兔子: ${team1Count} (战力: ${avgPower1.toFixed(1)})`, 20, 50);
    
    if (gameEnded && ending && endingText) {
      // 绘制前置文本（黑色粗体，带引号）
      if (endingPreText) {
        ctx.fillStyle = '#000000';
        ctx.font = '500 48px "Noto Serif SC", "Source Han Serif SC", "Source Han Serif", serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // 左右边距（减少边距，让每行更长）
        const margin = 40;
        const maxWidth = CANVAS_WIDTH - margin * 2;
        
        // 自动换行函数：将文本按最大宽度分割成多行
        const wrapText = (text: string, maxLineWidth: number): string[] => {
          const words = text.split('');
          const lines: string[] = [];
          let currentLine = '';
          
          for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i];
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxLineWidth && currentLine.length > 0) {
              lines.push(currentLine);
              currentLine = words[i];
            } else {
              currentLine = testLine;
            }
          }
          
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          
          return lines;
        };
        
        // 先按手动换行分割，然后对每一行进行自动换行
        const manualLines = endingPreText.split('\n').map(line => line.trim()).filter(line => line);
        const allLines: string[] = [];
        
        manualLines.forEach(line => {
          const wrappedLines = wrapText(line, maxWidth);
          allLines.push(...wrappedLines);
        });
        
        const lineHeight = 70; // 正常行距
        // 计算文本块的总高度
        const totalHeight = allLines.length * lineHeight;
        const startY = CANVAS_HEIGHT / 2 - totalHeight / 2 - 60;
        // 计算最宽行的宽度，用于居中
        let maxLineWidth = 0;
        allLines.forEach(line => {
          const width = ctx.measureText(line).width;
          if (width > maxLineWidth) maxLineWidth = width;
        });
        const textStartX = CANVAS_WIDTH / 2 - maxLineWidth / 2;
        allLines.forEach((line, index) => {
          if (line) {
            ctx.fillText(line, textStartX, startY + index * lineHeight);
          }
        });
        ctx.textBaseline = 'alphabetic';
      }
      
      // 绘制结局文本（左对齐，居中显示）
      ctx.fillStyle = '#7B5B89';
      ctx.font = 'bold 48px Inter';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const endingTextWidth = ctx.measureText(endingText).width;
      const endingTextX = CANVAS_WIDTH / 2 - endingTextWidth / 2;
      ctx.fillText(endingText, endingTextX, CANVAS_HEIGHT / 2 + 80 + 48); // 往下移动一个字体高度（48px）
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  };

  // 处理点击添加药物
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRunning || gameEnded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // 计算缩放比例（Canvas实际尺寸 vs 显示尺寸）
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // 将鼠标坐标转换为Canvas坐标
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // 检查是否在缩圈边界内
    const bounds = arenaBoundsRef.current;
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
      return; // 超出边界，不投放
    }
    
    drugPointsRef.current.push({
      id: Date.now(),
      x,
      y,
      radius: DRUG_RADIUS,
      ttl: DRUG_TTL,
      createdAt: Date.now()
    });
  }, [isRunning, gameEnded]);

  // 开始游戏
  const startSimulation = () => {
    initializeAgents();
    isRunningRef.current = true;
    setIsRunning(true);
    setGameEnded(false);
    setEnding(null);
    setEndingText('');
    setEndingPreText('');
    gameEndedRef.current = false;
    finalBattleRef.current = { a0: null, a1: null, started: false };
    lastTimeRef.current = performance.now();
    gameStartTimeRef.current = Date.now();
    lastSchedulerTickRef.current = Date.now();
    speechEventsRef.current = [];
    bubblesRef.current = [];
    lastEventTypeTimeRef.current.clear();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // 重置游戏
  const resetSimulation = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    setGameEnded(false);
    setEnding(null);
    setEndingText('');
    setEndingPreText('');
    gameEndedRef.current = false;
    finalBattleRef.current = { a0: null, a1: null, started: false };
    drugPointsRef.current = [];
    darkeningEffectsRef.current = [];
    pinkMistEffectsRef.current = [];
    heartEffectsRef.current = [];
    lastEncounterTimeRef.current = Date.now();
    arenaBoundsRef.current = { left: 0, right: CANVAS_WIDTH, top: 0, bottom: CANVAS_HEIGHT };
    speechEventsRef.current = [];
    bubblesRef.current = [];
    lastSchedulerTickRef.current = 0;
    gameStartTimeRef.current = 0;
    lastEventTypeTimeRef.current.clear();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    initializeAgents();
    // 强制清除画布并重新绘制，确保结局文本被清除
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
    draw();
  };

  // 监听gameEnded状态变化，重新绘制以显示或清除结局文字
  useEffect(() => {
    draw();
  }, [gameEnded, ending, endingText, endingPreText]);

  // 初始化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    initializeAgents();
    draw();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-6xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-[#7B5B89]">R公司孵化场观测（施工中）</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#E8F9F6] rounded-lg transition-colors"
            aria-label="Close simulation"
          >
            <X size={24} className="text-[#7B5B89]" />
          </button>
        </div>
        
        <div className="bg-[#F8F6FA] rounded-lg p-4 border-2 border-[#E8F9F6] mb-4">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-auto border border-[#D4F4EC] rounded cursor-crosshair"
            style={{ maxHeight: '600px' }}
          />
        </div>
        
        <div className="flex gap-4 justify-center">
          {!isRunning && !gameEnded && (
            <button
              onClick={startSimulation}
              className="px-6 py-2 bg-[#6BD4C0] hover:bg-[#5FC4B0] text-white rounded-lg font-bold transition-colors"
            >
              开始观测
            </button>
          )}
          {(isRunning || gameEnded) && (
            <button
              onClick={resetSimulation}
              className="px-6 py-2 bg-[#9D8AB5] hover:bg-[#7B5B89] text-white rounded-lg font-bold transition-colors"
            >
              重新克隆
            </button>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-600 text-center">
          <p>点击场地投放药物</p>
        </div>
      </div>
    </div>
  );
};

export default Simulation;


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

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

const Simulation: React.FC<SimulationProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [ending, setEnding] = useState<'A' | 'B' | 'C' | null>(null);
  const [endingText, setEndingText] = useState<string>('');
  const finalBattleRef = useRef<{ a0: Agent | null; a1: Agent | null; started: boolean }>({ a0: null, a1: null, started: false });

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
  const RABBIT_AGGRESSIVENESS = 0.2; // 兔子攻击性更强（阈值更低）
  const POWER_GAIN_ON_DRUG = 5;
  const POWER_GAIN_ON_CROSS_TEAM = 3;
  const CROSS_TEAM_GROWTH_THRESHOLD = 0.4; // 跨队共同增强的阈值（大幅扩大，让更多异队碰撞触发共同增强）
  const HEART_EFFECT_COOLDOWN = 500; // 爱心特效冷却时间（0.5秒）
  const NO_ENCOUNTER_TIME = 5000; // 5秒没有相遇开始缩圈（缩短）
  const SHRINK_RATE = 10; // 每秒缩小10像素（更快）
  const FINAL_BATTLE_THRESHOLD = 0.25; // 终局判定阈值（存活概率 = 两个击杀概率之和）

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
        power: 1 + Math.random() * 2,
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
      if (a.protected) return false; // 跳过受保护的agent
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
    
    // 受保护的agent只进行游走，不参与战斗/食物逻辑
    if (agent.protected) {
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
        const angle = Math.random() * Math.PI * 2;
        const targetDistance = 150 + Math.random() * 200;
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
      const maxSpeed = agent.team === 0 ? REINDEER_MAX_SPEED : RABBIT_MAX_SPEED;
      if (distToTarget > 0) {
        const targetSpeed = maxSpeed * 0.6;
        agent.velocityX = (dx / distToTarget) * targetSpeed;
        agent.velocityY = (dy / distToTarget) * targetSpeed;
      } else {
        const angle = Math.random() * Math.PI * 2;
        agent.velocityX = Math.cos(angle) * maxSpeed * 0.3;
        agent.velocityY = Math.sin(angle) * maxSpeed * 0.3;
      }
      
      // 更新位置
      agent.x += agent.velocityX;
      agent.y += agent.velocityY;
      
      // 边界检查
      agent.x = Math.max(bounds.left + AGENT_SIZE, Math.min(bounds.right - AGENT_SIZE, agent.x));
      agent.y = Math.max(bounds.top + AGENT_SIZE, Math.min(bounds.bottom - AGENT_SIZE, agent.y));
      return;
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
        if (other.protected) return; // 跳过受保护的agent
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
        if (agent.protected) return false; // 受保护的agent不参与药物交互
        return distance(agent.x, agent.y, drug.x, drug.y) < drug.radius;
      });
      
      if (agentsInRadius.length === 0) return;
      
      const teamsInRadius = new Set(agentsInRadius.map(a => a.team));
      
      if (teamsInRadius.size === 2) {
        // 两队都在 - 明显的粉色烟雾和爱心特效
        agentsInRadius.forEach(agent => {
          agent.power += POWER_GAIN_ON_DRUG;
          agent.truceUntil = now + TRUCE_DURATION;
          // 检查爱心特效冷却时间
          const canTriggerHeart = !agent.lastHeartEffectTime || (now - agent.lastHeartEffectTime) >= HEART_EFFECT_COOLDOWN;
          if (canTriggerHeart) {
            // 爱心特效固定在原位置，不跟随agent移动
            const heartX = agent.x;
            const heartY = agent.y;
            pinkMistEffectsRef.current.push({ x: heartX, y: heartY, time: now, radius: 0 });
            heartEffectsRef.current.push({ x: heartX, y: heartY, time: now, scale: 0 });
            agent.lastHeartEffectTime = now; // 更新冷却时间
          } else {
            // 即使不能触发爱心，也要添加粉色烟雾
            const heartX = agent.x;
            const heartY = agent.y;
            pinkMistEffectsRef.current.push({ x: heartX, y: heartY, time: now, radius: 0 });
          }
        });
        // 在药物位置也添加特效
        pinkMistEffectsRef.current.push({ x: drug.x, y: drug.y, time: now, radius: 0 });
        heartEffectsRef.current.push({ x: drug.x, y: drug.y, time: now, scale: 0 });
        drugsToRemove.push(drug.id);
        lastEncounterTimeRef.current = now; // 更新相遇时间
      } else if (now - drug.createdAt >= drug.ttl) {
        // 药物过期
        agentsInRadius.forEach(agent => {
          agentsRef.current = agentsRef.current.filter(a => a.id !== agent.id);
          darkeningEffectsRef.current.push({ x: agent.x, y: agent.y, time: now });
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
        if (agent.protected || other.protected) return;
        
        const aggressiveness = agent.team === 0 ? REINDEER_AGGRESSIVENESS : RABBIT_AGGRESSIVENESS;
        const powerDiff = (other.power - agent.power) / Math.max(agent.power, other.power);
        
        if (agent.team === other.team) {
          // 同队
          if (Math.abs(powerDiff) > aggressiveness) {
            if (powerDiff > 0) {
              // other更强，杀agent
              other.power += agent.power * 0.5;
              agentsToRemove.push(agent.id);
              darkeningEffectsRef.current.push({ x: agent.x, y: agent.y, time: now });
            }
          }
        } else {
          // 跨队相遇
          hasEncounter = true;
          if (Math.abs(powerDiff) > aggressiveness) {
            if (powerDiff > 0) {
              // other更强，杀agent
              other.power += agent.power * 0.5;
              agentsToRemove.push(agent.id);
              darkeningEffectsRef.current.push({ x: agent.x, y: agent.y, time: now });
            }
        } else if (Math.abs(powerDiff) <= CROSS_TEAM_GROWTH_THRESHOLD) {
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
          pinkMistEffectsRef.current.push({ x: otherHeartX, y: otherHeartY, time: now, radius: 0 });
          
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
      });
    });
    
    if (hasEncounter) {
      lastEncounterTimeRef.current = now;
    }
    
    agentsRef.current = agentsRef.current.filter(a => !agentsToRemove.includes(a.id));
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
    const maxSpeed = Math.max(REINDEER_MAX_SPEED, RABBIT_MAX_SPEED);
    
    // 让两个agent互相靠近
    const dx0 = a1.x - a0.x;
    const dy0 = a1.y - a0.y;
    const dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
    
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
    
    // 更新位置
    a0.x += a0.velocityX;
    a0.y += a0.velocityY;
    a1.x += a1.velocityX;
    a1.y += a1.velocityY;
    
    // 检查碰撞（当距离小于等于两个agent的半径之和时）
    const collisionDistance = AGENT_SIZE * 2;
    if (dist0 <= collisionDistance) {
      // 碰撞，进行判定
      const powerDiff = (a1.power - a0.power) / Math.max(a0.power, a1.power);
      
      if (powerDiff > FINAL_BATTLE_THRESHOLD) {
        // 兔子击杀驯鹿
        setEnding('A');
        setEndingText('兔子 击杀 驯鹿');
        agentsRef.current = agentsRef.current.filter(a => a.id !== a0.id);
      } else if (powerDiff < -FINAL_BATTLE_THRESHOLD) {
        // 驯鹿击杀兔子
        setEnding('C');
        setEndingText('驯鹿 击杀 兔子');
        agentsRef.current = agentsRef.current.filter(a => a.id !== a1.id);
      } else {
        // 存活
        setEnding('B');
        setEndingText('存 活');
      }
      
      setGameEnded(true);
      isRunningRef.current = false;
      setIsRunning(false);
      finalBattleRef.current = { a0: null, a1: null, started: false };
    }
  };

  // 检查终局
  const checkEndgame = () => {
    const team0 = agentsRef.current.filter(a => a.team === 0);
    const team1 = agentsRef.current.filter(a => a.team === 1);
    
    // 应用保护
    if (team0.length === 1 && team1.length > 1) {
      team0[0].protected = true;
    } else {
      team0.forEach(a => a.protected = false);
    }
    
    if (team1.length === 1 && team0.length > 1) {
      team1[0].protected = true;
    } else {
      team1.forEach(a => a.protected = false);
    }
    
    // 检查是否都只剩一个
    if (team0.length === 1 && team1.length === 1) {
      const a0 = team0[0];
      const a1 = team1[0];
      a0.protected = false;
      a1.protected = false;
      
      // 开始终局战斗
      if (!finalBattleRef.current.started) {
        finalBattleRef.current = { a0, a1, started: true };
      }
      
      // 处理终局战斗（让两个agent互相靠近并碰撞判定）
      if (finalBattleRef.current.started && !gameEnded) {
        processFinalBattle(a0, a1);
      }
    } else {
      finalBattleRef.current = { a0: null, a1: null, started: false };
    }
  };

  // 游戏循环
  const gameLoop = (currentTime: number) => {
    if (!isRunningRef.current) return;
    
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    
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
    
    // 绘制
    draw();
    
    if (isRunningRef.current && !gameEnded) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
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
    
    // 绘制agents
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
    
    // 绘制击杀特效（红色）
    darkeningEffectsRef.current.forEach(effect => {
      const age = now - effect.time;
      const alpha = 1 - (age / 500);
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 30, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 绘制粉色烟雾（在原地弥漫开逐渐消失）
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
    
    // 绘制爱心特效（固定在原位置，不拖尾）
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
    
    // 绘制统计信息
    const team0Count = agentsRef.current.filter(a => a.team === 0).length;
    const team1Count = agentsRef.current.filter(a => a.team === 1).length;
    const totalPower0 = agentsRef.current.filter(a => a.team === 0).reduce((sum, a) => sum + a.power, 0);
    const totalPower1 = agentsRef.current.filter(a => a.team === 1).reduce((sum, a) => sum + a.power, 0);
    
    ctx.fillStyle = '#333';
    ctx.font = '16px Inter';
    ctx.fillText(`Reindeer驯鹿: ${team0Count} (战力: ${totalPower0.toFixed(1)})`, 20, 30);
    ctx.fillText(`Rabbit兔子: ${team1Count} (战力: ${totalPower1.toFixed(1)})`, 20, 50);
    ctx.fillText(`药物: ${drugPointsRef.current.length}`, 20, 70);
    
    if (gameEnded && ending && endingText) {
      ctx.fillStyle = '#7B5B89';
      ctx.font = 'bold 36px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(endingText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.textAlign = 'left';
    }
  };

  // 处理点击添加药物
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRunning || gameEnded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
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
    finalBattleRef.current = { a0: null, a1: null, started: false };
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // 重置游戏
  const resetSimulation = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    setGameEnded(false);
    setEnding(null);
    setEndingText('');
    finalBattleRef.current = { a0: null, a1: null, started: false };
    drugPointsRef.current = [];
    darkeningEffectsRef.current = [];
    pinkMistEffectsRef.current = [];
    heartEffectsRef.current = [];
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    initializeAgents();
    draw();
  };

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
              重置
            </button>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-600 text-center">
          <p>点击画布投放药物 | Reindeer驯鹿(绿色) vs Rabbit兔子(紫色)</p>
        </div>
      </div>
    </div>
  );
};

export default Simulation;



import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowUp } from 'lucide-react';

interface GameProps {
  onClose: () => void;
}

const Game: React.FC<GameProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 游戏状态
  const gameState = useRef({
    dino: { x: 50, y: 150, width: 40, height: 40, velocityY: 0, isJumping: false },
    obstacles: [] as Array<{ x: number; y: number; width: number; height: number }>,
    groundY: 150,
    speed: 2.5,
    gravity: 0.4,
    jumpPower: -10,
    animationId: 0,
    lastObstacleX: 0, // 记录最后一个障碍物的位置
    minObstacleDistance: 300, // 障碍物之间的最小距离
    gameStartTime: 0, // 游戏开始时间
    lastScoreUpdate: 0, // 上次更新分数的时间
  });

  // 初始化游戏
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    canvas.width = 600;
    canvas.height = 200;

    const draw = () => {
      if (!ctx) return;

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制背景
      ctx.fillStyle = '#F8F6FA';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制地面
      ctx.fillStyle = '#E8F9F6';
      ctx.fillRect(0, gameState.current.groundY + 40, canvas.width, 10);

      const state = gameState.current;

      // 绘制角色（紫色矩形）
      ctx.fillStyle = '#7B5B89';
      ctx.fillRect(state.dino.x, state.dino.y, state.dino.width, state.dino.height);

      // 绘制障碍物（薄荷绿矩形）
      state.obstacles.forEach(obstacle => {
        ctx.fillStyle = '#6BD4C0';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      });

      // 绘制分数（根据数字改变颜色）
      const scoreStr = score.toString();
      const hasSix = scoreStr.includes('6');
      const hasSeven = scoreStr.includes('7');
      const indexOfSix = scoreStr.indexOf('6');
      const indexOfSeven = scoreStr.indexOf('7');
      
      if (hasSix && hasSeven && indexOfSix < indexOfSeven) {
        // 6在7前面（如67、167）：粉色
        ctx.fillStyle = 'rgba(242, 182, 251, 0.9)';
      } else if (hasSix) {
        // 包含6：薄荷绿
        ctx.fillStyle = '#6BD4C0';
      } else if (hasSeven) {
        // 包含7：浅紫色
        ctx.fillStyle = '#9D8AB5';
      } else {
        // 都不包含：深紫色
        ctx.fillStyle = '#796384';
      }
      
      ctx.font = '20px Inter';
      ctx.fillText(`Score: ${score}`, 20, 30);

      if (gameOver) {
        // 游戏结束界面（去掉变暗效果）
        ctx.fillStyle = 'rgba(251, 182, 206, 0.9)'; // 浅粉色带透明度
        ctx.font = 'bold 32px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('喜结连理！', canvas.width / 2, canvas.height / 2 - 30);
        
        // 按下空格再试一次 - 深紫色
        ctx.fillStyle = '#7B5B89'; // 深紫色
        ctx.font = '18px Inter';
        ctx.fillText('按下空格再试一次', canvas.width / 2, canvas.height / 2 + 5);
        
        // 希斯克利夫加油～ - 小字细字薄荷绿
        ctx.fillStyle = '#6BD4C0'; // 薄荷绿
        ctx.font = '14px Inter';
        ctx.fillText('希斯克利夫加油～', canvas.width / 2, canvas.height / 2 + 30);
        
        ctx.textAlign = 'left';
      } else if (!isPlaying) {
        ctx.fillStyle = '#7B5B89';
        ctx.font = '20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to start', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
      }
    };

    const update = () => {
      if (!isPlaying || gameOver) {
        draw();
        return;
      }

      const state = gameState.current;

      // 更新角色（跳跃物理）
      if (state.dino.isJumping) {
        state.dino.velocityY += state.gravity;
        state.dino.y += state.dino.velocityY;

        if (state.dino.y >= state.groundY) {
          state.dino.y = state.groundY;
          state.dino.velocityY = 0;
          state.dino.isJumping = false;
        }
      }

      // 生成障碍物（提高生成频率，并确保有足够距离，游戏开始3秒后才生成）
      const timeSinceStart = Date.now() - state.gameStartTime;
      const shouldSpawn = isPlaying && 
                          timeSinceStart > 500 && // 游戏开始3秒后才生成障碍物
                          Math.random() < 0.01 && // 提高生成概率
                          (canvas.width - state.lastObstacleX) >= state.minObstacleDistance;
      
      if (shouldSpawn) {
        state.obstacles.push({
          x: canvas.width,
          y: state.groundY,
          width: 30,
          height: 25, // 降低障碍物高度，更容易跳过
        });
        state.lastObstacleX = canvas.width;
      }
      
      // 更新最后一个障碍物位置
      if (state.obstacles.length > 0) {
        const rightmostObstacle = state.obstacles.reduce((rightmost, obstacle) => 
          obstacle.x > rightmost.x ? obstacle : rightmost
        );
        state.lastObstacleX = rightmostObstacle.x;
      }

      // 更新障碍物
      state.obstacles = state.obstacles
        .map(obstacle => ({
          ...obstacle,
          x: obstacle.x - state.speed,
        }))
        .filter(obstacle => obstacle.x > -obstacle.width);

      // 碰撞检测（添加一些容差，避免过于敏感）
      state.obstacles.forEach(obstacle => {
        const dinoRight = state.dino.x + state.dino.width;
        const dinoBottom = state.dino.y + state.dino.height;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleBottom = obstacle.y + obstacle.height;
        
        // 检查是否有重叠（添加5像素容差）
        if (
          state.dino.x < obstacleRight - 5 &&
          dinoRight > obstacle.x + 5 &&
          state.dino.y < obstacleBottom - 5 &&
          dinoBottom > obstacle.y + 5
        ) {
          setGameOver(true);
          setIsPlaying(false);
        }
      });

      // 更新分数（每秒增加1分）
      const now = Date.now();
      if (now - state.lastScoreUpdate >= 1000) { // 每1000毫秒（1秒）更新一次
        setScore(prev => {
          const newScore = prev + 1;
        // 增加难度（速度增长）
        if (newScore % 6 === 0 && newScore > 0) {
          state.speed += 0.2;
        }
          return newScore;
        });
        state.lastScoreUpdate = now;
      }

      draw();
    };

    const gameLoop = () => {
      update();
      gameState.current.animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(gameState.current.animationId);
    };
  }, [isPlaying, gameOver, score]);

  // 键盘控制
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      const state = gameState.current;

      if (gameOver) {
        // 重置游戏
        setGameOver(false);
        setScore(0);
        setIsPlaying(true);
        const now = Date.now();
        state.dino.y = state.groundY;
        state.dino.velocityY = 0;
        state.dino.isJumping = false;
        state.obstacles = [];
        state.speed = 2.5;
        state.lastObstacleX = 0;
        state.gameStartTime = now;
        state.lastScoreUpdate = now;
      } else if (!isPlaying) {
        setIsPlaying(true);
        const now = Date.now();
        gameState.current.gameStartTime = now;
        gameState.current.lastScoreUpdate = now;
      } else if (!state.dino.isJumping) {
        // 跳跃
        state.dino.velocityY = state.jumpPower;
        state.dino.isJumping = true;
      }
    }
  }, [isPlaying, gameOver]);

  // 处理跳跃动作（用于按钮点击和触摸）
  const handleJump = useCallback(() => {
    const state = gameState.current;

    if (gameOver) {
      // 重置游戏
      setGameOver(false);
      setScore(0);
      setIsPlaying(true);
      const now = Date.now();
      state.dino.y = state.groundY;
      state.dino.velocityY = 0;
      state.dino.isJumping = false;
      state.obstacles = [];
      state.speed = 2.5;
      state.lastObstacleX = 0;
      state.gameStartTime = now;
      state.lastScoreUpdate = now;
    } else if (!isPlaying) {
      setIsPlaying(true);
      const now = Date.now();
      gameState.current.gameStartTime = now;
      gameState.current.lastScoreUpdate = now;
    } else if (!state.dino.isJumping) {
      // 跳跃
      state.dino.velocityY = state.jumpPower;
      state.dino.isJumping = true;
    }
  }, [isPlaying, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full">
        <div className="flex justify-end items-center mb-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#E8F9F6] rounded-lg transition-colors"
            aria-label="Close game"
          >
            <X size={24} className="text-[#7B5B89]" />
          </button>
        </div>
        <div className="bg-[#F8F6FA] rounded-lg p-4 border-2 border-[#E8F9F6]">
          <canvas
            ref={canvasRef}
            className="w-full h-auto border border-[#D4F4EC] rounded"
            style={{ maxHeight: '400px' }}
          />
        </div>
        {/* 移动端跳跃按钮 */}
        <button
          onClick={handleJump}
          className="md:hidden w-full mt-4 py-4 bg-[#E8E0ED] hover:bg-[#9D8AB5] active:bg-[#7B5B89] text-[#7B5B89] hover:text-white rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95"
        >
          <ArrowUp size={24} />
          <span>跳跃</span>
        </button>
        <div className="mt-4 text-sm text-gray-600 text-center">
          <p className="hidden md:block">按 <kbd className="px-2 py-1 bg-[#E8F9F6] rounded text-[#7B5B89]">空格键</kbd> 开始/跳跃</p>
          <p className="md:hidden">点击上方按钮开始/跳跃</p>
        </div>
      </div>
    </div>
  );
};

export default Game;


import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface GameState {
  bird: {
    x: number;
    y: number;
    velocity: number;
    size: number;
  };
  bullets: Array<{
    x: number;
    y: number;
    velocity: number;
    size: number;
  }>;
  enemies: Array<{
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    size: number;
    type: 'top' | 'bottom' | 'left' | 'right';
  }>;
  obstacles: Array<{
    x: number;
    topHeight: number;
    gap: number;
    width: number;
  }>;
  score: number;
  gameRunning: boolean;
  gameOver: boolean;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const BIRD_SIZE = 30;
const BULLET_SIZE = 8;
const BULLET_SPEED = 8;
const OBSTACLE_WIDTH = 60;
const OBSTACLE_GAP = 200;
const ENEMY_SIZE = 25;

// SVG Components
const BirdSVG = ({ x, y, size, velocity }: { x: number; y: number; size: number; velocity: number }) => {
  const rotation = Math.max(-30, Math.min(30, velocity * 3));
  
  return (
    <g transform={`translate(${x + size/2}, ${y + size/2}) rotate(${rotation})`}>
      {/* Bird Body */}
      <ellipse cx="0" cy="0" rx={size/2} ry={size/3} fill="url(#birdGradient)" stroke="#2d5a3d" strokeWidth="2"/>
      
      {/* Wing */}
      <ellipse cx="-5" cy="-2" rx={size/3} ry={size/4} fill="#4ade80" opacity="0.8">
        <animateTransform 
          attributeName="transform" 
          type="rotate" 
          values="0;-15;0" 
          dur="0.3s" 
          repeatCount="indefinite"
        />
      </ellipse>
      
      {/* Eye */}
      <circle cx={size/4} cy="-5" r="4" fill="white"/>
      <circle cx={size/4 + 2} cy="-5" r="2" fill="black"/>
      
      {/* Beak */}
      <polygon points={`${size/2},0 ${size/2 + 8},-3 ${size/2 + 8},3`} fill="#fbbf24"/>
    </g>
  );
};

const EnemySVG = ({ x, y, size, type }: { x: number; y: number; size: number; type: string }) => {
  const enemyTypes = {
    top: {
      body: 'url(#enemyGradientRed)',
      accent: '#ef4444',
      shape: 'spike'
    },
    bottom: {
      body: 'url(#enemyGradientPurple)',
      accent: '#a855f7',
      shape: 'tentacle'
    },
    left: {
      body: 'url(#enemyGradientOrange)',
      accent: '#f97316',
      shape: 'crystal'
    },
    right: {
      body: 'url(#enemyGradientBlue)',
      accent: '#3b82f6',
      shape: 'plasma'
    }
  };

  const enemy = enemyTypes[type as keyof typeof enemyTypes] || enemyTypes.top;
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Main Body - Smooth and elegant */}
      <circle cx={size/2} cy={size/2} r={size/2 - 2} fill={enemy.body} stroke={enemy.accent} strokeWidth="1.5" opacity="0.9">
        <animate attributeName="r" values={`${size/2 - 2};${size/2};${size/2 - 2}`} dur="2s" repeatCount="indefinite"/>
      </circle>
      
      {/* Inner glow */}
      <circle cx={size/2} cy={size/2} r={size/3} fill={enemy.accent} opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      
      {/* Type-specific decorations */}
      {enemy.shape === 'spike' && (
        <g opacity="0.8">
          {/* Top spikes */}
          <polygon points={`${size/2},2 ${size/2-4},${size/3} ${size/2+4},${size/3}`} fill={enemy.accent}>
            <animateTransform attributeName="transform" type="rotate" values="0;360" dur="3s" repeatCount="indefinite" transformOrigin={`${size/2} ${size/2}`}/>
          </polygon>
          <polygon points={`${size-2},${size/2} ${size-size/3},${size/2-4} ${size-size/3},${size/2+4}`} fill={enemy.accent}>
            <animateTransform attributeName="transform" type="rotate" values="0;360" dur="3s" repeatCount="indefinite" transformOrigin={`${size/2} ${size/2}`}/>
          </polygon>
          <polygon points={`${size/2},${size-2} ${size/2-4},${size-size/3} ${size/2+4},${size-size/3}`} fill={enemy.accent}>
            <animateTransform attributeName="transform" type="rotate" values="0;360" dur="3s" repeatCount="indefinite" transformOrigin={`${size/2} ${size/2}`}/>
          </polygon>
          <polygon points={`2,${size/2} ${size/3},${size/2-4} ${size/3},${size/2+4}`} fill={enemy.accent}>
            <animateTransform attributeName="transform" type="rotate" values="0;360" dur="3s" repeatCount="indefinite" transformOrigin={`${size/2} ${size/2}`}/>
          </polygon>
        </g>
      )}
      
      {enemy.shape === 'tentacle' && (
        <g opacity="0.7">
          {/* Flowing tentacles */}
          <path d={`M${size/2},${size/2} Q${size/2-8},${size/2-8} ${size/2-12},${size/2+6}`} stroke={enemy.accent} strokeWidth="3" fill="none">
            <animate attributeName="d" values={`M${size/2},${size/2} Q${size/2-8},${size/2-8} ${size/2-12},${size/2+6};M${size/2},${size/2} Q${size/2-6},${size/2-10} ${size/2-10},${size/2+8};M${size/2},${size/2} Q${size/2-8},${size/2-8} ${size/2-12},${size/2+6}`} dur="2s" repeatCount="indefinite"/>
          </path>
          <path d={`M${size/2},${size/2} Q${size/2+8},${size/2-8} ${size/2+12},${size/2+6}`} stroke={enemy.accent} strokeWidth="3" fill="none">
            <animate attributeName="d" values={`M${size/2},${size/2} Q${size/2+8},${size/2-8} ${size/2+12},${size/2+6};M${size/2},${size/2} Q${size/2+6},${size/2-10} ${size/2+10},${size/2+8};M${size/2},${size/2} Q${size/2+8},${size/2-8} ${size/2+12},${size/2+6}`} dur="2s" repeatCount="indefinite"/>
          </path>
        </g>
      )}
      
      {enemy.shape === 'crystal' && (
        <g opacity="0.8">
          {/* Crystal facets */}
          <polygon points={`${size/2},${size/4} ${size/4},${size/2} ${size/2},${3*size/4} ${3*size/4},${size/2}`} fill={enemy.accent} opacity="0.4">
            <animateTransform attributeName="transform" type="rotate" values="0;180;0" dur="4s" repeatCount="indefinite" transformOrigin={`${size/2} ${size/2}`}/>
          </polygon>
          <polygon points={`${size/2-6},${size/2-6} ${size/2+6},${size/2-6} ${size/2},${size/2+6}`} fill={enemy.accent} opacity="0.6">
            <animateTransform attributeName="transform" type="rotate" values="0;-180;0" dur="4s" repeatCount="indefinite" transformOrigin={`${size/2} ${size/2}`}/>
          </polygon>
        </g>
      )}
      
      {enemy.shape === 'plasma' && (
        <g opacity="0.7">
          {/* Plasma energy */}
          <circle cx={size/2-6} cy={size/2-6} r="3" fill={enemy.accent} opacity="0.8">
            <animate attributeName="cx" values={`${size/2-6};${size/2+6};${size/2-6}`} dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="cy" values={`${size/2-6};${size/2+6};${size/2-6}`} dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx={size/2+6} cy={size/2+6} r="2" fill={enemy.accent} opacity="0.6">
            <animate attributeName="cx" values={`${size/2+6};${size/2-6};${size/2+6}`} dur="2s" repeatCount="indefinite"/>
            <animate attributeName="cy" values={`${size/2+6};${size/2-6};${size/2+6}`} dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx={size/2} cy={size/2-8} r="2.5" fill={enemy.accent} opacity="0.7">
            <animate attributeName="cy" values={`${size/2-8};${size/2+8};${size/2-8}`} dur="1.2s" repeatCount="indefinite"/>
          </circle>
        </g>
      )}
      
      {/* Elegant eyes */}
      <circle cx={size/2-4} cy={size/2-3} r="2.5" fill="white" opacity="0.9"/>
      <circle cx={size/2+4} cy={size/2-3} r="2.5" fill="white" opacity="0.9"/>
      <circle cx={size/2-4} cy={size/2-3} r="1.2" fill={enemy.accent}>
        <animate attributeName="r" values="1.2;0.8;1.2" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx={size/2+4} cy={size/2-3} r="1.2" fill={enemy.accent}>
        <animate attributeName="r" values="1.2;0.8;1.2" dur="3s" repeatCount="indefinite"/>
      </circle>
    </g>
  );
};

const BulletSVG = ({ x, y, size }: { x: number; y: number; size: number }) => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={size/2} cy={size/2} r={size/2} fill="url(#bulletGradient)" opacity="0.9">
        <animate attributeName="opacity" values="0.9;1;0.9" dur="0.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx={size/2} cy={size/2} r={size/4} fill="#fef3c7">
        <animate attributeName="r" values={`${size/4};${size/3};${size/4}`} dur="0.3s" repeatCount="indefinite"/>
      </circle>
    </g>
  );
};

export const FlipShootGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const keysRef = useRef<Set<string>>(new Set());
  
  const [gameState, setGameState] = useState<GameState>({
    bird: {
      x: 100,
      y: CANVAS_HEIGHT / 2,
      velocity: 0,
      size: BIRD_SIZE
    },
    bullets: [],
    enemies: [],
    obstacles: [],
    score: 0,
    gameRunning: false,
    gameOver: false
  });

  const resetGame = useCallback(() => {
    setGameState({
      bird: {
        x: 100,
        y: CANVAS_HEIGHT / 2,
        velocity: 0,
        size: BIRD_SIZE
      },
      bullets: [],
      enemies: [],
      obstacles: [
        { x: 400, topHeight: 150, gap: OBSTACLE_GAP, width: OBSTACLE_WIDTH },
        { x: 700, topHeight: 250, gap: OBSTACLE_GAP, width: OBSTACLE_WIDTH }
      ],
      score: 0,
      gameRunning: true,
      gameOver: false
    });
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    keysRef.current.add(event.code);
    event.preventDefault();
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysRef.current.delete(event.code);
    event.preventDefault();
  }, []);

  const handleShoot = useCallback(() => {
    if (!gameState.gameRunning || gameState.gameOver) return;
    
    setGameState(prev => ({
      ...prev,
      bullets: [...prev.bullets, {
        x: prev.bird.x + prev.bird.size,
        y: prev.bird.y + prev.bird.size / 2,
        velocity: BULLET_SPEED,
        size: BULLET_SIZE
      }]
    }));
  }, [gameState.gameRunning, gameState.gameOver]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    handleShoot();
  }, [handleShoot]);

  const checkCollisions = useCallback((state: GameState): GameState => {
    const { bird, bullets, enemies, obstacles } = state;
    let newEnemies = [...enemies];
    let newBullets = [...bullets];
    let newScore = state.score;
    let gameOver = false;

    // Check bullet-enemy collisions
    for (let bulletIndex = newBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
      const bullet = newBullets[bulletIndex];
      for (let enemyIndex = newEnemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = newEnemies[enemyIndex];
        const dx = (bullet.x + bullet.size/2) - (enemy.x + enemy.size/2);
        const dy = (bullet.y + bullet.size/2) - (enemy.y + enemy.size/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (bullet.size/2 + enemy.size/2)) {
          newBullets.splice(bulletIndex, 1);
          newEnemies.splice(enemyIndex, 1);
          newScore += 10;
          break;
        }
      }
    }

    // Check bird-enemy collisions
    newEnemies.forEach(enemy => {
      const dx = (bird.x + bird.size/2) - (enemy.x + enemy.size/2);
      const dy = (bird.y + bird.size/2) - (enemy.y + enemy.size/2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < (bird.size/2 + enemy.size/2)) {
        gameOver = true;
      }
    });

    // Check bird-obstacle collisions
    obstacles.forEach(obstacle => {
      if (bird.x + bird.size > obstacle.x && 
          bird.x < obstacle.x + obstacle.width) {
        if (bird.y < obstacle.topHeight || 
            bird.y + bird.size > obstacle.topHeight + obstacle.gap) {
          gameOver = true;
        }
      }
    });

    return {
      ...state,
      bullets: newBullets,
      enemies: newEnemies,
      score: newScore,
      gameOver,
      gameRunning: !gameOver
    };
  }, []);

  const updateGame = useCallback(() => {
    setGameState(prevState => {
      if (!prevState.gameRunning) return prevState;
      
      let newState = { ...prevState };

      // Handle input
      if (keysRef.current.has('Space')) {
        newState.bird.velocity = JUMP_FORCE;
      }

      // Update bird physics
      newState.bird.velocity += GRAVITY;
      newState.bird.y += newState.bird.velocity;

      // Keep bird in bounds
      if (newState.bird.y < 0) {
        newState.bird.y = 0;
        newState.bird.velocity = 0;
      }
      if (newState.bird.y > CANVAS_HEIGHT - newState.bird.size) {
        newState.bird.y = CANVAS_HEIGHT - newState.bird.size;
        newState.gameOver = true;
        newState.gameRunning = false;
      }

      // Update bullets
      newState.bullets = newState.bullets
        .map(bullet => ({
          ...bullet,
          x: bullet.x + bullet.velocity
        }))
        .filter(bullet => bullet.x < CANVAS_WIDTH);

      // Update obstacles
      newState.obstacles = newState.obstacles.map(obstacle => ({
        ...obstacle,
        x: obstacle.x - 3
      }));

      // Add new obstacles
      if (newState.obstacles.length < 4 && 
          newState.obstacles[newState.obstacles.length - 1].x < CANVAS_WIDTH - 300) {
        newState.obstacles.push({
          x: CANVAS_WIDTH,
          topHeight: Math.random() * 200 + 100,
          gap: OBSTACLE_GAP,
          width: OBSTACLE_WIDTH
        });
      }

      // Remove off-screen obstacles and add score
      newState.obstacles = newState.obstacles.filter(obstacle => {
        if (obstacle.x + obstacle.width < 0) {
          newState.score += 1;
          return false;
        }
        return true;
      });

      // Update enemies
      newState.enemies = newState.enemies
        .map(enemy => ({
          ...enemy,
          x: enemy.x + enemy.velocityX,
          y: enemy.y + enemy.velocityY
        }))
        .filter(enemy => 
          enemy.x > -enemy.size && 
          enemy.x < CANVAS_WIDTH + enemy.size &&
          enemy.y > -enemy.size && 
          enemy.y < CANVAS_HEIGHT + enemy.size
        );

      // Spawn enemies randomly
      if (Math.random() < 0.02) {
        const enemyType = ['top', 'bottom', 'left', 'right'][Math.floor(Math.random() * 4)] as any;
        let enemy;
        
        switch (enemyType) {
          case 'top':
            enemy = {
              x: Math.random() * CANVAS_WIDTH,
              y: -ENEMY_SIZE,
              velocityX: (Math.random() - 0.5) * 2,
              velocityY: 2,
              size: ENEMY_SIZE,
              type: enemyType
            };
            break;
          case 'bottom':
            enemy = {
              x: Math.random() * CANVAS_WIDTH,
              y: CANVAS_HEIGHT + ENEMY_SIZE,
              velocityX: (Math.random() - 0.5) * 2,
              velocityY: -2,
              size: ENEMY_SIZE,
              type: enemyType
            };
            break;
          case 'left':
            enemy = {
              x: -ENEMY_SIZE,
              y: Math.random() * CANVAS_HEIGHT,
              velocityX: 2,
              velocityY: (Math.random() - 0.5) * 2,
              size: ENEMY_SIZE,
              type: enemyType
            };
            break;
          case 'right':
            enemy = {
              x: CANVAS_WIDTH + ENEMY_SIZE,
              y: Math.random() * CANVAS_HEIGHT,
              velocityX: -2,
              velocityY: (Math.random() - 0.5) * 2,
              size: ENEMY_SIZE,
              type: enemyType
            };
            break;
        }
        
        newState.enemies.push(enemy);
      }

      // Check collisions
      return checkCollisions(newState);
    });
  }, [checkCollisions]);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, 'hsl(202, 100%, 85%)');
    gradient.addColorStop(0.7, 'hsl(215, 85%, 75%)');
    gradient.addColorStop(1, 'hsl(195, 75%, 70%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 5; i++) {
      const x = (i * 200 + (Date.now() / 50) % 1000) % (CANVAS_WIDTH + 100);
      const y = 50 + i * 30;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, 2 * Math.PI);
      ctx.arc(x + 25, y, 30, 0, 2 * Math.PI);
      ctx.arc(x + 50, y, 20, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = 'hsl(120, 50%, 30%)';
    ctx.fillRect(0, CANVAS_HEIGHT - 40, CANVAS_WIDTH, 40);
  }, []);

  const drawObstacles = useCallback((ctx: CanvasRenderingContext2D, obstacles: GameState['obstacles']) => {
    ctx.fillStyle = 'hsl(220, 15%, 25%)';
    ctx.strokeStyle = 'hsl(220, 20%, 35%)';
    ctx.lineWidth = 3;
    
    obstacles.forEach(obstacle => {
      // Top obstacle
      ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.topHeight);
      ctx.strokeRect(obstacle.x, 0, obstacle.width, obstacle.topHeight);
      
      // Bottom obstacle
      const bottomY = obstacle.topHeight + obstacle.gap;
      ctx.fillRect(obstacle.x, bottomY, obstacle.width, CANVAS_HEIGHT - bottomY);
      ctx.strokeRect(obstacle.x, bottomY, obstacle.width, CANVAS_HEIGHT - bottomY);
      
      // Caps
      ctx.fillStyle = 'hsl(220, 20%, 35%)';
      ctx.fillRect(obstacle.x - 5, obstacle.topHeight - 20, obstacle.width + 10, 20);
      ctx.fillRect(obstacle.x - 5, bottomY, obstacle.width + 10, 20);
      ctx.fillStyle = 'hsl(220, 15%, 25%)';
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBackground(ctx);
    drawObstacles(ctx, gameState.obstacles);
  }, [gameState.obstacles, drawBackground, drawObstacles]);

  useEffect(() => {
    const handleKeyDownGlobal = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        if (event.code === 'Enter') {
          handleShoot();
        }
        handleKeyDown(event);
      }
    };

    const handleKeyUpGlobal = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        handleKeyUp(event);
      }
    };

    document.addEventListener('keydown', handleKeyDownGlobal);
    document.addEventListener('keyup', handleKeyUpGlobal);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDownGlobal);
      document.removeEventListener('keyup', handleKeyUpGlobal);
    };
  }, [handleKeyDown, handleKeyUp, handleShoot]);

  useEffect(() => {
    if (gameState.gameRunning) {
      gameLoopRef.current = setInterval(() => {
        updateGame();
        draw();
      }, 16);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.gameRunning, updateGame, draw]);

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gradient-sky min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          🚁 Flip & Shoot Bird 🎯
        </h1>
        <p className="text-muted-foreground">
          <kbd className="px-2 py-1 bg-secondary rounded">ESPAÇO</kbd> para voar • 
          <kbd className="px-2 py-1 bg-secondary rounded">CLIQUE</kbd> ou 
          <kbd className="px-2 py-1 bg-secondary rounded">ENTER</kbd> para atirar
        </p>
      </div>

      <Card className="p-6 shadow-game">
        <div className="flex justify-between items-center mb-4">
          <div className="text-2xl font-bold text-game-gold">
            🏆 Pontos: {gameState.score}
          </div>
          <div className="flex gap-2">
            {!gameState.gameRunning && (
              <Button 
                onClick={resetGame}
                className="bg-game-success hover:bg-game-success/90"
              >
                {gameState.gameOver ? '🔄 Reiniciar' : '🚀 Iniciar'}
              </Button>
            )}
          </div>
        </div>
        
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            className="border-2 border-border rounded-lg cursor-crosshair absolute"
          />
          
          <svg
            ref={svgRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-border rounded-lg cursor-crosshair pointer-events-none"
            style={{ position: 'relative', zIndex: 10 }}
          >
            <defs>
              <linearGradient id="birdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(120, 75%, 55%)" />
                <stop offset="100%" stopColor="hsl(120, 85%, 35%)" />
              </linearGradient>
              
              {/* Enemy Gradients for Different Types */}
              <radialGradient id="enemyGradientRed" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="hsl(0, 85%, 75%)" />
                <stop offset="100%" stopColor="hsl(0, 75%, 45%)" />
              </radialGradient>
              
              <radialGradient id="enemyGradientPurple" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="hsl(280, 85%, 75%)" />
                <stop offset="100%" stopColor="hsl(280, 75%, 45%)" />
              </radialGradient>
              
              <radialGradient id="enemyGradientOrange" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="hsl(25, 95%, 75%)" />
                <stop offset="100%" stopColor="hsl(25, 85%, 45%)" />
              </radialGradient>
              
              <radialGradient id="enemyGradientBlue" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="hsl(220, 85%, 75%)" />
                <stop offset="100%" stopColor="hsl(220, 75%, 45%)" />
              </radialGradient>
              
              <radialGradient id="bulletGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(45, 95%, 65%)" />
                <stop offset="100%" stopColor="hsl(40, 85%, 45%)" />
              </radialGradient>
            </defs>
            
            {/* Render Bird */}
            <BirdSVG 
              x={gameState.bird.x} 
              y={gameState.bird.y} 
              size={gameState.bird.size}
              velocity={gameState.bird.velocity}
            />
            
            {/* Render Bullets */}
            {gameState.bullets.map((bullet, index) => (
              <BulletSVG 
                key={index}
                x={bullet.x} 
                y={bullet.y} 
                size={bullet.size}
              />
            ))}
            
            {/* Render Enemies */}
            {gameState.enemies.map((enemy, index) => (
              <EnemySVG 
                key={index}
                x={enemy.x} 
                y={enemy.y} 
                size={enemy.size}
                type={enemy.type}
              />
            ))}
          </svg>
          
          {gameState.gameOver && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-20">
              <div className="text-center text-white">
                <h2 className="text-3xl font-bold mb-2">💥 Game Over! 💥</h2>
                <p className="text-xl mb-4">🏆 Pontuação Final: {gameState.score}</p>
                <Button 
                  onClick={resetGame}
                  className="bg-game-success hover:bg-game-success/90"
                >
                  🔄 Jogar Novamente
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground text-center space-y-1">
          <p>🎯 Atire nos inimigos vermelhos para ganhar pontos (+10)</p>
          <p>🚀 Desvie dos obstáculos cinzas (+1 por obstáculo passado)</p>
          <p>🎮 Controles: ESPAÇO = voar | CLIQUE/ENTER = atirar</p>
        </div>
      </Card>
    </div>
  );
};

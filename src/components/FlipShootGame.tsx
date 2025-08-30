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

export const FlipShootGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysRef.current.delete(event.code);
  }, []);

  const handleClick = useCallback(() => {
    if (!gameState.gameRunning) return;
    
    setGameState(prev => ({
      ...prev,
      bullets: [...prev.bullets, {
        x: prev.bird.x + prev.bird.size,
        y: prev.bird.y + prev.bird.size / 2,
        velocity: BULLET_SPEED,
        size: BULLET_SIZE
      }]
    }));
  }, [gameState.gameRunning]);

  const checkCollisions = useCallback((state: GameState): GameState => {
    const { bird, bullets, enemies, obstacles } = state;
    let newEnemies = [...enemies];
    let newBullets = [...bullets];
    let newScore = state.score;

    // Check bullet-enemy collisions
    newBullets.forEach((bullet, bulletIndex) => {
      newEnemies.forEach((enemy, enemyIndex) => {
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < bullet.size + enemy.size) {
          newBullets.splice(bulletIndex, 1);
          newEnemies.splice(enemyIndex, 1);
          newScore += 10;
        }
      });
    });

    // Check bird-enemy collisions
    newEnemies.forEach(enemy => {
      const dx = bird.x - enemy.x;
      const dy = bird.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < bird.size + enemy.size) {
        return { ...state, gameOver: true, gameRunning: false };
      }
    });

    // Check bird-obstacle collisions
    obstacles.forEach(obstacle => {
      if (bird.x + bird.size > obstacle.x && 
          bird.x < obstacle.x + obstacle.width) {
        if (bird.y < obstacle.topHeight || 
            bird.y + bird.size > obstacle.topHeight + obstacle.gap) {
          return { ...state, gameOver: true, gameRunning: false };
        }
      }
    });

    return {
      ...state,
      bullets: newBullets,
      enemies: newEnemies,
      score: newScore
    };
  }, []);

  const updateGame = useCallback(() => {
    if (!gameState.gameRunning) return;

    setGameState(prevState => {
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
  }, [gameState.gameRunning, checkCollisions]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, 'hsl(202, 100%, 85%)');
    gradient.addColorStop(1, 'hsl(215, 85%, 75%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw obstacles
    ctx.fillStyle = 'hsl(220, 15%, 25%)';
    gameState.obstacles.forEach(obstacle => {
      // Top obstacle
      ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.topHeight);
      // Bottom obstacle
      ctx.fillRect(obstacle.x, obstacle.topHeight + obstacle.gap, obstacle.width, 
                   CANVAS_HEIGHT - obstacle.topHeight - obstacle.gap);
    });

    // Draw bird
    ctx.fillStyle = 'hsl(120, 75%, 45%)';
    ctx.beginPath();
    ctx.arc(gameState.bird.x + gameState.bird.size / 2, 
            gameState.bird.y + gameState.bird.size / 2, 
            gameState.bird.size / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw bullets
    ctx.fillStyle = 'hsl(45, 95%, 55%)';
    gameState.bullets.forEach(bullet => {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw enemies
    ctx.fillStyle = 'hsl(0, 85%, 60%)';
    gameState.enemies.forEach(enemy => {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [gameState]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

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
          Flip & Shoot Bird
        </h1>
        <p className="text-muted-foreground">
          Espaço para voar • Clique para atirar
        </p>
      </div>

      <Card className="p-6 shadow-game">
        <div className="flex justify-between items-center mb-4">
          <div className="text-2xl font-bold text-game-gold">
            Pontos: {gameState.score}
          </div>
          <div className="flex gap-2">
            {!gameState.gameRunning && (
              <Button 
                onClick={resetGame}
                className="bg-game-success hover:bg-game-success/90"
              >
                {gameState.gameOver ? 'Reiniciar' : 'Iniciar'}
              </Button>
            )}
          </div>
        </div>
        
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleClick}
            className="border-2 border-border rounded-lg cursor-pointer"
          />
          
          {gameState.gameOver && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <h2 className="text-3xl font-bold mb-2">Game Over!</h2>
                <p className="text-xl mb-4">Pontuação Final: {gameState.score}</p>
                <Button 
                  onClick={resetGame}
                  className="bg-game-success hover:bg-game-success/90"
                >
                  Jogar Novamente
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground text-center">
          <p>🎯 Atire nos inimigos vermelhos para ganhar pontos</p>
          <p>🚀 Desvie dos obstáculos cinzas</p>
          <p>🎮 Use ESPAÇO para voar e CLIQUE para atirar</p>
        </div>
      </Card>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 }; // Moving up
const INITIAL_SPEED = 150;
const MIN_SPEED = 50;
const SPEED_DECREMENT = 2;

type Point = { x: number; y: number };

export default function App() {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [highScore, setHighScore] = useState(0);

  // Use refs to access latest state inside the game loop interval
  const snakeRef = useRef(snake);
  const directionRef = useRef(direction);
  const lastProcessedDirectionRef = useRef(direction);
  const foodRef = useRef(food);

  // Sync refs when state changes
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { foodRef.current = food; }, [food]);

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      const isOnSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  // Initialize food correctly on mount
  useEffect(() => {
    setFood(generateFood(INITIAL_SNAKE));
    // Load high score from local storage if available
    const savedHighScore = localStorage.getItem('snakeHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, [generateFood]);

  const handleGameOver = useCallback(() => {
    setGameOver(true);
    setIsStarted(false);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snakeHighScore', score.toString());
    }
  }, [score, highScore]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    lastProcessedDirectionRef.current = INITIAL_DIRECTION;
    setFood(generateFood(INITIAL_SNAKE));
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsStarted(true); // Auto-start on reset
  };

  const handleDirectionInput = useCallback((newDir: Point) => {
    if (!isStarted && !gameOver) {
      setIsStarted(true);
    }
    
    const currentDir = lastProcessedDirectionRef.current;
    
    // Prevent 180-degree turns
    if (newDir.x !== 0 && currentDir.x !== 0) return;
    if (newDir.y !== 0 && currentDir.y !== 0) return;
    
    setDirection(newDir);
  }, [isStarted, gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver && e.key === 'Enter') {
        resetGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleDirectionInput({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          handleDirectionInput({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleDirectionInput({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleDirectionInput({ x: 1, y: 0 });
          break;
        case ' ':
          if (!isStarted && !gameOver) setIsStarted(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isStarted, handleDirectionInput]);

  // Game Loop
  useEffect(() => {
    if (!isStarted || gameOver) return;

    const gameInterval = setInterval(() => {
      const currentSnake = snakeRef.current;
      const currentDir = directionRef.current;
      const currentFood = foodRef.current;
      
      lastProcessedDirectionRef.current = currentDir;
      const head = currentSnake[0];
      const newHead = { x: head.x + currentDir.x, y: head.y + currentDir.y };

      // Check wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        handleGameOver();
        return;
      }

      // Check self collision
      if (
        currentSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)
      ) {
        handleGameOver();
        return;
      }

      const newSnake = [newHead, ...currentSnake];

      // Check food collision
      if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
        setScore((s) => s + 10);
        setSpeed((s) => Math.max(MIN_SPEED, s - SPEED_DECREMENT));
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop(); // Remove tail if no food eaten
      }

      setSnake(newSnake);
    }, speed);

    return () => clearInterval(gameInterval);
  }, [isStarted, gameOver, speed, generateFood, handleGameOver]);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center font-sans text-neutral-100 p-4 selection:bg-emerald-500/30">
      <div className="max-w-md w-full">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-6 px-1">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Snake</h1>
            <p className="text-neutral-500 text-sm font-medium">Classic arcade game</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Score</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">{score}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Best
              </span>
              <span className="text-2xl font-mono font-bold text-neutral-300">{highScore}</span>
            </div>
          </div>
        </div>

        {/* Game Grid Container */}
        <div className="relative bg-neutral-900 border border-neutral-800 p-2 rounded-xl shadow-2xl">
          <div 
            className="w-full aspect-square bg-neutral-950 rounded-lg overflow-hidden grid gap-[1px]"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
              const x = index % GRID_SIZE;
              const y = Math.floor(index / GRID_SIZE);
              
              const isFood = food.x === x && food.y === y;
              const isHead = snake[0].x === x && snake[0].y === y;
              const isBody = !isHead && snake.some((segment) => segment.x === x && segment.y === y);
              
              let cellClass = "w-full h-full rounded-sm ";
              if (isHead) {
                cellClass += "bg-emerald-400";
              } else if (isBody) {
                cellClass += "bg-emerald-500/80";
              } else if (isFood) {
                cellClass += "bg-rose-500 scale-75 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)]";
              } else {
                cellClass += "bg-neutral-900/40";
              }

              return <div key={index} className={cellClass} />;
            })}
          </div>

          {/* Overlays */}
          {(!isStarted && !gameOver && score === 0) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
              <button 
                onClick={() => setIsStarted(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-full transition-transform active:scale-95 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Game
              </button>
              <p className="text-neutral-300 text-sm mt-4 font-medium flex items-center gap-2">
                Use <span className="px-2 py-1 bg-neutral-800 rounded font-mono text-xs text-neutral-200">arrow keys</span> to move
              </p>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl">
              <div className="text-center transform animate-in fade-in zoom-in duration-300">
                <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Game Over!</h2>
                <p className="text-neutral-300 mb-6 font-medium">Final Score: <span className="text-emerald-400 font-bold">{score}</span></p>
                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 px-6 py-3 mx-auto bg-white hover:bg-neutral-200 text-neutral-950 font-bold rounded-full transition-transform active:scale-95 shadow-lg cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="mt-8 grid grid-cols-3 grid-rows-2 gap-2 max-w-[200px] mx-auto sm:hidden">
          <div />
          <button 
            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 active:bg-neutral-700 p-4 rounded-xl flex items-center justify-center transition-colors shadow-sm"
            onClick={() => handleDirectionInput({ x: 0, y: -1 })}
            aria-label="Up"
          >
            <ChevronUp className="w-8 h-8 text-neutral-400" />
          </button>
          <div />
          <button 
            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 active:bg-neutral-700 p-4 rounded-xl flex items-center justify-center transition-colors shadow-sm"
            onClick={() => handleDirectionInput({ x: -1, y: 0 })}
            aria-label="Left"
          >
            <ChevronLeft className="w-8 h-8 text-neutral-400" />
          </button>
          <button 
            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 active:bg-neutral-700 p-4 rounded-xl flex items-center justify-center transition-colors shadow-sm"
            onClick={() => handleDirectionInput({ x: 0, y: 1 })}
            aria-label="Down"
          >
            <ChevronDown className="w-8 h-8 text-neutral-400" />
          </button>
          <button 
            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 active:bg-neutral-700 p-4 rounded-xl flex items-center justify-center transition-colors shadow-sm"
            onClick={() => handleDirectionInput({ x: 1, y: 0 })}
            aria-label="Right"
          >
            <ChevronRight className="w-8 h-8 text-neutral-400" />
          </button>
        </div>

      </div>
    </div>
  );
}


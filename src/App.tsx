import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, FastForward, Rewind, Cpu, Disc, Volume2, VolumeX } from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 }; // Move up

const TRACKS = [
  { id: 1, title: 'AI Groove Alpha', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Neon Beats Beta', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'Cyber Synth Gamma', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export default function App() {
  // --- Music Player State ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  // --- Snake Game State ---
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Use a ref for direction to prevent rapid double keypresses causing reverse collision
  const currentDirectionRef = useRef(direction);

  // --- Music Player Functions ---
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio play blocked:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipTrack = (forward = true) => {
    let newIndex = currentTrackIndex + (forward ? 1 : -1);
    if (newIndex >= TRACKS.length) newIndex = 0;
    if (newIndex < 0) newIndex = TRACKS.length - 1;
    setCurrentTrackIndex(newIndex);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle auto-play when track changes if it was already playing
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Autoplay prevented on track change", e));
    }
  }, [currentTrackIndex, isPlaying]);


  // --- Snake Game Functions ---
  const generateFood = useCallback((currentSnake: {x: number, y: number}[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      const isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    currentDirectionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setFood(generateFood(INITIAL_SNAKE));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default scrolling for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (!gameStarted || gameOver) {
      if (e.key === ' ' || e.key === 'Enter') {
        resetGame();
      }
      return;
    }

    // Determine new direction based on input, preventing 180 degree turns
    const currentDir = currentDirectionRef.current;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (currentDir.y !== 1) setDirection({ x: 0, y: -1 });
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (currentDir.y !== -1) setDirection({ x: 0, y: 1 });
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (currentDir.x !== 1) setDirection({ x: -1, y: 0 });
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (currentDir.x !== -1) setDirection({ x: 1, y: 0 });
        break;
    }
  }, [gameStarted, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Main game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        currentDirectionRef.current = direction; // Update ref to match actual move executed
        const newHead = {
          x: head.x + direction.x,
          y: head.y + direction.y,
        };

        // Check Wall Collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setGameOver(true);
          return prevSnake;
        }

        // Check Self Collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check Food Collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => s + 10);
          setFood(generateFood(newSnake));
          // Don't pop, snake grows
        } else {
          newSnake.pop(); // Remove tail
        }

        return newSnake;
      });
    };

    // Increase speed slightly based on score, maxing out at roughly 60ms delay
    const baseSpeed = 150;
    const speedBoost = Math.min(Math.floor(score / 50) * 10, 90);
    const currentSpeed = baseSpeed - speedBoost;

    const gameInterval = setInterval(moveSnake, currentSpeed);
    return () => clearInterval(gameInterval);
  }, [gameStarted, gameOver, direction, food, generateFood, score]);


  return (
    <div className="min-h-screen bg-[paleblue] flex flex-col items-center justify-center font-mono selection:bg-neon-cyan/30 text-white p-4">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={TRACKS[currentTrackIndex].url}
        onEnded={() => skipTrack(true)}
      />

      {/* Header */}
      <div className="text-center mb-8 flex flex-col items-center gap-2">
        <h1 className="text-4xl md:text-5xl font-bold text-neon-pink tracking-tight uppercase">
          Neon Snake
        </h1>
        <div className="flex items-center gap-2 text-neon-cyan text-sm md:text-base glow-cyan">
          <Disc size={16} />
          <span>&amp; Grooves</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-center lg:items-start w-full max-w-5xl justify-center">
        
        {/* Snake Game Section */}
        <div className="flex flex-col items-center relative gap-6">
          
          {/* Score Display */}
          <div className="flex justify-between items-center w-full px-2">
            <div className="flex items-center gap-2 text-neon-cyan glow-cyan">
              <Cpu size={24} />
              <span className="text-xl font-bold">SCORE: {score}</span>
            </div>
            {gameOver && <span className="text-red-500 font-bold animate-pulse text-lg">GAME OVER</span>}
          </div>

          {/* Game Board */}
          <div 
            className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-black box-neon-cyan rounded-lg overflow-hidden relative border border-cyan-500/30"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
            {/* Overlay for Start/Game Over */}
            {(!gameStarted || gameOver) && (
              <div className="absolute inset-0 z-10 bg-black/70 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                <h2 className={`text-3xl font-bold mb-4 ${gameOver ? 'text-red-500' : 'text-neon-cyan'}`}>
                  {gameOver ? 'SYSTEM FAILURE' : 'READY?'}
                </h2>
                {gameOver && <p className="mb-4 text-xl">Final Score: {score}</p>}
                <button
                  onClick={resetGame}
                  className="px-6 py-3 bg-transparent border-2 border-neon-green text-neon-green rounded hover:bg-neon-green/20 hover:box-neon-green transition-all uppercase font-bold tracking-widest outline-none"
                >
                  {gameOver ? 'Restart' : 'Start'}
                </button>
                <p className="mt-4 text-gray-500 text-xs">Use Arrow Keys or WASD to move.</p>
              </div>
            )}

            {/* Grid Cells Rendering */}
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
              const x = index % GRID_SIZE;
              const y = Math.floor(index / GRID_SIZE);

              const isSnakeHead = snake[0].x === x && snake[0].y === y;
              const isSnakeBody = !isSnakeHead && snake.some(segment => segment.x === x && segment.y === y);
              const isFood = food.x === x && food.y === y;

              let cellClasses = "w-full h-full border-white/5 ";
              if (isSnakeHead) {
                cellClasses += "bg-neon-green box-neon-green-solid rounded-sm z-10 ";
              } else if (isSnakeBody) {
                cellClasses += "bg-green-400 opacity-80 ";
              } else if (isFood) {
                cellClasses += "bg-neon-pink box-neon-pink rounded-full animate-pulse ";
              }

              return <div key={index} className={cellClasses} />;
            })}
          </div>
        </div>

        {/* Music Player Section */}
        <div className="flex flex-col bg-gray-900/80 backdrop-blur-md border border-fuchsia-500/30 box-neon-pink rounded-xl p-6 w-[300px] shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-neon-pink font-bold uppercase tracking-wider flex items-center gap-2 glow-pink">
              <Disc size={18} /> Audio Feed
            </h3>
            {/* Visualizer bars mock */}
            <div className="flex gap-1 h-4 items-end">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className={`w-1.5 bg-neon-cyan ${isPlaying ? 'animate-bounce' : ''}`} 
                  style={{ height: isPlaying ? `${Math.random() * 100 + 20}%` : '20%', animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>

          {/* Track Info */}
          <div className="mb-6">
            <div className="text-xs text-fuchsia-400 mb-1">NOW PLAYING</div>
            <div className="text-lg font-bold truncate text-white" title={TRACKS[currentTrackIndex].title}>
              {TRACKS[currentTrackIndex].title}
            </div>
            <div className="text-sm text-gray-400 mt-1">AI Generated Mix {currentTrackIndex + 1} / {TRACKS.length}</div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button 
              onClick={() => skipTrack(false)} 
              className="text-gray-400 hover:text-neon-cyan transition-colors outline-none cursor-pointer hover:glow-cyan"
            >
              <Rewind size={28} />
            </button>
            
            <button 
              onClick={togglePlay} 
              className="w-14 h-14 flex items-center justify-center bg-transparent border-2 border-neon-cyan rounded-full text-neon-cyan hover:bg-neon-cyan/20 hover:box-neon-cyan transition-all outline-none cursor-pointer glow-cyan"
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} className="translate-x-0.5" />}
            </button>

            <button 
              onClick={() => skipTrack(true)} 
              className="text-gray-400 hover:text-neon-cyan transition-colors outline-none cursor-pointer hover:glow-cyan"
            >
              <FastForward size={28} />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <button onClick={toggleMute} className="text-gray-400 hover:text-neon-pink transition-colors outline-none cursor-pointer hover:glow-pink">
               {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-pink"
            />
          </div>
          
        </div>
      </div>
      
    </div>
  );
}

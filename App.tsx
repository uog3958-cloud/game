
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GameStatus, GameLog } from './types';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeyValid, setIsKeyValid] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [status, setStatus] = useState<GameStatus>(GameStatus.SETUP);
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [guess, setGuess] = useState<string>('');
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [aiMessage, setAiMessage] = useState<string>('반가워요! 숫자를 맞춰보세요.');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Initialize game
  const startGame = () => {
    const num = Math.floor(Math.random() * 100) + 1;
    setTargetNumber(num);
    setLogs([]);
    setStatus(GameStatus.PLAYING);
    setAiMessage('1부터 100 사이의 숫자를 생각했어요. 맞춰보세요!');
  };

  const validateKey = async () => {
    if (!apiKey) return;
    setIsTestingKey(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Say "READY"'
      });
      if (response.text?.includes('READY')) {
        setIsKeyValid(true);
        startGame();
      } else {
        alert('API 키가 유효하지 않거나 통신에 실패했습니다.');
      }
    } catch (error) {
      console.error(error);
      alert('API 키 테스트 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleGuess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const numGuess = parseInt(guess);
    if (isNaN(numGuess) || numGuess < 1 || numGuess > 100) {
      alert('1에서 100 사이의 숫자를 입력해주세요.');
      return;
    }

    let result: 'UP' | 'DOWN' | 'CORRECT' = 'CORRECT';
    if (numGuess < targetNumber) result = 'UP';
    else if (numGuess > targetNumber) result = 'DOWN';

    setIsAiThinking(true);
    setGuess('');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        숫자 맞추기 게임 중입니다. 정답은 ${targetNumber}이고, 사용자는 ${numGuess}를 입력했습니다.
        결과는 ${result === 'UP' ? '더 높음(UP)' : result === 'DOWN' ? '더 낮음(DOWN)' : '정답(CORRECT)'} 입니다.
        사용자에게 짧고 재미있는 도발이나 응원의 한마디를 한국어로 해주세요. 
        만약 정답을 맞췄다면 아주 거창하게 축하해주세요.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const comment = response.text || (result === 'CORRECT' ? '정답입니다!' : '틀렸어요!');
      setAiMessage(comment);

      const newLog: GameLog = {
        guess: numGuess,
        result,
        aiComment: comment,
        timestamp: Date.now()
      };

      setLogs(prev => [newLog, ...prev]);

      if (result === 'CORRECT') {
        setStatus(GameStatus.WON);
      }
    } catch (err) {
      console.error(err);
      setAiMessage(result === 'CORRECT' ? '정답입니다! (AI 연결 오류)' : `${result}! (AI 연결 오류)`);
    } finally {
      setIsAiThinking(false);
    }
  };

  if (!isKeyValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <i className="fas fa-robot text-6xl text-cyan-400 mb-4 animate-bounce"></i>
            <h1 className="text-3xl font-bold mb-2">Gemini High-Low</h1>
            <p className="text-gray-300">게임을 시작하기 위해 Google AI Studio에서 발급받은 API 키를 입력해주세요.</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="API Key 입력..."
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-white placeholder-gray-500"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              onClick={validateKey}
              disabled={isTestingKey || !apiKey}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isTestingKey ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  연결 테스트 중...
                </>
              ) : (
                <>
                  <i className="fas fa-play"></i>
                  테스트 및 시작
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center">
              * 입력하신 키는 서버에 저장되지 않으며 브라우저 세션에서만 사용됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 min-h-screen flex flex-col">
      <header className="flex justify-between items-center mb-10 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <i className="fas fa-brain text-cyan-400 text-2xl"></i>
          <h2 className="text-xl font-bold uppercase tracking-widest">Gemini High-Low</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-400">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          API Connected
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
        {/* Left Side: Game UI */}
        <div className="space-y-6">
          <div className={`relative p-8 rounded-3xl transition-all duration-500 ${status === GameStatus.WON ? 'bg-green-600/20 border-green-500/50 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'bg-white/10 border-white/10'} border flex flex-col items-center min-h-[300px] justify-center text-center overflow-hidden`}>
            {isAiThinking && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-2">
                  <i className="fas fa-circle-notch animate-spin text-4xl text-cyan-400"></i>
                  <span className="text-cyan-400 font-medium">Gemini가 생각하는 중...</span>
                </div>
              </div>
            )}
            
            <i className={`fas ${status === GameStatus.WON ? 'fa-crown text-yellow-400' : 'fa-comment-dots text-cyan-400'} text-4xl mb-6`}></i>
            <p className="text-2xl font-medium leading-relaxed italic">"{aiMessage}"</p>
          </div>

          {status === GameStatus.WON ? (
            <button
              onClick={startGame}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-2xl text-xl shadow-lg transition-transform hover:scale-105"
            >
              다시 도전하기
            </button>
          ) : (
            <form onSubmit={handleGuess} className="flex gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="1 ~ 100 사이 숫자"
                className="flex-grow bg-white/5 border border-white/20 rounded-2xl px-6 py-4 text-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                autoFocus
              />
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 px-8 py-4 rounded-2xl font-bold text-xl shadow-lg transition-transform active:scale-95"
              >
                Go!
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Log History */}
        <div className="bg-black/20 rounded-3xl border border-white/10 p-6 flex flex-col max-h-[600px]">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <i className="fas fa-history text-gray-400"></i>
            기록 ({logs.length})
          </h3>
          <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 italic">
                아직 시도한 기록이 없습니다.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.timestamp} className="bg-white/5 p-4 rounded-xl border-l-4 border-cyan-500 animate-fadeIn">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xl font-bold">내 추측: <span className="text-cyan-400">{log.guess}</span></span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      log.result === 'UP' ? 'bg-blue-500/20 text-blue-400' :
                      log.result === 'DOWN' ? 'bg-red-500/20 text-red-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {log.result}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm italic">"{log.aiComment}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto pt-10 text-center text-gray-500 text-sm">
        &copy; 2025 AI Number Master • Powered by Google Gemini 3 Flash
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease forwards;
        }
      `}</style>
    </div>
  );
};

export default App;

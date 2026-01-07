import React, { useState } from 'https://esm.sh/react@19.0.0';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.34.0';
import { GameStatus, GameLog } from './types.ts';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeyValid, setIsKeyValid] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [status, setStatus] = useState<GameStatus>(GameStatus.SETUP);
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [guess, setGuess] = useState<string>('');
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [aiMessage, setAiMessage] = useState<string>('안녕! 내가 생각한 숫자를 맞춰봐!');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // 게임 초기화
  const startGame = () => {
    const num = Math.floor(Math.random() * 100) + 1;
    setTargetNumber(num);
    setLogs([]);
    setStatus(GameStatus.PLAYING);
    setAiMessage('1부터 100 사이의 숫자를 하나 골랐어. 과연 맞출 수 있을까?');
  };

  // API 키 검증 및 통신 상태 테스트
  const validateKey = async () => {
    if (!apiKey.trim()) {
      alert('API 키를 입력해주세요.');
      return;
    }
    setIsTestingKey(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Hello, respond with exactly "CONNECTION_SUCCESS" to test the API status.',
      });
      
      if (response.text) {
        setIsKeyValid(true);
        startGame();
      }
    } catch (error) {
      console.error('API Key Test Error:', error);
      alert('API 키가 유효하지 않거나 통신에 실패했습니다. 키와 인터넷 연결을 확인해주세요.');
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
        숫자 맞추기 게임 중입니다. 
        목표 숫자: ${targetNumber}
        사용자가 입력한 숫자: ${numGuess}
        결과: ${result === 'UP' ? '더 큼(UP)' : result === 'DOWN' ? '더 작음(DOWN)' : '정답(CORRECT)'}
        사용자의 입력에 대해 한국어로 짧고 재치 있는 반응을 한 문장만 해주세요. 
        UP/DOWN 힌트를 포함하기보다는 사용자의 시도 자체에 대해 AI 친구처럼 말해주세요.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const comment = response.text?.trim() || (result === 'CORRECT' ? '정답이야! 훌륭해!' : '아깝다, 조금만 더 힘내봐!');
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
      console.error('Game logic error:', err);
      setAiMessage(result === 'CORRECT' ? '정답이야! (AI가 너무 기뻐서 말을 잃었네)' : `${result}! (통신 오류가 있지만 게임은 계속할 수 있어)`);
    } finally {
      setIsAiThinking(false);
    }
  };

  if (!isKeyValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-gray-900 via-indigo-950 to-black">
        <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-white/10">
          <div className="text-center mb-8">
            <div className="inline-block p-5 bg-cyan-500/20 rounded-3xl mb-4 border border-cyan-500/30">
              <i className="fas fa-microchip text-4xl text-cyan-400 animate-pulse"></i>
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">AI Guessing Game</h1>
            <p className="text-gray-400 text-sm">Gemini API 키를 입력하여 시작하세요</p>
          </div>
          <div className="space-y-5">
            <div className="relative">
              <input
                type="password"
                placeholder="API Key 입력"
                className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white placeholder-gray-600"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && validateKey()}
              />
              <i className="fas fa-lock absolute right-5 top-1/2 -translate-y-1/2 text-gray-600"></i>
            </div>
            <button
              onClick={validateKey}
              disabled={isTestingKey || !apiKey}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 overflow-hidden group"
            >
              {isTestingKey ? (
                <><i className="fas fa-circle-notch animate-spin"></i> 통신 테스트 중...</>
              ) : (
                <><i className="fas fa-bolt group-hover:animate-bounce"></i> 연결 및 게임 시작</>
              )}
            </button>
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
              <p className="text-[10px] text-blue-300 leading-relaxed">
                <i className="fas fa-info-circle mr-1"></i> 이 앱은 Github 및 Vercel 배포를 위해 최적화되었습니다. API 키는 통신 상태 확인을 위해 1회 테스트 후 게임 로직에만 사용됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 min-h-screen flex flex-col font-sans selection:bg-cyan-500/30">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-cyan-600 to-blue-600 p-3 rounded-2xl shadow-lg shadow-cyan-500/20">
            <i className="fas fa-robot text-white text-2xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-none">Gemini High-Low</h2>
            <p className="text-xs text-cyan-500 font-bold tracking-widest uppercase mt-1">AI Interactive Session</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5"
        >
          <i className="fas fa-sign-out-alt"></i> 키 변경하기
        </button>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        <div className="lg:col-span-8 space-y-8">
          {/* AI 스테이지 */}
          <div className={`relative p-12 rounded-[3rem] transition-all duration-1000 min-h-[400px] flex flex-col items-center justify-center text-center overflow-hidden border-2 ${
            status === GameStatus.WON 
            ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_80px_rgba(34,197,94,0.15)]' 
            : 'bg-white/5 border-white/5 shadow-2xl'
          }`}>
            {isAiThinking && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin"></div>
                    <i className="fas fa-brain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 text-3xl animate-pulse"></i>
                  </div>
                  <span className="text-cyan-400 font-black tracking-[0.3em] text-sm">GEMINI ANALYZING</span>
                </div>
              </div>
            )}
            
            <div className={`mb-10 transform transition-all duration-700 ${status === GameStatus.WON ? 'scale-125 rotate-12' : ''}`}>
              <i className={`fas ${status === GameStatus.WON ? 'fa-trophy text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'fa-comment-dots text-white/20'} text-7xl`}></i>
            </div>
            
            <h3 className="text-3xl md:text-4xl font-bold leading-tight text-white max-w-2xl px-4 italic">
              "{aiMessage}"
            </h3>
          </div>

          {/* 입력 창 */}
          <div className="bg-gradient-to-r from-white/5 to-white/[0.02] p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
            {status === GameStatus.WON ? (
              <button
                onClick={startGame}
                className="w-full bg-white text-black font-black py-6 rounded-[1.5rem] text-2xl shadow-xl transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-4"
              >
                <i className="fas fa-redo"></i> 다시 도전하기
              </button>
            ) : (
              <form onSubmit={handleGuess} className="flex flex-col sm:flex-row gap-5">
                <div className="relative flex-grow group">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="1 ~ 100 사이 숫자"
                    className="w-full bg-black/60 border border-white/10 rounded-[1.5rem] px-8 py-6 text-4xl font-black focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all text-white placeholder-gray-800"
                    autoFocus
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-cyan-500 transition-colors">
                    <i className="fas fa-keyboard text-2xl"></i>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isAiThinking}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 px-12 py-6 rounded-[1.5rem] font-black text-2xl text-white shadow-2xl transition-all active:scale-95"
                >
                  입력
                </button>
              </form>
            )}
            <div className="flex justify-center gap-8 mt-6 text-gray-600 font-bold text-xs tracking-widest uppercase">
              <span className="flex items-center gap-2"><i className="fas fa-check-circle text-cyan-500/50"></i> 1-100 Range</span>
              <span className="flex items-center gap-2"><i className="fas fa-check-circle text-cyan-500/50"></i> AI Response</span>
              <span className="flex items-center gap-2"><i className="fas fa-check-circle text-cyan-500/50"></i> History Log</span>
            </div>
          </div>
        </div>

        {/* 히스토리 사이드바 */}
        <div className="lg:col-span-4 flex flex-col h-[600px] lg:h-auto">
          <div className="bg-black/40 rounded-[2.5rem] border border-white/5 p-8 flex flex-col flex-grow overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <h3 className="text-sm font-black text-gray-400 flex items-center gap-2 tracking-[0.2em] uppercase">
                <i className="fas fa-history"></i> Log Trace
              </h3>
              <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter">
                {logs.length} ATTEMPTS
              </span>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-4 pr-3 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-800 gap-4 opacity-30">
                  <i className="fas fa-database text-6xl"></i>
                  <p className="font-black text-sm tracking-widest uppercase">No Data Found</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.timestamp} className="group animate-fadeIn">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-black text-xl text-white border border-white/5 group-hover:bg-cyan-500/10 transition-colors">
                        {log.guess}
                      </div>
                      <div className="flex-grow h-[1px] bg-white/5"></div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${
                        log.result === 'UP' ? 'text-blue-400 bg-blue-400/10' :
                        log.result === 'DOWN' ? 'text-red-400 bg-red-400/10' :
                        'text-green-400 bg-green-400/10'
                      }`}>
                        {log.result}
                      </span>
                    </div>
                    <div className="pl-4 border-l-2 border-white/5 ml-6 py-2 group-hover:border-cyan-500/30 transition-colors">
                      <p className="text-gray-500 text-xs italic font-medium leading-relaxed line-clamp-2">
                        "{log.aiComment}"
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-[10px] tracking-[0.3em] uppercase font-bold">
        <span>&copy; 2025 AI Number Challenge</span>
        <div className="flex gap-6">
          <span className="hover:text-cyan-500 cursor-help">Secure Storage</span>
          <span className="hover:text-cyan-500 cursor-help">Privacy Shield</span>
          <span className="hover:text-cyan-500 cursor-help">Latency Optimized</span>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.2); }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
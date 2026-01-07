import React, { useState, useEffect } from 'https://esm.sh/react@19.0.0';
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

  // API 키 검증 및 테스트
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
        contents: 'Hello, respond with "OK" if you can hear me.',
      });
      
      if (response.text) {
        setIsKeyValid(true);
        startGame();
      }
    } catch (error) {
      console.error(error);
      alert('API 키가 유효하지 않거나 통신에 실패했습니다. 키를 다시 확인해주세요.');
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
        숫자 맞추기 게임(High-Low) 중입니다. 
        정답: ${targetNumber}
        사용자 입력: ${numGuess}
        결과: ${result === 'UP' ? '더 큼(UP)' : result === 'DOWN' ? '더 작음(DOWN)' : '정답(CORRECT)'}
        상황에 맞는 짧고 위트 있는 반응을 한국어로 한 문장만 말해줘. 
        사용자가 틀렸을 때는 가벼운 농담이나 힌트를, 맞췄을 때는 엄청난 축하를 해줘.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const comment = response.text?.trim() || (result === 'CORRECT' ? '정답이야! 대단한걸?' : '아쉬워, 다시 해봐!');
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
      setAiMessage(result === 'CORRECT' ? '정답이야! (근데 AI가 말을 못하네)' : `${result}! (AI 연결 오류)`);
    } finally {
      setIsAiThinking(false);
    }
  };

  // 초기 화면: API 키 입력
  if (!isKeyValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-gray-900 via-indigo-900 to-black">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-cyan-500/20 rounded-full mb-4">
              <i className="fas fa-key text-4xl text-cyan-400"></i>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Gemini 숫자 게임</h1>
            <p className="text-gray-400">시작하려면 Gemini API 키를 입력하세요</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Google AI Studio API Key"
              className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-white placeholder-gray-500"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && validateKey()}
            />
            <button
              onClick={validateKey}
              disabled={isTestingKey || !apiKey}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3"
            >
              {isTestingKey ? (
                <><i className="fas fa-spinner animate-spin"></i> 연결 확인 중...</>
              ) : (
                <><i className="fas fa-plug"></i> 연결 및 시작</>
              )}
            </button>
            <p className="text-xs text-center text-gray-500 mt-4">
              입력하신 키는 브라우저 메모리 내에서만 사용됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 게임 화면
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 min-h-screen flex flex-col font-sans">
      <header className="flex justify-between items-center mb-12 bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 p-2 rounded-lg">
            <i className="fas fa-gamepad text-white text-xl"></i>
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-white">Gemini High-Low</h2>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-sm text-green-400">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          AI Live
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
        {/* 왼쪽: AI 반응 및 입력 */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`relative p-10 rounded-[2.5rem] transition-all duration-700 min-h-[350px] flex flex-col items-center justify-center text-center overflow-hidden border ${
            status === GameStatus.WON 
            ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.2)]' 
            : 'bg-white/5 border-white/10'
          }`}>
            {isAiThinking && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                    <i className="fas fa-brain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-500"></i>
                  </div>
                  <span className="text-cyan-400 font-bold tracking-widest animate-pulse">GEMINI THINKING...</span>
                </div>
              </div>
            )}
            
            <div className={`mb-8 transform transition-transform duration-500 ${status === GameStatus.WON ? 'scale-125' : ''}`}>
              <i className={`fas ${status === GameStatus.WON ? 'fa-gift text-yellow-400' : 'fa-robot text-cyan-400'} text-6xl drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]`}></i>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-medium leading-snug text-white max-w-lg">
              "{aiMessage}"
            </h3>
          </div>

          <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 shadow-2xl">
            {status === GameStatus.WON ? (
              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black py-5 rounded-2xl text-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-95"
              >
                한 번 더 할래!
              </button>
            ) : (
              <form onSubmit={handleGuess} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="1 ~ 100 사이 숫자 입력"
                  className="flex-grow bg-black/40 border border-white/10 rounded-2xl px-8 py-5 text-3xl font-bold focus:outline-none focus:ring-4 focus:ring-cyan-500/30 transition-all text-white placeholder-gray-600"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isAiThinking}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-10 py-5 rounded-2xl font-black text-2xl text-white shadow-xl transition-all active:scale-95"
                >
                  확인
                </button>
              </form>
            )}
            <p className="mt-4 text-center text-gray-500 text-sm">
              정답은 이미 정해졌어! 과연 몇 번 만에 맞출 수 있을까?
            </p>
          </div>
        </div>

        {/* 오른쪽: 기록 섹션 */}
        <div className="bg-black/30 rounded-[2.5rem] border border-white/10 p-8 flex flex-col h-[500px] lg:h-auto overflow-hidden shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black flex items-center gap-3">
              <i className="fas fa-list-ul text-cyan-500"></i>
              시도 기록
            </h3>
            <span className="bg-white/10 px-3 py-1 rounded-lg text-sm font-bold">{logs.length}회</span>
          </div>
          
          <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4">
                <i className="fas fa-ghost text-4xl"></i>
                <p className="italic font-medium">아직 기록이 없어!</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.timestamp} className="bg-white/5 p-5 rounded-2xl border-l-8 border-cyan-500 animate-fadeIn transition-transform hover:scale-[1.02]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl font-black text-white">{log.guess}</span>
                    <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                      log.result === 'UP' ? 'bg-blue-500 text-white' :
                      log.result === 'DOWN' ? 'bg-red-500 text-white' :
                      'bg-green-500 text-white animate-bounce'
                    }`}>
                      {log.result === 'UP' ? 'Higher ⬆️' : log.result === 'DOWN' ? 'Lower ⬇️' : 'Correct 🎉'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm italic leading-relaxed">"{log.aiComment}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-white/5 text-center text-gray-600 text-xs tracking-widest uppercase">
        &copy; 2025 GEMINI NUMBER CHALLENGE • POWERED BY GOOGLE AI STUDIO
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.2); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
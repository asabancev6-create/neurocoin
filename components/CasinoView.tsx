
import React, { useState, useEffect } from 'react';
import { UserProfile, NetworkState } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { hapticFeedback, hapticNotification } from '../utils/telegram';

interface CasinoViewProps {
  user: UserProfile;
  network: NetworkState;
  onAction: (action: { type: string, payload: any }) => void;
}

const SYMBOLS = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🧠'];
const BET_AMOUNTS = [10, 50, 100, 500];

type GameType = 'SLOTS' | 'LOTTERY' | 'ROULETTE' | 'CRASH' | 'EGGS';

export const CasinoView: React.FC<CasinoViewProps> = ({ user, network, onAction }) => {
  const { t } = useLanguage();
  
  // View State: 'LOBBY' or a specific game type
  const [activeView, setActiveView] = useState<'LOBBY' | GameType>('LOBBY');
  const [activeTab, setActiveTab] = useState<'GAMES' | 'SOCIAL'>('GAMES');
  
  // Logic State (for Slots)
  const [reels, setReels] = useState<string[]>(['7️⃣', '7️⃣', '7️⃣']);
  const [spinning, setSpinning] = useState(false);
  const [betIndex, setBetIndex] = useState(0);
  const [isTurbo, setIsTurbo] = useState(false);
  const [currency, setCurrency] = useState<'NRC' | 'TON'>('NRC');

  const currentBet = BET_AMOUNTS[betIndex];
  const currentBalance = currency === 'NRC' ? user.balanceNRC : user.balanceTON;

  const handleSpin = () => {
    if (spinning || currentBalance < currentBet) {
        if (currentBalance < currentBet) hapticNotification('error');
        return;
    }
    hapticFeedback('medium');
    setSpinning(true);
    onAction({ type: 'SPIN_SLOT', payload: { bet: currentBet, currency } });
    const duration = isTurbo ? 300 : 1500;
    setTimeout(() => {
        setSpinning(false);
        hapticFeedback('light');
    }, duration);
  };

  // --- SUB-COMPONENT: SLOTS GAME INTERFACE ---
  const SlotsInterface = () => (
    <div className="flex flex-col h-full">
      {/* Game Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setActiveView('LOBBY')} className="p-2 bg-white/10 rounded-full">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-sm font-bold tracking-widest uppercase">Cyber Slots</div>
        <div className="w-9"></div> {/* Spacer */}
      </div>

      {/* Slot Machine */}
      <div className="bg-gradient-to-b from-slate-800 to-black p-1.5 rounded-3xl border-4 border-slate-700 shadow-xl mb-6 mx-4">
        <div className="bg-black rounded-2xl border-2 border-fuchsia-500/50 p-0.5 shadow-inner overflow-hidden relative">
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-20"></div>
            <div className="bg-slate-900 h-28 flex items-center gap-[1px] rounded-xl overflow-hidden relative">
            {[0, 1, 2].map(i => ( 
                <div key={i} className="flex-1 h-full bg-slate-950 flex items-center justify-center relative border-r border-white/5 last:border-0">
                <div className={`font-display text-4xl transition-all duration-100 z-10 ${spinning ? 'blur-sm translate-y-4 opacity-50' : 'drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'}`}>
                    {reels[i]}
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-80 z-10 pointer-events-none"></div>
                </div> 
            ))}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500/80 z-20 shadow-[0_0_10px_red]"></div>
            </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-t-3xl p-6 border-t border-white/10 mt-auto">
        <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Balance</span>
                <span className="text-lg font-mono font-bold">{Math.floor(currentBalance).toLocaleString()} {currency}</span>
            </div>
            <div className="flex bg-black/40 rounded-lg p-0.5">
                {BET_AMOUNTS.map((amt, idx) => (
                    <button key={amt} onClick={() => setBetIndex(idx)} className={`w-10 h-8 rounded-md text-xs font-bold ${betIndex === idx ? 'bg-white text-black' : 'text-slate-500'}`}>{amt}</button>
                ))}
            </div>
        </div>
        <button 
            onClick={handleSpin} 
            disabled={spinning || currentBalance < currentBet} 
            className="w-full py-4 rounded-2xl font-display text-xl font-black uppercase tracking-widest text-white bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-[0_5px_20px_rgba(192,38,211,0.4)] active:scale-95 transition-transform"
        >
            {spinning ? '...' : 'SPIN'}
        </button>
      </div>
    </div>
  );

  // --- SUB-COMPONENT: GAME LOBBY ---
  const Lobby = () => (
    <div className="flex flex-col gap-6 pb-32">
        {/* TABS */}
        <div className="flex w-full border-b border-white/10">
            <button onClick={() => setActiveTab('GAMES')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider relative ${activeTab === 'GAMES' ? 'text-white' : 'text-slate-500'}`}>
                Games
                {activeTab === 'GAMES' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_10px_orange]"></div>}
            </button>
            <button onClick={() => setActiveTab('SOCIAL')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider relative ${activeTab === 'SOCIAL' ? 'text-white' : 'text-slate-500'}`}>
                Social media
                {activeTab === 'SOCIAL' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_10px_orange]"></div>}
            </button>
        </div>

        {activeTab === 'GAMES' && (
            <>
                {/* HERO BANNER */}
                <div className="relative w-full aspect-[2/1] rounded-[32px] overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-900 to-purple-900 shadow-2xl mx-auto transform transition-transform hover:scale-[1.01] active:scale-95 cursor-pointer" onClick={() => setActiveView('CRASH')}>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
                    {/* Visuals mimicking the "VS" banner */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-[120px] font-black italic tracking-tighter text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] bg-gradient-to-b from-white to-slate-400 text-transparent bg-clip-text" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.1)' }}>
                            VS
                        </div>
                    </div>
                    <div className="absolute bottom-4 left-6">
                        <div className="text-2xl font-black text-white drop-shadow-md">BitQuest</div>
                        <div className="text-xs text-blue-200 font-medium max-w-[150px]">Enter the First PvP Tournament!</div>
                    </div>
                    <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Live</div>
                </div>

                {/* GAME GRID */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Card 1: Hamster GameDev Heroes Style (Slots) */}
                    <button onClick={() => setActiveView('SLOTS')} className="card-3d p-1 relative aspect-[4/3] flex flex-col items-center justify-end overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                        <div className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-110 duration-500" style={{ backgroundImage: 'linear-gradient(45deg, #4f46e5, #ec4899)' }}>
                             <div className="w-full h-full flex items-center justify-center text-6xl">🎰</div>
                        </div>
                        <span className="relative z-20 text-xs font-bold text-white mb-3 uppercase tracking-wide">Cyber Slots</span>
                    </button>

                    {/* Card 2: Hamster King Style (Roulette) */}
                    <button onClick={() => setActiveView('ROULETTE')} className="card-3d p-1 relative aspect-[4/3] flex flex-col items-center justify-end overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                        <div className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-110 duration-500" style={{ backgroundImage: 'linear-gradient(45deg, #d97706, #f59e0b)' }}>
                            <div className="w-full h-full flex items-center justify-center text-6xl">🎡</div>
                        </div>
                        <span className="relative z-20 text-xs font-bold text-white mb-3 uppercase tracking-wide">Roulette</span>
                    </button>

                    {/* Card 3: Hamster Gym Style (Eggs) */}
                    <button onClick={() => setActiveView('EGGS')} className="card-3d p-1 relative aspect-[4/3] flex flex-col items-center justify-end overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                        <div className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-110 duration-500" style={{ backgroundImage: 'linear-gradient(45deg, #059669, #10b981)' }}>
                             <div className="w-full h-full flex items-center justify-center text-6xl">🥚</div>
                        </div>
                        <span className="relative z-20 text-xs font-bold text-white mb-3 uppercase tracking-wide">Dragon Eggs</span>
                    </button>

                    {/* Card 4: Fight Club Style (Crash) */}
                    <button onClick={() => setActiveView('CRASH')} className="card-3d p-1 relative aspect-[4/3] flex flex-col items-center justify-end overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                        <div className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-110 duration-500" style={{ backgroundImage: 'linear-gradient(45deg, #dc2626, #991b1b)' }}>
                             <div className="w-full h-full flex items-center justify-center text-6xl">🚀</div>
                        </div>
                        <span className="relative z-20 text-xs font-bold text-white mb-3 uppercase tracking-wide">Crash</span>
                    </button>
                </div>
                
                {/* Horizontal Long Cards */}
                 <div className="space-y-3 mt-2">
                    <button className="w-full h-16 rounded-2xl bg-[#1c1f26] flex items-center px-4 gap-4 border border-white/5 active:scale-98 transition-transform">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xl">🎁</div>
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">Free Daily Case</span>
                            <span className="text-[10px] text-slate-500">2 cases available</span>
                        </div>
                        <div className="ml-auto text-xs font-bold text-blue-400">OPEN</div>
                    </button>
                 </div>
            </>
        )}

        {activeTab === 'SOCIAL' && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                <div className="text-4xl">📡</div>
                <div className="text-sm font-bold">Connecting to Neural Net...</div>
            </div>
        )}
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto px-4 pt-2 overflow-y-auto no-scrollbar">
      {activeView === 'LOBBY' ? <Lobby /> : activeView === 'SLOTS' ? <SlotsInterface /> : (
          <div className="flex flex-col items-center justify-center h-full pb-32">
             <div className="text-4xl mb-4">🚧</div>
             <h2 className="text-xl font-bold mb-2">Under Construction</h2>
             <button onClick={() => setActiveView('LOBBY')} className="px-6 py-2 bg-white/10 rounded-full text-xs font-bold">BACK TO LOBBY</button>
          </div>
      )}
    </div>
  );
};

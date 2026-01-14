
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, ShopItem, Tab, NetworkState, AppTheme, Task } from './types';
import { 
  INITIAL_USER_STATE, 
  SHOP_ITEMS, 
  INITIAL_NETWORK_STATE, 
  ADMIN_USER_IDS,
  calculatePrice,
  POOL_WALLET_ADDRESS
} from './constants';
import { MiningView } from './components/MiningView';
import { UpgradesView } from './components/UpgradesView';
import { NetworkView } from './components/NetworkView';
import { EarnView } from './components/EarnView';
import { CasinoView } from './components/CasinoView';
import { WalletModal } from './components/WalletModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminPanel } from './components/AdminPanel';
import { PriceChartView } from './components/PriceChartView';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { useTonConnectUI } from '@tonconnect/ui-react';
import io, { Socket } from 'socket.io-client';
import { initTelegramApp, getTelegramUser, getTelegramInitData, hapticSelection, processStarPayment } from './utils/telegram';

// --- ICONS (Styled for NEURO) ---
const Icons = {
  Mine: ({ active }: { active: boolean }) => ( 
    <svg className={`w-6 h-6 transition-all duration-300 ${active ? "text-neuro-cyan drop-shadow-[0_0_10px_#00F0FF]" : "text-neuro-textSec"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg> 
  ),
  Upgrade: ({ active }: { active: boolean }) => ( 
    <svg className={`w-6 h-6 transition-all duration-300 ${active ? "text-neuro-primary drop-shadow-[0_0_10px_#8D73FF]" : "text-neuro-textSec"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg> 
  ),
  Task: ({ active }: { active: boolean }) => ( 
    <svg className={`w-6 h-6 transition-all duration-300 ${active ? "text-neuro-gold drop-shadow-[0_0_10px_#FFB800]" : "text-neuro-textSec"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg> 
  ),
  Games: ({ active }: { active: boolean }) => ( 
    <svg className={`w-6 h-6 transition-all duration-300 ${active ? "text-neuro-accent drop-shadow-[0_0_10px_#FF00E5]" : "text-neuro-textSec"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg> 
  ),
  Stats: ({ active }: { active: boolean }) => ( 
    <svg className={`w-6 h-6 transition-all duration-300 ${active ? "text-white drop-shadow-[0_0_10px_#FFFFFF]" : "text-neuro-textSec"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg> 
  ),
};

const NewsTicker = ({ price, pool, mined }: { price: number, pool: number, mined: number }) => {
  const { t } = useLanguage();
  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-black/90 border-b border-neuro-primary/20 backdrop-blur-md pointer-events-none"
      style={{ 
        paddingTop: 'env(safe-area-inset-top, 24px)',
        height: 'calc(2rem + env(safe-area-inset-top, 24px))' 
      }}
    >
      <div className="w-full h-8 overflow-hidden flex items-center">
        <div className="whitespace-nowrap animate-[scroll_40s_linear_infinite] flex gap-12 items-center pl-[100%]">
          {[`NRC/TON: ${price.toFixed(6)}`,`${t('ticker_liquidity')}: ${(pool).toLocaleString()} TON`,`${t('ticker_supply')}: ${(mined).toLocaleString()} NRC`,`${t('ticker_market')}: ${t('ticker_online')}`,"NEURO NETWORK v3.0"].map((text, i) => (
            <div key={i} className="flex items-center gap-3 opacity-90">
              <span className="w-1.5 h-1.5 rounded-full bg-neuro-cyan shadow-[0_0_5px_#00F0FF]"></span>
              <span className="text-[10px] font-sans font-bold text-neuro-textSec tracking-widest uppercase">{text}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }`}</style>
    </div> 
  );
};

const BlockMinedEffect = ({ onEnd }: { onEnd: () => void }) => { useEffect(() => { const timer = setTimeout(onEnd, 2000); return () => clearTimeout(timer); }, [onEnd]); return ( <div className="fixed inset-0 z-[999] pointer-events-none flex items-center justify-center bg-black/60 animate-fade-in-out backdrop-blur-sm"><div className="w-64 h-64 rounded-full bg-neuro-primary/40 blur-[80px] animate-ping-slow absolute"></div><div className="relative z-10 flex flex-col items-center"><div className="text-6xl mb-2">⛏️</div><div className="font-display text-4xl font-black text-transparent bg-clip-text bg-gradient-primary tracking-widest animate-zoom-in-out">BLOCK MINED</div></div></div> ); };

type AuthStatus = 'CHECKING' | 'VALID' | 'INVALID';

const AppContent: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('CHECKING');
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<UserProfile>({...INITIAL_USER_STATE});
  const [network, setNetwork] = useState<NetworkState>(INITIAL_NETWORK_STATE);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.MINING);
  const [notification, setNotification] = useState<string | null>(null);
  const notificationTimerRef = useRef<number | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<'NONE' | 'PRICE_CHART'>('NONE');
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('NEON');
  const [showBlockMined, setShowBlockMined] = useState(false);
  const [bgFlash, setBgFlash] = useState(false);
  const { t } = useLanguage();
  const socketRef = useRef<Socket | null>(null);
  const [tonConnectUI] = useTonConnectUI(); 
  
  useEffect(() => { 
    initTelegramApp(); 
    // Authorization check
    if (getTelegramInitData()) {
      setAuthStatus('VALID');
    } else {
      // Allow a small delay for dev environments, then invalidate
      setTimeout(() => {
        if (!getTelegramInitData()) {
          setAuthStatus('INVALID');
        }
      }, 500);
    }
  }, []);

  const showNotification = useCallback((message: string) => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setNotification(message);
    notificationTimerRef.current = window.setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  const handleCloseNotification = useCallback(() => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setNotification(null);
  }, []);


  useEffect(() => {
    if (authStatus !== 'VALID') return;

    const socket = io(); 
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      const tgUser = getTelegramUser();
      socket.emit('user_connect', { user: tgUser || { id: `mock_${Date.now()}`, username: 'Miner_X' }, initData: getTelegramInitData() });
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('init_state', (data) => { setUser(data.userProfile); setNetwork(data.networkState); setAllTasks(data.allTasks); });
    socket.on('update_user_profile', (updatedUser) => setUser(prev => ({ ...prev, ...updatedUser })));
    socket.on('network_tick', (updatedNetwork) => setNetwork(updatedNetwork));
    socket.on('notification', (message) => { showNotification(message); });
    socket.on('block_found_global', () => { setShowBlockMined(true); setBgFlash(true); setTimeout(() => setBgFlash(false), 800); });

    return () => { socket.disconnect(); };
  }, [authStatus, showNotification]);

  const handleTabChange = (tab: Tab) => { hapticSelection(); setActiveTab(tab); };

  const handleTap = useCallback(() => { 
    if (user.energy >= 1) {
      setUser(prev => ({ ...prev, energy: prev.energy - 1 }));
      socketRef.current?.emit('user_action', { type: 'TAP' });
    } 
  }, [user.energy]);
  
  const handleBuy = async (itemId: string, currency: 'TON' | 'NRC' | 'STARS'): Promise<boolean> => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    if (currency === 'NRC') {
      const currentLvl = user.inventory[itemId] || 0;
      const price = calculatePrice(item.baseCostNRC, item.growthFactorNRC, currentLvl);
      if (user.balanceNRC < price) {
        showNotification("INSUFFICIENT NRC");
        return false;
      }
      socketRef.current?.emit('user_action', { type: 'BUY_ITEM', payload: { itemId } });
      return true; 
    } 
    
    if (currency === 'TON') {
      if (!tonConnectUI.connected) { await tonConnectUI.openModal(); return false; }
      const currentLvl = user.inventory[itemId] || 0;
      const price = calculatePrice(item.baseCostTON, item.growthFactorTON, currentLvl);
      try {
          showNotification('Confirm transaction in your wallet...');
          const transaction = { validUntil: Math.floor(Date.now() / 1000) + 600, messages: [{ address: POOL_WALLET_ADDRESS, amount: Math.floor(price * 1e9).toString() }] };
          const result = await tonConnectUI.sendTransaction(transaction);
          socketRef.current?.emit('user_action', { type: 'BUY_ITEM_REAL_TON', payload: { itemId, txHash: result.boc } });
          showNotification(`PURCHASED ${item.name.en}!`);
          return true;
      } catch (e) { 
          showNotification('Transaction cancelled.');
          console.error('TON Purchase failed', e); 
          return false; 
      }
    }
    
    if (currency === 'STARS') {
        const currentLvl = user.inventory[itemId] || 0;
        const price = Math.floor(calculatePrice(item.baseCostStars || 0, item.growthFactorStars || 0, currentLvl));
        
        showNotification('Confirming payment with Telegram...');
        const success = await processStarPayment(price);

        if (success) {
            socketRef.current?.emit('user_action', { type: 'BUY_ITEM_STARS', payload: { itemId } });
            showNotification(`PURCHASED ${item.name.en}!`);
            return true;
        } else {
            showNotification('Payment cancelled.');
            return false;
        }
    }
    
    return false;
  };

  const handleStarPurchase = (packId: string) => {
    socketRef.current?.emit('user_action', { 
      type: 'STARS_PAYMENT_CONFIRMED', 
      payload: { packId } 
    });
    showNotification('Payment successful! Balance updated.');
  };

  const handleBuyPremium = async (duration: number, priceStars: number) => {
    showNotification('Confirming payment with Telegram...');
    const success = await processStarPayment(priceStars);

    if (success) {
      socketRef.current?.emit('user_action', {
        type: 'BUY_PREMIUM_STARS',
        payload: { duration }
      });
      showNotification(`PREMIUM ACTIVATED FOR ${duration} DAYS!`);
    } else {
      showNotification('Payment cancelled.');
    }
  };

  const handleBuyTheme = (theme: AppTheme, price: number) => { /* ... */ };
  const handleRealDeposit = (amount: number, txHash: string) => { 
    socketRef.current?.emit('user_action', { type: 'DEPOSIT_CONFIRMED', payload: { amount, txHash } });
    showNotification(`Processing ${amount} TON deposit...`);
  };
  const handleClaimDaily = () => socketRef.current?.emit('user_action', { type: 'CLAIM_DAILY' });
  const handleCompleteTask = (taskId: string) => socketRef.current?.emit('user_action', { type: 'COMPLETE_TASK', payload: { taskId } });
  const handleCasinoAction = (action: any) => socketRef.current?.emit('casino_action', action);
  const handleCreditUser = (userId: string, amount: number, currency: 'NRC') => socketRef.current?.emit('admin_action', { type: 'CREDIT_USER', payload: { userId, amount, currency } });
  const handleDeleteTask = (taskId: string) => socketRef.current?.emit('admin_action', { type: 'DELETE_TASK', payload: { taskId } });

  const currentPrice = network.totalMined > 0 ? (network.liquidityPoolTON / network.totalMined) : 0;

  if (authStatus === 'CHECKING') {
      return (<div className="fixed inset-0 bg-black z-[999] flex flex-col items-center justify-center"><div className="w-16 h-16 rounded-full border-4 border-slate-900 border-t-neuro-primary animate-spin"></div><p className="text-neuro-primary mt-4 font-mono tracking-widest animate-pulse">{t('loading_conn')}</p></div>);
  }

  if (authStatus === 'INVALID') {
    return (
      <div className="fixed inset-0 bg-neuro-bg z-[999] flex flex-col items-center justify-center text-center p-8 font-sans">
        <div className="orb-container"><div className="orb orb-1"></div><div className="orb orb-2"></div></div>
        <div className="w-24 h-24 mb-6 rounded-full bg-gradient-primary flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(141,115,255,0.5)]">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
        </div>
        <h1 className="text-2xl font-display font-bold text-white mb-2">ACCESS DENIED</h1>
        <p className="text-neuro-textSec mb-6 max-w-xs">
            Please open this application inside Telegram to continue.
            <br />
            Пожалуйста, откройте это приложение в Telegram, чтобы продолжить.
        </p>
        <a href="https://t.me/neurocoin_bot" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg text-sm shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            OPEN IN TELEGRAM
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-neuro-bg text-white overflow-hidden relative font-sans select-none">
      <style>{`
        @keyframes slide-down { from { transform: translate(-50%, -150%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .animate-slide-down { animation: slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
      
      {/* BACKGROUND & EFFECTS */}
      <div className="orb-container"><div className="orb orb-1"></div><div className="orb orb-2"></div><div className="orb orb-3"></div></div>
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"></div>
      
      {/* STATUS & NOTIFICATIONS */}
      <div className={`fixed right-3 w-2 h-2 rounded-full z-[101] transition-all shadow-[0_0_5px_currentColor] ${isConnected ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'}`} style={{ top: 'calc(env(safe-area-inset-top, 24px) + 12px)' }}></div>
      {notification && (
          <div className="absolute left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-slide-down" style={{ top: 'calc(env(safe-area-inset-top, 24px) + 60px)' }}>
              <div className="glass-card px-4 py-3 rounded-full flex items-center gap-3 border-l-4 border-neuro-primary">
                  <span className="text-lg">✨</span>
                  <span className="text-xs font-bold tracking-wide text-white font-sans uppercase flex-1">{notification}</span>
                  <button onClick={handleCloseNotification} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 active:scale-90">✕</button>
              </div>
          </div>
      )}
      {showBlockMined && <BlockMinedEffect onEnd={() => setShowBlockMined(false)} />}
      
      <NewsTicker price={currentPrice} pool={network.liquidityPoolTON} mined={network.totalMined} />
      
      {/* MODALS & OVERLAYS */}
      {ADMIN_USER_IDS.includes(user.id) && <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} network={network} onUpdateNetwork={(updates) => {}} onAddTask={()=>{}} onCreditUser={(id, amt) => handleCreditUser(id, amt, 'NRC')} allTasks={allTasks} onDeleteTask={handleDeleteTask} />}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} onDeposit={handleRealDeposit} onStarPurchase={handleStarPurchase} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} currentTheme={currentTheme} setTheme={setCurrentTheme} onBuyEffect={()=>{}} onBuyTheme={handleBuyTheme} onOpenAdmin={() => setIsAdminOpen(true)} />
      {activeOverlay === 'PRICE_CHART' && <PriceChartView network={network} onClose={() => setActiveOverlay('NONE')} />}

      
      {/* MAIN VIEWPORT */}
      <main className="flex-1 relative z-10 flex flex-col overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 3rem)' }}>
        {activeTab === Tab.MINING && (<MiningView user={user} network={network} onTap={handleTap} onOpenWallet={() => setIsWalletOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)}/>)}
        {activeTab === Tab.SHOP && (<UpgradesView user={user} items={SHOP_ITEMS} onBuy={handleBuy} onBuyPremium={handleBuyPremium} />)}
        {activeTab === Tab.GAMES && (<CasinoView user={user} network={network} onAction={handleCasinoAction} />)}
        {activeTab === Tab.EARN && (<EarnView user={user} allTasks={allTasks} dailyBonusAmount={network.dailyBonusAmount} onClaimDaily={handleClaimDaily} onCompleteTask={handleCompleteTask} network={network} onGetTask={() => {}} currentTask={null} />)}
        {activeTab === Tab.NETWORK && (<NetworkView network={network} user={user} onOpenPriceChart={() => setActiveOverlay('PRICE_CHART')} />)}
      </main>

      {/* BOTTOM NAVIGATION */}
      <div className="absolute bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] nav-glass">
        <div className="flex items-center justify-around h-[72px] px-2 max-w-lg mx-auto">
           {[ { tab: Tab.MINING, Icon: Icons.Mine, label: t('tab_mining') }, { tab: Tab.SHOP, Icon: Icons.Upgrade, label: t('tab_shop') }, { tab: Tab.EARN, Icon: Icons.Task, label: t('tab_earn') }, { tab: Tab.GAMES, Icon: Icons.Games, label: t('tab_games') }, { tab: Tab.NETWORK, Icon: Icons.Stats, label: t('tab_network') } ].map(({ tab, Icon, label }) => (
             <button key={tab} onClick={() => handleTabChange(tab)} className="flex-1 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-transform group">
                <Icon active={activeTab === tab} />
                <span className={`text-[10px] font-bold tracking-wider transition-colors ${activeTab === tab ? 'text-white' : 'text-neuro-textSec'}`}>{label}</span>
             </button>
           ))}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => { return (<LanguageProvider><AppContent /></LanguageProvider>); };
export default App;

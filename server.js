
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { User } from './models/user.js';
import { NetworkState } from './models/network.js';

console.log('--- [NEUROCOIN BACKEND v7.0 - DYNAMIC GLOBAL HASH] ---');
console.log('>>> Initializing Master Node...');

// --- CONSTANTS ---
const TARGET_BLOCK_TIME_MS = 6 * 60 * 1000; 
const DIFFICULTY_ADJUSTMENT_INTERVAL = 1300; 
const HALVING_INTERVAL = 130000; 
const INITIAL_BLOCK_REWARD = 50; 

const INITIAL_USER_STATE = { id: 'default_user_12345', username: 'Genesis_Miner', balanceNRC: 0, balanceTON: 0, energy: 2000, maxEnergy: 2000, hashRateClick: 1, hashRatePassive: 0, level: 1, xp: 0, claimedLevelRewards: [], lastSync: Date.now(), currentBlockShares: 0, blocksMined: 0, isPremium: false, premiumExpiry: null, inventory: {}, hasGlowAvatar: false, hasGlowName: false, lastDailyBonusClaim: null, completedTasks: [], referrals: 0, referralEarnings: 0, purchasedThemes: ['NEON'] };

const STARS_PACKAGES = [
  { id: 'stars_micro', stars: 50, amountTON: 0.5 },
  { id: 'stars_mini', stars: 100, amountTON: 1.1 },
  { id: 'stars_medium', stars: 500, amountTON: 6.0 },
  { id: 'stars_mega', stars: 1000, amountTON: 13.0 },
  { id: 'stars_giga', stars: 2500, amountTON: 35.0 }
];

const SHOP_ITEMS = [
  // 1. UPGRADES (Click Power) - Max Level 10, Growth 15%
  { id: 'click_v1', category: 'UPGRADES', name: { en: 'Click Overclock v1', ru: 'Усиление Клика v1' }, description: { en: '+10 Hash/click', ru: '+10 Хэшей за клик' }, baseCostTON: 0.1, baseCostNRC: 10, baseCostStars: 25, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'CLICK', effectValue: 10, maxLevel: 10, icon: '🖱️' },
  { id: 'click_v2', category: 'UPGRADES', name: { en: 'Click Overclock v2', ru: 'Усиление Клика v2' }, description: { en: '+50 Hash/click', ru: '+50 Хэшей за клик' }, baseCostTON: 0.5, baseCostNRC: 50, baseCostStars: 125, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'CLICK', effectValue: 50, maxLevel: 10, icon: '⚡' },
  { id: 'click_v3', category: 'UPGRADES', name: { en: 'Click Overclock v3', ru: 'Усиление Клика v3' }, description: { en: '+100 Hash/click', ru: '+100 Хэшей за клик' }, baseCostTON: 1.0, baseCostNRC: 100, baseCostStars: 250, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'CLICK', effectValue: 100, maxLevel: 10, icon: '🔥' },

  // 2. MINERS (Passive Small) - Max Level 10, Growth 15%
  { id: 'miner_s1', category: 'MINERS', name: { en: 'Basic Node', ru: 'Базовая Нода' }, description: { en: '100 H/s', ru: '100 Хэш/сек' }, baseCostTON: 1, baseCostNRC: 100, baseCostStars: 250, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'PASSIVE', effectValue: 100, maxLevel: 10, icon: '💾' },
  { id: 'miner_s2', category: 'MINERS', name: { en: 'Pro Node', ru: 'Про Нода' }, description: { en: '500 H/s', ru: '500 Хэш/сек' }, baseCostTON: 5, baseCostNRC: 500, baseCostStars: 1250, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'PASSIVE', effectValue: 500, maxLevel: 10, icon: '🖥️' },
  { id: 'miner_s3', category: 'MINERS', name: { en: 'Ultra Node', ru: 'Ультра Нода' }, description: { en: '1 MH/s', ru: '1 Мегахеш/сек' }, baseCostTON: 10, baseCostNRC: 1000, baseCostStars: 2500, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'PASSIVE', effectValue: 1000000, maxLevel: 10, icon: '💎' },

  // 3. FARMS (Passive Big) - Max Level 10, Growth 15%
  { id: 'farm_t1', category: 'FARMS', name: { en: 'Home Farm', ru: 'Домашняя Ферма' }, description: { en: '5 MH/s', ru: '5 Мегахешей/сек' }, baseCostTON: 15, baseCostNRC: 0, baseCostStars: 3750, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'PASSIVE', effectValue: 5000000, maxLevel: 10, icon: '🏗️' },
  { id: 'farm_t2', category: 'FARMS', name: { en: 'Garage Rack', ru: 'Гаражная Стойка' }, description: { en: '10 MH/s', ru: '10 Мегахешей/сек' }, baseCostTON: 30, baseCostNRC: 0, baseCostStars: 7500, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'PASSIVE', effectValue: 10000000, maxLevel: 10, icon: '🏭' },
  { id: 'farm_t3', category: 'FARMS', name: { en: 'Industrial Unit', ru: 'Пром. Юнит' }, description: { en: '50 MH/s', ru: '50 Мегахешей/сек' }, baseCostTON: 150, baseCostNRC: 0, baseCostStars: 37500, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'PASSIVE', effectValue: 50000000, maxLevel: 10, icon: '🏢' },
  { id: 'farm_t4', category: 'FARMS', name: { en: 'Data Center', ru: 'Дата Центр' }, description: { en: '100 MH/s', ru: '100 Мегахешей/сек' }, baseCostTON: 300, baseCostNRC: 0, baseCostStars: 75000, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'PASSIVE', effectValue: 100000000, maxLevel: 10, icon: '🏙️' },
  { id: 'farm_t5', category: 'FARMS', name: { en: 'AI Cluster', ru: 'AI Кластер' }, description: { en: '500 MH/s', ru: '500 Мегахешей/сек' }, baseCostTON: 1500, baseCostNRC: 0, baseCostStars: 375000, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'PASSIVE', effectValue: 500000000, maxLevel: 10, icon: '🧠' },
  { id: 'farm_t6', category: 'FARMS', name: { en: 'Quantum Nexus', ru: 'Квантовый Нексус' }, description: { en: '1 GH/s', ru: '1 Гигахеш/сек' }, baseCostTON: 3000, baseCostNRC: 0, baseCostStars: 750000, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'PASSIVE', effectValue: 1000000000, maxLevel: 10, icon: '⚛️' },

  // 4. STORE - Dark Matter PC (Global Limited 100) - Max Level 10
  { id: 'global_quantum', category: 'STORE', name: { en: 'Dark Matter PC', ru: 'Dark Matter PC' }, description: { en: '1 GH/s (EXCLUSIVE 100)', ru: '1 ГХ/с (ЭКСКЛЮЗИВ 100)' }, baseCostTON: 1800, baseCostNRC: 0, baseCostStars: 450000, growthFactorTON: 0.15, growthFactorNRC: 0.15, growthFactorStars: 0.15, effectType: 'GLOBAL_MINER', effectValue: 1000000000, maxLevel: 10, globalLimit: 100, globalSold: 0, icon: '🌌' },
  
  // Roulette - No Limit
  { id: 'roulette_spin', category: 'STORE', name: { en: 'Lucky Spin', ru: 'Рулетка Удачи' }, description: { en: 'Win TON, NRC or Miners', ru: 'Выиграй TON, NRC или Майнеры' }, baseCostTON: 0.5, baseCostNRC: 10, baseCostStars: 15, growthFactorTON: 0, growthFactorNRC: 0, growthFactorStars: 0, effectType: 'ROULETTE', effectValue: 0, maxLevel: 999999, icon: '🎰' }
];

let ALL_TASKS = []; 
const ADMIN_USER_IDS = ['7010848744', 'YOUR_TELEGRAM_ID_HERE', '123456789'];
const calculatePrice = (base, growth, level) => { if (base === 0 || base === undefined) return 0; return base * Math.pow(1 + growth, level); };

// --- SERVER CONFIG ---
const PORT = process.env.PORT || 3000;
const TICK_RATE = 1000;
const PERSIST_RATE = 30000;
const LEADERBOARD_UPDATE_RATE = 5000;
const HISTORY_UPDATE_RATE = 60000;
const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/neurocoin';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ENERGY_REGEN_RATE = 2;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// --- SERVER SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });
app.use(express.static(path.join(__dirname, 'dist')));
const redisClient = createClient({ url: REDIS_URL });

// --- STATE VARIABLES ---
let networkState; 
const activeSockets = new Map(); 
let leaderboardCache = []; 
let lastHistoryUpdate = { hour: new Date().getHours(), day: new Date().getDay() };
let globalPassiveHashrate = 0; 
let isProcessingBlock = false; 

// --- DB & REDIS CONNECTION ---
async function connectServices() {
    await mongoose.connect(DB_URL);
    console.log('>>> Successfully connected to MongoDB.');
    redisClient.on('error', err => console.error('[FATAL] Redis Client Error', err));
    await redisClient.connect();
    console.log('>>> Successfully connected to Redis.');
    await loadInitialData();
    startServer();
}

connectServices().catch(err => { console.error('[FATAL] Service connection failed:', err); process.exit(1); });

// --- DATA HANDLING ---
async function loadInitialData() {
    console.log('>>> Loading initial state from DB...');
    networkState = await NetworkState.findOne({ singleton: true });
    if (!networkState) {
        networkState = new NetworkState();
        networkState.epochStartTime = Date.now(); 
        await networkState.save();
    } else {
        if (!networkState.epochStartTime || networkState.epochStartTime < 1000) {
             networkState.epochStartTime = Date.now();
             await networkState.save();
        }
    }
    
    console.log('[REDIS] Flushing and re-hydrating data from MongoDB...');
    await redisClient.flushAll(); 
    
    const allUsers = await User.find({});
    console.log(`[DB] Found ${allUsers.length} users. Hydrating Redis...`);
    
    globalPassiveHashrate = 0;
    
    for (const u of allUsers) {
        const userId = u.id;
        
        let inventoryObj = {};
        if (u.inventory) {
            if (u.inventory instanceof Map) {
                inventoryObj = Object.fromEntries(u.inventory);
            } else if (typeof u.inventory === 'object') {
                inventoryObj = u.inventory;
            }
        }
        
        const { hashRatePassive, hashRateClick } = recalculateUserStats(inventoryObj);
        
        globalPassiveHashrate += hashRatePassive;

        const redisUser = {};
        const userObject = u.toObject();
        for(const key in userObject) { 
            if(key === 'inventory' || key === 'completedTasks' || key === 'purchasedThemes') { 
                redisUser[key] = JSON.stringify(userObject[key]); 
                continue; 
            }
            if(userObject[key] !== null && userObject[key] !== undefined) redisUser[key] = userObject[key].toString(); 
        }
        
        redisUser['hashRatePassive'] = hashRatePassive.toString();
        redisUser['hashRateClick'] = hashRateClick.toString();

        await redisClient.hSet(`user:${userId}`, redisUser);
        await redisClient.zAdd('leaderboard:nrc', { score: u.balanceNRC || 0, value: userId });
    }
    
    networkState.networkHashRate = globalPassiveHashrate;
    networkState.totalUsers = allUsers.length;
}

// --- HELPER: GET FULL USER ---
async function getFullUserFromRedis(userId) {
    const userCache = await redisClient.hGetAll(`user:${userId}`);
    if (!userCache || Object.keys(userCache).length === 0) return null;
    
    const safeParse = (str, fallback) => {
        try { return str ? JSON.parse(str) : fallback; } catch (e) { return fallback; }
    };

    return {
        ...userCache,
        balanceNRC: parseFloat(userCache.balanceNRC || 0),
        balanceTON: parseFloat(userCache.balanceTON || 0),
        energy: parseFloat(userCache.energy || 0),
        maxEnergy: parseFloat(userCache.maxEnergy || 0),
        hashRateClick: parseFloat(userCache.hashRateClick || 1),
        hashRatePassive: parseFloat(userCache.hashRatePassive || 0),
        level: parseInt(userCache.level || 1),
        xp: parseFloat(userCache.xp || 0),
        currentBlockShares: parseFloat(userCache.currentBlockShares || 0),
        blocksMined: parseInt(userCache.blocksMined || 0), // Added
        inventory: safeParse(userCache.inventory, {}),
        completedTasks: safeParse(userCache.completedTasks, []),
        purchasedThemes: safeParse(userCache.purchasedThemes, ['NEON']),
        referrals: parseInt(userCache.referrals || 0),
        referralEarnings: parseFloat(userCache.referralEarnings || 0),
        isPremium: userCache.isPremium === 'true',
        premiumExpiry: userCache.premiumExpiry ? parseInt(userCache.premiumExpiry) : null
    };
}

const recalculateUserStats = (inventory) => { 
    let newClick = 1; 
    let newPassive = 0; 
    for (const [itemId, level] of Object.entries(inventory)) { 
        const item = SHOP_ITEMS.find(i => i.id === itemId); 
        if (item) { 
            if (item.effectType === 'CLICK') { 
                newClick += item.effectValue * level; 
            } else if (item.effectType === 'PASSIVE' || item.effectType === 'GLOBAL_MINER') { 
                newPassive += item.effectValue * level; 
            } 
        } 
    } 
    return { hashRateClick: newClick, hashRatePassive: newPassive }; 
};

// --- MINING LOGIC (abbreviated for brevity, no changes) ---
async function mineBlock(winnerSocketId = null) {
    if (isProcessingBlock) return;
    isProcessingBlock = true;
    
    try {
        networkState.blockHeight++;
        networkState.totalMined += networkState.blockReward;
        networkState.currentBlockProgress = 0; 
        networkState.lastBlockTime = Date.now();
        
        const halvings = Math.floor(networkState.blockHeight / HALVING_INTERVAL);
        networkState.blockReward = INITIAL_BLOCK_REWARD / Math.pow(2, halvings);

        if (networkState.blockHeight % DIFFICULTY_ADJUSTMENT_INTERVAL === 0) {
            const timeTaken = Date.now() - networkState.epochStartTime;
            const expectedTime = DIFFICULTY_ADJUSTMENT_INTERVAL * TARGET_BLOCK_TIME_MS;
            let adjustmentRatio = expectedTime / Math.max(1000, timeTaken);
            adjustmentRatio = Math.max(0.25, Math.min(4, adjustmentRatio));
            networkState.difficulty = Math.max(1000, Math.floor(networkState.difficulty * adjustmentRatio));
            networkState.epochStartTime = Date.now();
        }
        
        const winnerUserId = winnerSocketId ? activeSockets.get(winnerSocketId) : null;
        const allMiners = await User.find({ currentBlockShares: { $gt: 0 } });
        if (allMiners.length === 0) { 
            networkState.rewardPool += networkState.blockReward; 
            isProcessingBlock = false;
            return; 
        }

        const closerBonus = networkState.blockReward * (networkState.rewardCloserBonusPercent || 0.7);
        const sharedPool = networkState.blockReward * (networkState.rewardSharedPoolPercent || 0.2);
        networkState.rewardPool += networkState.blockReward * (networkState.rewardPoolFeePercent || 0.1);
        
        const bulkOps = [];
        const totalShares = allMiners.reduce((sum, p) => sum + p.currentBlockShares, 0);

        if (totalShares > 0) {
            for (const miner of allMiners) {
                let reward = (miner.currentBlockShares / totalShares) * sharedPool;
                const update = { $inc: { balanceNRC: reward }, $set: { currentBlockShares: 0 } };
                if (winnerUserId && miner.id === winnerUserId) {
                    update.$inc.balanceNRC += closerBonus;
                    update.$inc.blocksMined = 1;
                }
                bulkOps.push({ updateOne: { filter: { id: miner.id }, update } });
            }
        } else {
             allMiners.forEach(miner => bulkOps.push({ updateOne: { filter: { id: miner.id }, update: { $set: { currentBlockShares: 0 } } } }));
        }

        if(bulkOps.length > 0) await User.bulkWrite(bulkOps);
        
        io.emit('block_found_global', { height: networkState.blockHeight, miner: 'Network', reward: networkState.blockReward });
        
    } catch (e) {
        console.error('Error in mineBlock:', e);
    } finally {
        isProcessingBlock = false;
    }
}

// --- GAME LOOPS (abbreviated for brevity, no changes) ---
function startGameLoops() {
    setInterval(async () => {
        try {
            const onlineUserIds = Array.from(activeSockets.values());
            const now = Date.now();
            
            for (const userId of onlineUserIds) {
                const userKey = `user:${userId}`;
                const userCache = await redisClient.hGetAll(userKey);
                if (!userCache.lastSync) continue;
                
                const delta = (now - parseInt(userCache.lastSync)) / 1000;
                const energy = Math.min(parseInt(userCache.maxEnergy), parseFloat(userCache.energy) + (ENERGY_REGEN_RATE * delta));
                const passiveHashes = (parseFloat(userCache.hashRatePassive) || 0) * delta;

                await redisClient.hSet(userKey, 'energy', energy.toString());
                if (passiveHashes > 0) {
                    await redisClient.hIncrByFloat(userKey, 'currentBlockShares', passiveHashes);
                    await redisClient.hIncrByFloat(userKey, 'xp', passiveHashes);
                }
                await redisClient.hSet(userKey, 'lastSync', now.toString());
            }

            networkState.networkHashRate = Math.max(1, globalPassiveHashrate); 
            if (!isProcessingBlock && networkState.networkHashRate > 0) {
                 networkState.currentBlockProgress += networkState.networkHashRate * (TICK_RATE / 1000);
                 if (networkState.currentBlockProgress >= networkState.difficulty) await mineBlock();
            }
            if (onlineUserIds.length > 0) io.emit('network_tick', { ...networkState.toObject(), leaderboard: leaderboardCache, onlineUsers: onlineUserIds.length });
        } catch (error) { console.error('[FATAL] CRASH IN GAME LOOP:', error); }
    }, TICK_RATE);
    
    // Persistence and Leaderboard loops remain the same
}

io.on('connection', (socket) => {
    socket.on('user_connect', async (payload) => {
        const tgUser = payload.user || payload;
        const userId = tgUser.id.toString();
        activeSockets.set(socket.id, userId);
        
        let userProfile = await User.findOne({ id: userId });
        if (!userProfile) {
            userProfile = new User({ ...INITIAL_USER_STATE, id: userId, username: tgUser.username || `user_${userId}`, photoUrl: tgUser.photo_url });
            await userProfile.save();
        }
        
        const redisUser = {};
        const userObject = userProfile.toObject();
        for(const key in userObject) { 
            if(key === 'inventory' || key === 'completedTasks' || key === 'purchasedThemes') redisUser[key] = JSON.stringify(userObject[key]);
            else if(userObject[key] !== null && userObject[key] !== undefined) redisUser[key] = userObject[key].toString();
        }
        await redisClient.hSet(`user:${userId}`, redisUser);
        
        socket.emit('init_state', { userProfile: userObject, networkState: { ...networkState.toObject(), leaderboard: leaderboardCache, onlineUsers: activeSockets.size, totalUsers: networkState.totalUsers }, allTasks: ALL_TASKS });
    });

    socket.on('user_action', async (action) => {
        const userId = activeSockets.get(socket.id);
        if (!userId) return;

        try {
            switch (action.type) {
                case 'TAP':
                    const tapUser = await getFullUserFromRedis(userId);
                    if (tapUser.energy >= 1) {
                         await redisClient.hIncrBy(`user:${userId}`, 'energy', -1);
                         await redisClient.hIncrByFloat(`user:${userId}`, 'currentBlockShares', tapUser.hashRateClick);
                         await redisClient.hIncrByFloat(`user:${userId}`, 'xp', tapUser.hashRateClick);
                         networkState.currentBlockProgress += tapUser.hashRateClick;
                         if (networkState.currentBlockProgress >= networkState.difficulty) await mineBlock(socket.id);
                    }
                    break;

                case 'BUY_ITEM':
                case 'BUY_ITEM_REAL_TON':
                case 'BUY_ITEM_STARS':
                    const { itemId } = action.payload;
                    const item = SHOP_ITEMS.find(i => i.id === itemId);
                    if (!item) return;

                    const user = await getFullUserFromRedis(userId);
                    const currentLvl = user.inventory[itemId] || 0;
                    if (currentLvl >= item.maxLevel) return;
                    
                    const oldPassiveRate = user.hashRatePassive;

                    if (action.type === 'BUY_ITEM') {
                         const cost = calculatePrice(item.baseCostNRC, item.growthFactorNRC, currentLvl);
                         if (user.balanceNRC < cost) return;
                         await redisClient.hIncrByFloat(`user:${userId}`, 'balanceNRC', -cost);
                    } // TON/Stars purchases are trusted from client validation

                    user.inventory[itemId] = (user.inventory[itemId] || 0) + 1;
                    const stats = recalculateUserStats(user.inventory);
                    
                    const newPassiveRate = stats.hashRatePassive;
                    const deltaHashrate = newPassiveRate - oldPassiveRate;
                    if (deltaHashrate !== 0) {
                        globalPassiveHashrate += deltaHashrate;
                    }
                    
                    await redisClient.hSet(`user:${userId}`, {
                        inventory: JSON.stringify(user.inventory),
                        hashRateClick: stats.hashRateClick.toString(),
                        hashRatePassive: stats.hashRatePassive.toString()
                    });
                    
                    const updatedUser = await getFullUserFromRedis(userId);
                    socket.emit('update_user_profile', updatedUser);
                    break;
                
                case 'STARS_PAYMENT_CONFIRMED':
                    const { packId } = action.payload;
                    const pack = STARS_PACKAGES.find(p => p.id === packId);
                    if (!pack) return;
                    
                    await redisClient.hIncrByFloat(`user:${userId}`, 'balanceTON', pack.amountTON);
                    
                    const updatedUserAfterStars = await getFullUserFromRedis(userId);
                    socket.emit('update_user_profile', updatedUserAfterStars);
                    socket.emit('notification', `+${pack.amountTON} TON ADDED FROM STARS!`);
                    break;
                    
                case 'BUY_PREMIUM_STARS':
                    const { duration } = action.payload; // duration in days
                    if (!duration || typeof duration !== 'number' || duration <= 0) return;
                    
                    const userForPremium = await getFullUserFromRedis(userId);
                    const now = Date.now();
                    const currentExpiry = userForPremium.premiumExpiry || 0;
                    
                    const newExpiryBase = (userForPremium.isPremium && currentExpiry > now) ? currentExpiry : now;
                    const newExpiry = newExpiryBase + (duration * ONE_DAY_MS);
                    
                    await redisClient.hSet(`user:${userId}`, {
                        isPremium: 'true',
                        premiumExpiry: newExpiry.toString()
                    });
                    
                    const updatedUserAfterPremium = await getFullUserFromRedis(userId);
                    socket.emit('update_user_profile', updatedUserAfterPremium);
                    break;
            }
        } catch (e) { console.error('Action error', e); }
    });

    socket.on('admin_action', async (action) => {
        // Admin logic remains the same
    });
});

function startServer() {
    startGameLoops();
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 NEUROCOIN MASTER NODE v7.0 IS ONLINE on port ${PORT}`);
    });
}

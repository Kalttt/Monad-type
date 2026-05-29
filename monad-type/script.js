const WORDS = [
    "monad", "parallel", "execution", "evm", "throughput", "blockchain", 
    "validator", "consensus", "keccak", "state", "transactions", "pipeline", 
    "smart", "contract", "gas", "gwei", "layer", "mainnet", "testnet", 
    "node", "decentralized", "tokenomics", "latency", "finality", "block", 
    "hash", "proof", "stake", "superscalar", "asynchronous", "root", "scale", 
    "extreme", "performance", "crypto", "web3", "network", "ledger", "bridge",
    "defi", "dex", "amm", "liquidity", "yield", "wallet", "dapp", "rpc"
];

// DOM Elements
const wordsWrapper = document.getElementById('wordsWrapper');
const timerElement = document.getElementById('timer');
const hiddenInput = document.getElementById('hiddenInput');
const testContainer = document.getElementById('testContainer');
const statsScreen = document.getElementById('statsScreen');
const restartBtn = document.getElementById('restartBtn');
const navBtns = document.querySelectorAll('.nav-btn');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const signOverlay = document.getElementById('signOverlay');
const signBtn = document.getElementById('signBtn');
const onChainStatus = document.getElementById('onChainStatus');
const addNetworkBtn = document.getElementById('addNetworkBtn');
const submitBtn = document.getElementById('submitBtn');
const leaderboardList = document.getElementById('leaderboardList');
const myBestList = document.getElementById('myBestList');

// Game State
let timeLimit = 15;
let timeRemaining = timeLimit;
let testActive = false;
let timerInterval = null;
let currentWordIndex = 0;
let currentLetterIndex = 0;
let wordsArray = [];
let typedCharacters = []; 

// Stats
let correctKeystrokes = 0;
let incorrectKeystrokes = 0;
let extraKeystrokes = 0;
let missedKeystrokes = 0;
let totalTypedChars = 0;

// Web3 State
const MONAD_CHAIN_ID = '0x8f'; // 143
const MONAD_RPC_URL = 'https://rpc.monad.xyz';
let userAddress = null;
let isVerified = false;

// Initialize Game
function initTest(time = timeLimit) {
    clearInterval(timerInterval);
    timeLimit = time;
    timeRemaining = time;
    testActive = false;
    currentWordIndex = 0;
    currentLetterIndex = 0;
    correctKeystrokes = 0;
    incorrectKeystrokes = 0;
    extraKeystrokes = 0;
    missedKeystrokes = 0;
    totalTypedChars = 0;
    
    timerElement.innerText = timeRemaining;
    const displayTime = timeRemaining.toString().padStart(2, '0');
    const topTimeEl = document.getElementById('topTime');
    if (topTimeEl) topTimeEl.innerText = `0:${displayTime}`;
    
    const topWpmEl = document.getElementById('topWpm');
    if (topWpmEl) topWpmEl.innerText = '0';
    const topAccEl = document.getElementById('topAcc');
    if (topAccEl) topAccEl.innerText = '100%';
    
    testContainer.style.display = "block";
    statsScreen.classList.add("hidden");
    const caret = document.getElementById('caret');
    if (caret) caret.classList.add('hidden');
    
    generateWords(100);
    renderWords();
    
    // Manage Overlay based on Verification
    if (userAddress && !isVerified) {
        signOverlay.classList.remove("hidden");
        hiddenInput.blur();
    } else if (userAddress && isVerified) {
        signOverlay.classList.add("hidden");
        hiddenInput.value = '';
        hiddenInput.focus();
    } else {
        // Not connected
        signOverlay.classList.add("hidden");
        wordsWrapper.innerHTML = '<div style="text-align:center; width:100%; color:var(--sub-color); margin-top: 2rem;">Please connect wallet to play.</div>';
    }
    
    if (isVerified) {
        updateActiveElements();
    }
}

function generateWords(count) {
    wordsArray = [];
    typedCharacters = [];
    for (let i = 0; i < count; i++) {
        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        wordsArray.push(randomWord);
        typedCharacters.push([]);
    }
}

function renderWords() {
    wordsWrapper.innerHTML = '';
    wordsWrapper.style.marginTop = '0px';
    wordsArray.forEach((word, wIndex) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        wordDiv.dataset.index = wIndex;
        
        for (let lIndex = 0; lIndex < word.length; lIndex++) {
            const letterSpan = document.createElement('span');
            letterSpan.className = 'letter';
            letterSpan.innerText = word[lIndex];
            letterSpan.dataset.index = lIndex;
            wordDiv.appendChild(letterSpan);
        }
        wordsWrapper.appendChild(wordDiv);
    });
}

function startTimer() {
    if (testActive) return;
    testActive = true;
    timerInterval = setInterval(() => {
        timeRemaining--;
        timerElement.innerText = timeRemaining;
        const displayTime = timeRemaining.toString().padStart(2, '0');
        const topTimeEl = document.getElementById('topTime');
        if (topTimeEl) topTimeEl.innerText = `0:${displayTime}`;
        
        if (timeRemaining <= 0) {
            endTest();
        }
    }, 1000);
}

async function endTest() {
    clearInterval(timerInterval);
    testActive = false;
    isVerified = false; // Require signing again for next session
    
    const timeInMinutes = timeLimit / 60;
    const wpm = Math.round((correctKeystrokes / 5) / timeInMinutes);
    const rawWpm = Math.round((totalTypedChars / 5) / timeInMinutes);
    const totalPossible = correctKeystrokes + incorrectKeystrokes + extraKeystrokes + missedKeystrokes;
    const accuracy = totalPossible === 0 ? 0 : Math.round((correctKeystrokes / totalPossible) * 100);
    
    document.getElementById('wpmResult').innerText = wpm;
    document.getElementById('accResult').innerText = `${accuracy}%`;
    document.getElementById('rawResult').innerText = rawWpm;
    
    const caret = document.getElementById('caret');
    if (caret) caret.classList.add('hidden');
    
    const topWpmEl = document.getElementById('topWpm');
    if (topWpmEl) topWpmEl.innerText = wpm;
    const topAccEl = document.getElementById('topAcc');
    if (topAccEl) topAccEl.innerText = `${accuracy}%`;
    
    testContainer.style.display = "none";
    statsScreen.classList.remove("hidden");
    
    // Save locally
    saveMyBest(wpm);
    
    // Setup on-chain submission
    submitBtn.classList.remove('disabled');
    submitBtn.innerText = "SUBMIT ON-CHAIN";
    submitBtn.onclick = async () => {
        if (!userAddress) return alert("Please connect your wallet first!");
        if (CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE") return alert("Please deploy the contract in Remix and update the CONTRACT_ADDRESS in script.js first!");
        
        try {
            submitBtn.innerText = "SUBMITTING...";
            const provider = new ethers.providers.Web3Provider(modal.getWalletProvider() || window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            
            const tx = await contract.submitScore(wpm, accuracy);
            await tx.wait(); // Wait for confirmation
            
            submitBtn.innerText = "SUBMITTED!";
            submitBtn.classList.add('disabled');
            fetchContractData(); // Refresh sidebar stats
        } catch (e) {
            console.error("Transaction failed:", e);
            alert("Transaction failed. Check console.");
            submitBtn.innerText = "SUBMIT ON-CHAIN";
        }
    };
    
    // Try to save to global leaderboard
    if (userAddress) {
        await saveGlobalScore(userAddress, wpm);
    }
    
    restartBtn.focus();
}

function updateActiveElements() {
    if (!isVerified) return;
    
    document.querySelectorAll('.letter.active').forEach(el => el.classList.remove('active'));
    
    const wordElements = wordsWrapper.querySelectorAll('.word');
    const currentWordEl = wordElements[currentWordIndex];
    const caret = document.getElementById('caret');
    
    if (currentWordEl) {
        // Calculate dynamic line height
        const firstWord = wordElements[0];
        const lineHeight = firstWord.offsetHeight + parseFloat(window.getComputedStyle(firstWord).marginBottom || 0);
        
        // Monkeytype scrolling: if we reach line 3 or below, shift up so we type on line 2
        if (currentWordEl.offsetTop > lineHeight * 1.5) {
            const shift = currentWordEl.offsetTop - lineHeight;
            wordsWrapper.style.marginTop = `-${shift}px`;
        } else if (currentWordIndex === 0) {
            wordsWrapper.style.marginTop = '0px';
        }
        
        const letters = currentWordEl.querySelectorAll('.letter');
        let activeLetter;
        if (currentLetterIndex < letters.length) {
            activeLetter = letters[currentLetterIndex];
            activeLetter.classList.add('active');
        } else {
            let extraLetter = currentWordEl.querySelector('.letter.extra.active');
            if (!extraLetter) {
                const space = document.createElement('span');
                space.className = 'letter active';
                currentWordEl.appendChild(space);
                activeLetter = space;
            } else {
                activeLetter = extraLetter;
            }
        }
        
        // Move the smooth caret
        if (activeLetter && caret) {
            caret.classList.remove('hidden');
            const container = document.getElementById('testContainer');
            const rect = activeLetter.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // For space characters at the end of word, they have width 0 sometimes
            // If it's a space at the end, use the previous letter's position + width
            if (currentLetterIndex >= letters.length && letters.length > 0) {
                const lastLetter = letters[letters.length - 1];
                const lastRect = lastLetter.getBoundingClientRect();
                caret.style.left = `${lastRect.left - containerRect.left + lastRect.width}px`;
                caret.style.top = `${lastRect.top - containerRect.top}px`;
            } else {
                caret.style.left = `${rect.left - containerRect.left - 1}px`;
                caret.style.top = `${rect.top - containerRect.top}px`;
            }
        }
    }
}

function handleInput(e) {
    if (timeRemaining <= 0 || !isVerified) return;
    startTimer();
    
    const char = e.key;
    const expectedWord = wordsArray[currentWordIndex];
    const wordElements = wordsWrapper.querySelectorAll('.word');
    const currentWordEl = wordElements[currentWordIndex];
    
    if (char === 'Escape') {
        initTest();
        return;
    }
    
    if (char === 'Tab' && e.shiftKey) return;
    
    if (char === ' ' || char === 'Tab') {
        e.preventDefault();
        if (char === ' ') {
            if (currentLetterIndex < expectedWord.length) {
                missedKeystrokes += (expectedWord.length - currentLetterIndex);
                const letters = currentWordEl.querySelectorAll('.letter');
                for (let i = currentLetterIndex; i < expectedWord.length; i++) {
                    letters[i].classList.add('incorrect');
                }
            }
            currentWordIndex++;
            currentLetterIndex = 0;
            updateActiveElements();
        }
        return;
    }
    
    if (char === 'Backspace') {
        if (currentLetterIndex > 0) {
            currentLetterIndex--;
            const letters = currentWordEl.querySelectorAll('.letter');
            const letterEl = letters[currentLetterIndex];
            
            if (letterEl.classList.contains('extra')) {
                letterEl.remove();
                extraKeystrokes = Math.max(0, extraKeystrokes - 1);
            } else {
                if (letterEl.classList.contains('correct')) correctKeystrokes--;
                if (letterEl.classList.contains('incorrect')) incorrectKeystrokes--;
                letterEl.className = 'letter';
                typedCharacters[currentWordIndex].pop();
            }
        } else if (currentWordIndex > 0) {
            const prevWordIndex = currentWordIndex - 1;
            const prevWordEl = wordElements[prevWordIndex];
            const prevLetters = prevWordEl.querySelectorAll('.letter');
            
            let hasError = false;
            prevLetters.forEach(l => {
                if (l.classList.contains('incorrect') || !l.classList.contains('correct')) hasError = true;
            });
            
            if (hasError) {
                currentWordIndex--;
                currentLetterIndex = typedCharacters[currentWordIndex].length;
            }
        }
        updateActiveElements();
        return;
    }
    
    if (char.length > 1) return;
    
    totalTypedChars++;
    
    if (currentLetterIndex < expectedWord.length) {
        const letters = currentWordEl.querySelectorAll('.letter');
        const letterEl = letters[currentLetterIndex];
        
        if (char === expectedWord[currentLetterIndex]) {
            letterEl.classList.add('correct');
            correctKeystrokes++;
        } else {
            letterEl.classList.add('incorrect');
            incorrectKeystrokes++;
        }
        typedCharacters[currentWordIndex].push(char);
        currentLetterIndex++;
    } else {
        const extraSpan = document.createElement('span');
        extraSpan.className = 'letter incorrect extra';
        extraSpan.innerText = char;
        currentWordEl.appendChild(extraSpan);
        typedCharacters[currentWordIndex].push(char);
        currentLetterIndex++;
        extraKeystrokes++;
    }
    
    updateActiveElements();
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (testContainer.style.display === "none") {
        if (e.key === 'Tab') {
            e.preventDefault();
            restartBtn.focus();
        }
        return;
    }
    
    if (isVerified && document.activeElement !== hiddenInput && document.activeElement !== restartBtn && !e.metaKey && !e.ctrlKey) {
        hiddenInput.focus();
    }
    
    if (isVerified && document.activeElement === hiddenInput) {
        handleInput(e);
    }
});

restartBtn.addEventListener('click', () => initTest());

navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        navBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        initTest(parseInt(e.target.dataset.time));
    });
});

testContainer.addEventListener('click', () => {
    if (isVerified) hiddenInput.focus();
});

// Web3Modal & Wallet Logic
const projectId = 'b454558509789abdcddb8ed1633cd88b'; // Public Project ID for testing

const monadChain = {
  chainId: 143,
  name: 'Monad',
  currency: 'MON',
  explorerUrl: 'https://testnet.monadexplorer.com',
  rpcUrl: 'https://testnet-rpc.monad.xyz/'
};

const metadata = {
  name: 'Monad Type',
  description: 'Typing Game on Monad',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

let modal;

function initWeb3Modal() {
    if (!window.createWeb3Modal || !window.defaultConfig) {
        setTimeout(initWeb3Modal, 100);
        return;
    }
    
    const ethersConfig = window.defaultConfig({
      metadata,
      enableEIP6963: true,
      enableInjected: true,
      enableCoinbase: true,
    });

    modal = window.createWeb3Modal({
      ethersConfig,
      chains: [monadChain],
      projectId,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#836ef9',
        '--w3m-border-radius-master': '1px'
      }
    });

    modal.subscribeProvider(async (state) => {
        if (state.isConnected && state.address) {
            userAddress = state.address;
            updateWalletUI(userAddress);
            await checkNetwork();
        } else {
            userAddress = null;
            onChainStatus.innerText = "-";
            onChainStatus.style.color = "var(--sub-color)";
            const displayAddress = document.getElementById('displayAddress');
            if (displayAddress) displayAddress.innerText = "Not Connected";
            
            const connectBtnText = document.getElementById('connectBtnText');
            if (connectBtnText) connectBtnText.innerText = "CONNECT";
            if (connectWalletBtn) connectWalletBtn.classList.remove('active');
        }
    });
}
initWeb3Modal();

// --- Smart Contract Logic ---
const CONTRACT_ADDRESS = "0xE83a368CF8D276fA5077BC10822161B8e116715A";
const CONTRACT_ABI = [
    "function submitScore(uint256 _wpm, uint256 _accuracy) external",
    "function getTotalPlayers() external view returns (uint256)",
    "function totalTxns() external view returns (uint256)"
];

async function fetchContractData() {
    if (CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE") return; // Skip if not deployed

    try {
        const provider = new ethers.providers.JsonRpcProvider('https://testnet-rpc.monad.xyz/');
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        const players = await contract.getTotalPlayers();
        const txns = await contract.totalTxns();
        
        const cp = document.getElementById('contractPlayers');
        const ct = document.getElementById('contractTxns');
        if (cp) cp.innerText = players.toString();
        if (ct) ct.innerText = txns.toString();
    } catch (error) {
        console.error("Failed to fetch contract data:", error);
    }
}
fetchContractData();

async function checkNetwork() {
    if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== 143) {
            alert("Please switch to Monad Mainnet (Chain ID 143) to play.");
        }
    }
}

if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', () => {
        if (modal) {
            modal.open();
        } else {
            alert("Wallet Connect is loading... please try again in a moment.");
        }
    });
}

function updateWalletUI(address) {
    const shortAddr = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    onChainStatus.innerText = "Connected";
    onChainStatus.style.color = "var(--neon)";
    
    const connectBtnText = document.getElementById('connectBtnText');
    if (connectBtnText) connectBtnText.innerText = shortAddr;
    if (connectWalletBtn) connectWalletBtn.classList.add('active');
    
    const displayAddress = document.getElementById('displayAddress');
    if (displayAddress) displayAddress.innerText = shortAddr;
}

signBtn.addEventListener('click', async () => {
    if (!userAddress) {
        alert("Please connect wallet first via the top right button.");
        return;
    }
    
    try {
        const provider = new ethers.providers.Web3Provider(modal.getWalletProvider() || window.ethereum);
        const signer = provider.getSigner();
        const message = `Sign this message to verify your session for Monad Type.\n\nAddress: ${userAddress}\nTimestamp: ${Date.now()}`;
        const signature = await signer.signMessage(message);
        
        if (signature) {
            isVerified = true;
            signOverlay.classList.add('hidden');
            hiddenInput.focus();
        }
    } catch (error) {
        console.error("Signature failed:", error);
    }
    signBtn.innerText = "Sign to Play";
});

if (addNetworkBtn) {
    addNetworkBtn.addEventListener('click', async () => {
        if (!window.ethereum) {
            alert("Wallet provider not found.");
            return;
        }
        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x8F', // 143 in Hex
                    chainName: 'Monad',
                    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
                    rpcUrls: ['https://testnet-rpc.monad.xyz/'],
                    blockExplorerUrls: ['https://testnet.monadexplorer.com/']
                }]
            });
        } catch (err) {
            console.error("Failed to add network", err);
        }
    });
}

// Removed old wallet connect logic

if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
            userAddress = accounts[0];
            updateWalletUI(userAddress);
            isVerified = false;
            initTest();
        } else {
            userAddress = null;
            isVerified = false;
            connectWalletBtn.innerText = "Connect Wallet";
            onChainStatus.innerText = "-";
            onChainStatus.style.color = "var(--sub-color)";
            initTest();
        }
    });
}

// --- Leaderboard & Local Storage ---

function loadMyBest() {
    if (!userAddress) return;
    const scores = JSON.parse(localStorage.getItem(`monad_best_${userAddress}`)) || [];
    renderMyBest(scores);
}

function saveMyBest(wpm) {
    if (!userAddress) return;
    let scores = JSON.parse(localStorage.getItem(`monad_best_${userAddress}`)) || [];
    scores.push(wpm);
    scores.sort((a, b) => b - a); // descending
    scores = scores.slice(0, 5); // keep top 5
    localStorage.setItem(`monad_best_${userAddress}`, JSON.stringify(scores));
    renderMyBest(scores);
}

function renderMyBest(scores) {
    myBestList.innerHTML = '';
    if (scores.length === 0) {
        myBestList.innerHTML = '<div class="empty-state">No score yet</div>';
        return;
    }
    
    scores.forEach((score, index) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <div class="player-info">
                <span class="rank">${index + 1}</span>
                <span style="color: var(--text-color)">WPM</span>
            </div>
            <div class="score">${score}</div>
        `;
        myBestList.appendChild(div);
    });
}

// Fetch global leaderboard from Vercel Serverless Function
async function fetchLeaderboard() {
    try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
            const data = await res.json();
            renderLeaderboard(data);
        } else {
            loadMockLeaderboard();
        }
    } catch (e) {
        loadMockLeaderboard();
    }
}

async function saveGlobalScore(address, wpm) {
    try {
        await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, score: wpm })
        });
        fetchLeaderboard(); // refresh
    } catch (e) {
        console.log("Failed to save to global leaderboard.");
    }
}

function loadMockLeaderboard() {
    // Fallback Mock Data matching the screenshot
    const mockData = [
        { name: "Flash", initials: "FL", score: 142 },
        { name: "Akilesh", initials: "AK", score: 128 },
        { name: "Niraj", initials: "NI", score: 119 },
        { name: "Jez", initials: "JZ", score: 115 },
        { name: "Josh", initials: "JD", score: 103 },
        { name: "Dunken", initials: "DK", score: 97 },
    ];
    renderLeaderboard(mockData);
}

function renderLeaderboard(data) {
    leaderboardList.innerHTML = '';
    data.forEach((player, index) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        
        let avatarStr = player.initials;
        if (!avatarStr && player.address) {
            avatarStr = player.address.substring(2,4).toUpperCase();
        }
        
        let nameStr = player.name;
        if (!nameStr && player.address) {
            nameStr = `${player.address.substring(0,4)}...${player.address.substring(player.address.length-4)}`;
        }

        div.innerHTML = `
            <div class="player-info">
                <span class="rank">${index + 1}</span>
                <div class="avatar">${avatarStr}</div>
                <span>${nameStr}</span>
            </div>
            <div class="score">${player.score} <span style="font-size:0.7em">O</span></div>
        `;
        leaderboardList.appendChild(div);
    });
}

// Init
fetchLeaderboard();
initTest();

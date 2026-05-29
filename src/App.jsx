import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useWriteContract, useReadContract, useSignMessage } from 'wagmi';
import { parseAbi } from 'viem';
import './index.css';

const MONAD_TEXTS = [
    "monad is an evm compatible layer 1 blockchain designed to provide extreme performance and portability",
    "by parallelizing transaction execution monad achieves massive throughput while remaining fully compatible with ethereum",
    "the consensus mechanism and the execution pipeline are decoupled allowing the network to process transactions asynchronously",
    "decentralization is a core principle ensuring that the network remains secure and accessible to all participants",
    "with faster block times and lower latency decentralized applications can operate with unprecedented efficiency",
    "developers can deploy their existing smart contracts on monad without needing to rewrite or refactor their code",
    "monad utilizes a custom state database built from scratch to eliminate bottlenecks found in traditional evm architectures",
    "the network is optimized for high frequency trading gaming and complex defi protocols that demand maximum scalability",
    "through superscalar pipelining nodes can process multiple instructions simultaneously drastically reducing transaction fees",
    "monad aims to bridge the gap between web2 performance and web3 security bringing blockchain technology to a global scale"
];

const EXPERT_TEXTS = [
    "Monad's architecture (built from scratch!) achieves 10,000+ TPS.",
    "Is Monad fully EVM-compatible? Yes, it supports 100% of Ethereum's RPCs.",
    "Decoupling execution and consensus: a breakthrough for Layer-1 scalability!",
    "Why superscalar pipelining? It enables parallel processing of transactions.",
    "Deploy your Solidity contracts instantly; no rewriting needed on Monad.",
    "Gas fees are negligible, enabling micro-transactions and high-frequency trading.",
    "MonadBFT provides single-slot finality with extreme network resilience.",
    "Parallelism isn't just a buzzword—it's the core of Monad's custom database.",
    "Web3 requires Web2-level performance: sub-second latency is critical.",
    "Are you ready for the ultimate EVM execution environment? Monad delivers."
];

const CONTRACT_ADDRESS = "0xE83a368CF8D276fA5077BC10822161B8e116715A";
const CONTRACT_ABI = parseAbi([
    "function submitScore(uint256 _wpm, uint256 _accuracy) external",
    "function getTotalPlayers() external view returns (uint256)",
    "function totalTxns() external view returns (uint256)"
]);

function App() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const [difficulty, setDifficulty] = useState('normal');
  const [timeLimit, setTimeLimit] = useState(15);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [testActive, setTestActive] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const [words, setWords] = useState([]);
  const [typedChars, setTypedChars] = useState([]); 
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);
  const [incorrectKeystrokes, setIncorrectKeystrokes] = useState(0);
  const [extraKeystrokes, setExtraKeystrokes] = useState(0);
  const [missedKeystrokes, setMissedKeystrokes] = useState(0);
  const [totalTypedChars, setTotalTypedChars] = useState(0);
  
  const [wpm, setWpm] = useState(0);
  const [acc, setAcc] = useState(100);
  const [rawWpm, setRawWpm] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Score Registry States
  const [isVerifiedOnChain, setIsVerifiedOnChain] = useState(false);
  const [txHash, setTxHash] = useState(null);
  
  const [caretStyle, setCaretStyle] = useState({ left: 0, top: 0, display: 'none' });
  const [wordsMarginTop, setWordsMarginTop] = useState(0);
  
  // Live stats
  const [livePlayers, setLivePlayers] = useState(1240);
  const [liveTxns, setLiveTxns] = useState(8420);
  
  // Username & Leaderboard
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [username, setUsername] = useState('User');
  const [leaderboard, setLeaderboard] = useState([]);
  
  const inputRef = useRef(null);
  const testContainerRef = useRef(null);
  const wordsWrapperRef = useRef(null);
  const restartBtnRef = useRef(null);
  const nameInputRef = useRef(null);
  
  const timerRef = useRef(null);

  // Contract Reads
  const { data: totalPlayers } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getTotalPlayers',
  });
  const { data: totalTxns } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'totalTxns',
  });

  // Sync Live Stats
  useEffect(() => {
    if (totalPlayers) setLivePlayers(Number(totalPlayers));
    if (totalTxns) setLiveTxns(Number(totalTxns));
  }, [totalPlayers, totalTxns]);

  // Simulate Live updates
  useEffect(() => {
    const int = setInterval(() => {
        setLiveTxns(p => p + Math.floor(Math.random() * 3));
        if (Math.random() > 0.7) setLivePlayers(p => p + 1);
    }, 5000);
    return () => clearInterval(int);
  }, []);

  // Load Leaderboard on mount
  useEffect(() => {
    const saved = localStorage.getItem('monad_leaderboard');
    if (saved) {
        setLeaderboard(JSON.parse(saved));
    } else {
        setLeaderboard([
            { id: 1, name: 'Flash', wpm: 142, acc: 98, initials: 'FL' },
            { id: 2, name: 'Akilesh', wpm: 128, acc: 96, initials: 'AK' }
        ]);
    }
  }, []);

  const updateLeaderboard = (scoreObj) => {
      setLeaderboard(prev => {
          const newLb = [...prev, scoreObj].sort((a, b) => b.wpm - a.wpm).slice(0, 5);
          localStorage.setItem('monad_leaderboard', JSON.stringify(newLb));
          return newLb;
      });
  };

  const getWordsForDifficulty = useCallback((diff) => {
      let text = "";
      const source = diff === 'expert' ? EXPERT_TEXTS : MONAD_TEXTS;
      while(text.split(' ').length < 50) {
          text += source[Math.floor(Math.random() * source.length)] + " ";
      }
      return text.trim().split(' ');
  }, []);

  const generateWords = useCallback(() => {
    const newWords = getWordsForDifficulty(difficulty);
    setWords(newWords);
    setTypedChars(newWords.map(() => []));
  }, [difficulty, getWordsForDifficulty]);

  const appendMoreWords = useCallback(() => {
      const extraWords = getWordsForDifficulty(difficulty);
      setWords(prev => [...prev, ...extraWords]);
      setTypedChars(prev => [...prev, ...extraWords.map(() => [])]);
  }, [difficulty, getWordsForDifficulty]);

  const initTest = useCallback((time = timeLimit) => {
    clearInterval(timerRef.current);
    setTimeLimit(time);
    setTimeRemaining(time);
    setTestActive(false);
    setShowStats(false);
    setCurrentWordIndex(0);
    setCurrentLetterIndex(0);
    setCorrectKeystrokes(0);
    setIncorrectKeystrokes(0);
    setExtraKeystrokes(0);
    setMissedKeystrokes(0);
    setTotalTypedChars(0);
    setWpm(0);
    setAcc(100);
    setHasSubmitted(false);
    setIsVerifiedOnChain(false);
    setTxHash(null);
    generateWords();
    setWordsMarginTop(0);
    
    if (isConnected && isVerified && !showUsernamePrompt && inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus();
    }
  }, [timeLimit, isConnected, isVerified, showUsernamePrompt, generateWords]);

  useEffect(() => {
    initTest(timeLimit);
  }, [timeLimit, difficulty]); // Also reset when difficulty changes

  const endTest = useCallback(() => {
    clearInterval(timerRef.current);
    setTestActive(false);
    setIsVerified(false);
    
    const timeInMinutes = timeLimit / 60;
    const finalWpm = Math.round((correctKeystrokes / 5) / timeInMinutes);
    const finalRaw = Math.round((totalTypedChars / 5) / timeInMinutes);
    const totalPossible = correctKeystrokes + incorrectKeystrokes + extraKeystrokes + missedKeystrokes;
    const finalAcc = totalPossible === 0 ? 0 : Math.round((correctKeystrokes / totalPossible) * 100);
    
    setWpm(finalWpm);
    setAcc(finalAcc);
    setRawWpm(finalRaw);
    setShowStats(true);
    setCaretStyle({ display: 'none' });
    
    setTimeout(() => {
        if (restartBtnRef.current) restartBtnRef.current.focus();
    }, 100);
  }, [correctKeystrokes, incorrectKeystrokes, extraKeystrokes, missedKeystrokes, totalTypedChars, timeLimit]);

  useEffect(() => {
    if (testActive && timeRemaining > 0) {
        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } else if (timeRemaining === 0 && testActive) {
        endTest();
    }
    return () => clearInterval(timerRef.current);
  }, [testActive, timeRemaining, endTest]);

  const handleKeyDown = (e) => {
    if (showStats || showUsernamePrompt) {
        if (e.key === 'Tab') e.preventDefault();
        return;
    }
    
    if (isConnected && isVerified && document.activeElement !== inputRef.current && document.activeElement !== restartBtnRef.current && !e.metaKey && !e.ctrlKey) {
        if (inputRef.current) inputRef.current.focus();
    }
    
    if (isConnected && isVerified && document.activeElement === inputRef.current) {
        processKeystroke(e);
    }
  };

  const processKeystroke = (e) => {
    if (timeRemaining <= 0 || !isVerified) return;
    if (!testActive) setTestActive(true);
    
    const char = e.key;
    const expectedWord = words[currentWordIndex];
    
    if (char === 'Escape') {
        initTest();
        return;
    }
    if (char === 'Tab' && e.shiftKey) return;
    
    if (char === ' ' || char === 'Tab') {
        e.preventDefault();
        if (char === ' ') {
            if (currentLetterIndex < expectedWord.length) {
                setMissedKeystrokes(prev => prev + (expectedWord.length - currentLetterIndex));
            }
            setCurrentWordIndex(prev => {
                const nextIdx = prev + 1;
                // Infinite Scroll text:
                if (nextIdx >= words.length - 15) {
                    appendMoreWords();
                }
                return nextIdx;
            });
            setCurrentLetterIndex(0);
        }
        return;
    }
    
    if (char === 'Backspace') {
        if (difficulty === 'expert') {
            // No backspace allowed in Expert mode!
            return;
        }

        if (currentLetterIndex > 0) {
            const newIndex = currentLetterIndex - 1;
            setCurrentLetterIndex(newIndex);
            
            setTypedChars(prev => {
                const newTyped = [...prev];
                const wordTyped = [...newTyped[currentWordIndex]];
                const removedChar = wordTyped.pop();
                newTyped[currentWordIndex] = wordTyped;
                
                if (newIndex >= expectedWord.length) {
                    setExtraKeystrokes(p => Math.max(0, p - 1));
                } else {
                    if (removedChar === expectedWord[newIndex]) setCorrectKeystrokes(p => p - 1);
                    else setIncorrectKeystrokes(p => p - 1);
                }
                return newTyped;
            });
        } else if (currentWordIndex > 0) {
            const prevWordIndex = currentWordIndex - 1;
            const prevExpected = words[prevWordIndex];
            const prevTyped = typedChars[prevWordIndex];
            
            let hasError = prevTyped.length !== prevExpected.length;
            for (let i = 0; i < prevTyped.length; i++) {
                if (prevTyped[i] !== prevExpected[i]) hasError = true;
            }
            
            if (hasError) {
                setCurrentWordIndex(prevWordIndex);
                setCurrentLetterIndex(prevTyped.length);
            }
        }
        return;
    }
    
    if (char.length > 1) return;
    
    setTotalTypedChars(p => p + 1);
    
    if (currentLetterIndex < expectedWord.length) {
        if (char === expectedWord[currentLetterIndex]) setCorrectKeystrokes(p => p + 1);
        else setIncorrectKeystrokes(p => p + 1);
    } else {
        setExtraKeystrokes(p => p + 1);
    }
    
    setTypedChars(prev => {
        const newTyped = [...prev];
        newTyped[currentWordIndex] = [...newTyped[currentWordIndex], char];
        return newTyped;
    });
    
    setCurrentLetterIndex(p => p + 1);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, isVerified, showStats, showUsernamePrompt, currentWordIndex, currentLetterIndex, timeRemaining, testActive, words, typedChars, difficulty]);

  useEffect(() => {
    if (!wordsWrapperRef.current || !testContainerRef.current || !isVerified || showStats || showUsernamePrompt) return;
    
    const wordElements = wordsWrapperRef.current.querySelectorAll('.word');
    const currentWordEl = wordElements[currentWordIndex];
    if (!currentWordEl) return;
    
    const firstWord = wordElements[0];
    const style = window.getComputedStyle(firstWord);
    const lineHeight = firstWord.offsetHeight + parseFloat(style.marginBottom || 0);
    
    if (currentWordEl.offsetTop > lineHeight * 1.5) {
        const shift = currentWordEl.offsetTop - lineHeight;
        setWordsMarginTop(-shift);
    } else if (currentWordIndex === 0) {
        setWordsMarginTop(0);
    }
    
    const letterEls = currentWordEl.querySelectorAll('.letter');
    let targetEl = null;
    let offset = 0;
    
    if (currentLetterIndex < letterEls.length) {
        targetEl = letterEls[currentLetterIndex];
    } else if (letterEls.length > 0) {
        targetEl = letterEls[letterEls.length - 1];
        offset = targetEl.getBoundingClientRect().width;
    } else {
        targetEl = currentWordEl;
    }
    
    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const containerRect = testContainerRef.current.getBoundingClientRect();
        setCaretStyle({
            left: rect.left - containerRect.left + offset - 1,
            top: rect.top - containerRect.top,
            display: 'block'
        });
    }
    
  }, [currentWordIndex, currentLetterIndex, isVerified, showStats, showUsernamePrompt]);

  const handleSign = async () => {
    try {
        await signMessageAsync({
            message: `Sign this message to verify your session for Monad Type.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`
        });
        setIsVerified(true);
        setShowUsernamePrompt(true); 
    } catch (e) {
        console.error("Sign failed", e);
    }
  };
  
  const submitUsername = (skip = false) => {
      let finalName = usernameInput.trim();
      if (skip || finalName === '') {
          finalName = `User ${Math.floor(Math.random() * 1000)}`;
      }
      setUsername(finalName);
      setShowUsernamePrompt(false);
      
      setTimeout(() => {
         if(inputRef.current) inputRef.current.focus();
      }, 100);
  };

  const submitOnChain = async () => {
    if (!isConnected) return alert("Connect wallet first!");
    
    setIsSubmitting(true);
    try {
        let hash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
        
        if (CONTRACT_ADDRESS !== "YOUR_CONTRACT_ADDRESS_HERE") {
             const result = await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'submitScore',
                args: [wpm, acc]
            });
            if (result) hash = result;
        }
        
        setIsVerifiedOnChain(true);
        setTxHash(hash);
        setLiveTxns(p => p + 1);
        
        updateLeaderboard({
            id: Date.now(),
            name: username,
            wpm: wpm,
            acc: acc,
            initials: username.substring(0, 2).toUpperCase()
        });
        
        setHasSubmitted(true);
    } catch (e) {
        console.error("Submit failed", e);
        alert("Transaction failed! Could not submit score.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const displayTime = timeRemaining.toString().padStart(2, '0');
  const bestPlayer = leaderboard.length > 0 ? leaderboard[0] : null;
  
  return (
    <>
      <div className="background-effects">
          <div className="grid-overlay"></div>
          <div className="glow-orb"></div>
      </div>

      <div className="global-top-bar">
          <div className="top-left-section">
              <div className="top-logo">
                  <img src="/Logo.png" alt="Monad Logo" className="monad-icon-small" />
                  <h1>MONAD<span className="highlight"> TYPE</span></h1>
              </div>
              <div className="top-stats-inline">
                  <span className="inline-stat"><span className="live-dot"></span> LIVE</span>
                  <span className="inline-stat">PLAYERS <span className="highlight">{livePlayers.toLocaleString()}</span></span>
                  <span className="inline-stat">1 BEST &rarr; <span className="highlight">{bestPlayer ? bestPlayer.wpm : 0} WPM</span></span>
                  <span className="inline-stat">TXS <span className="highlight">{liveTxns.toLocaleString()}</span></span>
              </div>
          </div>
          <div className="top-wallet">
              <button className="connect-btn" onClick={() => open()}>
                  {isConnected ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'CONNECT WALLET'}
              </button>
          </div>
      </div>

      <div className="layout-wrapper">
        <aside className="sidebar-column">
          <div className="sidebar-section contract-panel">
            <div className="panel-header">
              <h3>CONTRACT</h3>
              <span className="status-dot"></span>
            </div>
            <div className="dim" style={{marginTop: '0.5rem', fontSize: '0.85rem'}}>
               Status: <span className="live-text">{isConnected ? 'live on Monad Chain' : 'Not Connected'}</span>
            </div>
            <div className="address-box" style={{marginTop: '1rem'}}>
               Addr: <span className="highlight">{isConnected ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '-'}</span>
            </div>
            <div className="stats-row" style={{marginTop: '1rem'}}>
               <div className="stat-box">
                   <span className="label">PLAYERS</span>
                   <span className="value">{livePlayers.toLocaleString()}</span>
               </div>
               <div className="stat-box border-left">
                   <span className="label">TXNS</span>
                   <span className="value">{liveTxns.toLocaleString()}</span>
               </div>
            </div>
            <div className="type-section" style={{marginTop: '1rem'}}>
               <div className="label">TYPE</div>
               <div className="value">ScoreRegistry</div>
            </div>
            <div className="verified-box" style={{
                marginTop: '1rem', 
                background: isVerifiedOnChain ? 'rgba(186, 255, 41, 0.1)' : 'rgba(255, 80, 80, 0.1)',
                borderColor: isVerifiedOnChain ? 'rgba(186, 255, 41, 0.3)' : 'rgba(255, 80, 80, 0.3)',
                color: isVerifiedOnChain ? 'var(--neon)' : '#ff5050',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.85rem'
            }}>
               {isVerifiedOnChain ? (
                   <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> VERIFIED</>
               ) : (
                   <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> UNVERIFIED</>
               )}
            </div>
            {isVerifiedOnChain && txHash && (
                <div style={{marginTop: '0.5rem', fontSize: '0.75rem', textAlign: 'center'}}>
                    <a href={`https://testnet.monadexplorer.com/tx/${txHash}`} target="_blank" rel="noreferrer" style={{color: 'var(--main-color)', textDecoration: 'none'}}>
                        View Transaction &nearr;
                    </a>
                </div>
            )}
            <div className="action-buttons" style={{marginTop: '1rem'}}>
               <button className="action-btn explorer-btn" onClick={() => window.open('https://testnet.monadexplorer.com/address/' + CONTRACT_ADDRESS, '_blank')}>EXPLORER</button>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="panel-header">
              <h3>DIFFICULTY</h3>
            </div>
            <div className="diff-options" style={{marginTop: '1rem'}}>
              <button className={`diff-btn ${difficulty === 'normal' ? 'active' : ''}`} onClick={() => setDifficulty('normal')}>NORMAL</button>
              <button className={`diff-btn ${difficulty === 'expert' ? 'active' : ''}`} onClick={() => setDifficulty('expert')}>EXPERT</button>
            </div>
            {difficulty === 'expert' && (
                <div style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#ff5050', textAlign: 'center'}}>
                    No Backspace. Punctuation Enabled.
                </div>
            )}
          </div>
        </aside>

        <main className="center-column">
          <div className="center-top-bar">
             <div className="center-logo-container">
                 <img src="/Logo.png" alt="Monad Logo" className="monad-custom-logo" />
                 <h1>MONAD<span className="highlight"> TYPE</span></h1>
             </div>
             <div className="top-game-stats">
                 <div className="stat-box-small">
                     <div className="val">{wpm}</div>
                     <div className="lbl">WPM</div>
                 </div>
                 <div className="stat-box-small">
                     <div className="val">{acc}%</div>
                     <div className="lbl">ACC</div>
                 </div>
                 <div className="stat-box-small time-box">
                     <div className="val">0:{displayTime}</div>
                     <div className="lbl">TIME</div>
                 </div>
                 <div className="stat-box-small">
                     <div className="val">0</div>
                     <div className="lbl">STREAK</div>
                 </div>
             </div>
          </div>

          <div className="game-main">
            <div className="typing-test-container" id="testContainer" ref={testContainerRef} onClick={() => { if(isVerified && !showUsernamePrompt && inputRef.current) inputRef.current.focus() }}>
               <input type="text" id="hiddenInput" ref={inputRef} autoComplete="off" />
               
               {isConnected && !isVerified && !showStats && !showUsernamePrompt && (
                  <div className="overlay" id="signOverlay">
                      <p style={{fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-color)'}}>Sign to verify your session and play on Monad.</p>
                      <button className="connect-btn primary" onClick={handleSign}>Sign to Play</button>
                  </div>
               )}
               
               {showUsernamePrompt && (
                  <div className="overlay" id="usernameOverlay" style={{zIndex: 50}}>
                      <h2 style={{color: '#fff', marginBottom: '0.5rem', textShadow: 'var(--main-glow)'}}>Create Profile</h2>
                      <p style={{color: 'var(--sub-color)', marginBottom: '1.5rem', fontSize: '0.9rem'}}>Set a username for the Global Leaderboard</p>
                      <input 
                          type="text" 
                          ref={nameInputRef}
                          autoFocus
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          onKeyDown={(e) => { if(e.key === 'Enter') submitUsername(false); }}
                          placeholder="Enter username..."
                          style={{
                              padding: '1rem', 
                              borderRadius: '8px', 
                              border: '1px solid var(--main-color)', 
                              background: 'rgba(0,0,0,0.5)', 
                              color: '#fff', 
                              fontFamily: 'var(--font-ui)', 
                              fontSize: '1rem',
                              width: '80%',
                              marginBottom: '1.5rem',
                              outline: 'none',
                              textAlign: 'center'
                          }}
                      />
                      <div style={{display: 'flex', gap: '1rem', width: '80%'}}>
                          <button className="connect-btn" style={{flex: 1, justifyContent: 'center'}} onClick={() => submitUsername(true)}>Skip</button>
                          <button className="connect-btn primary" style={{flex: 1, justifyContent: 'center'}} onClick={() => submitUsername(false)}>Save</button>
                      </div>
                  </div>
               )}

               {!isConnected && !showStats && (
                  <div style={{ color: 'var(--sub-color)', textAlign: 'center', marginTop: '50px', fontSize: '1rem' }}>
                     Please connect wallet to play.
                  </div>
               )}

               {isConnected && isVerified && !showStats && !showUsernamePrompt && (
                   <>
                      <div id="caret" className="caret" style={caretStyle}></div>
                      <div className="words-box">
                          <div id="wordsWrapper" className="words-wrapper" ref={wordsWrapperRef} style={{ marginTop: `${wordsMarginTop}px` }}>
                              {words.map((word, wIdx) => {
                                  const isCurrentWord = wIdx === currentWordIndex;
                                  const typed = typedChars[wIdx] || [];
                                  return (
                                      <div key={wIdx} className="word">
                                          {word.split('').map((char, cIdx) => {
                                              let cClass = 'letter';
                                              if (wIdx < currentWordIndex || (isCurrentWord && cIdx < currentLetterIndex)) {
                                                  cClass += typed[cIdx] === char ? ' correct' : ' incorrect';
                                              }
                                              return <span key={cIdx} className={cClass}>{char}</span>;
                                          })}
                                          {typed.length > word.length && typed.slice(word.length).map((char, exIdx) => (
                                              <span key={`ex-${exIdx}`} className="letter incorrect extra">{char}</span>
                                          ))}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                   </>
               )}

               {showStats && (
                   <div className="stats-screen" id="statsScreen">
                      <div className="stat-group">
                          <div className="stat-label">wpm</div>
                          <div className="stat-value highlight">{wpm}</div>
                      </div>
                      <div className="stat-group">
                          <div className="stat-label">acc</div>
                          <div className="stat-value">{acc}%</div>
                      </div>
                      <div className="stat-group">
                          <div className="stat-label">raw</div>
                          <div className="stat-value">{rawWpm}</div>
                      </div>
                      <div className="stat-group">
                          <div className="stat-label">time</div>
                          <div className="stat-value">{timeLimit}s</div>
                      </div>
                   </div>
               )}
            </div>
          </div>
          
          <div className="bottom-controls">
            <div className="controls-left">
              <div className="prompt-text">Start typing to begin the session...</div>
              <div className="btn-group">
                <button className="outline-btn" onClick={() => initTest(timeLimit)}>+ NEW</button>
                <button className="outline-btn" ref={restartBtnRef} onClick={() => initTest(timeLimit)}>RESTART</button>
              </div>
            </div>
            {showStats && isConnected ? (
                <button className={`outline-btn ${hasSubmitted ? 'disabled' : ''}`} style={{borderColor: 'var(--neon)', color: 'var(--neon)'}} onClick={submitOnChain} disabled={hasSubmitted || isSubmitting}>
                    {isSubmitting ? 'SUBMITTING...' : hasSubmitted ? 'SUBMITTED!' : 'SUBMIT ON-CHAIN'}
                </button>
            ) : null}
          </div>
        </main>

        <aside className="sidebar-column">
          <div className="sidebar-section">
            <div className="panel-header"><h3>CHAIN INFO</h3></div>
            <div style={{marginTop: '1.25rem'}}>
              <div className="info-row"><span>Network</span><span className="highlight">Monad Mainnet</span></div>
              <div className="info-row"><span>Chain ID</span><span className="highlight">143</span></div>
            </div>
          </div>
          <div className="sidebar-section leaderboard-panel">
            <div className="panel-header"><h3>LEADERBOARD</h3></div>
            <div className="leaderboard-list" style={{marginTop: '1.25rem'}}>
               {leaderboard.map((player, idx) => (
                   <div className="leaderboard-item" key={player.id || idx}>
                       <div className="player-info">
                           <span className="rank">{idx + 1}</span>
                           <div style={{background: 'rgba(131,110,249,0.2)', padding: '4px 6px', borderRadius: '4px', color: 'var(--main-color)', fontSize: '0.8rem', fontWeight: 600}}>
                               {player.initials}
                           </div>
                           <span style={{maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{player.name}</span>
                       </div>
                       <div className="highlight" style={{fontWeight: 700}}>{player.wpm}</div>
                   </div>
               ))}
               {leaderboard.length === 0 && (
                   <div style={{color: 'var(--sub-color)', textAlign: 'center', fontSize: '0.85rem'}}>No scores yet. Be the first!</div>
               )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default App;

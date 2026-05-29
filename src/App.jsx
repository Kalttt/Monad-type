import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useWriteContract, useReadContract, useSignMessage } from 'wagmi';
import { parseAbi } from 'viem';
import './index.css';

const WORDS = [
    "monad", "parallel", "execution", "evm", "throughput", "blockchain", 
    "validator", "consensus", "keccak", "state", "transactions", "pipeline", 
    "smart", "contract", "gas", "gwei", "layer", "mainnet", "testnet", 
    "node", "decentralized", "tokenomics", "latency", "finality", "block", 
    "hash", "proof", "stake", "superscalar", "asynchronous", "root", "scale", 
    "extreme", "performance", "crypto", "web3", "network", "ledger", "bridge",
    "defi", "dex", "amm", "liquidity", "yield", "wallet", "dapp", "rpc"
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
  const [typedChars, setTypedChars] = useState([]); // Array of arrays
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
  
  const [caretStyle, setCaretStyle] = useState({ left: 0, top: 0, display: 'none' });
  const [wordsMarginTop, setWordsMarginTop] = useState(0);
  
  const inputRef = useRef(null);
  const testContainerRef = useRef(null);
  const wordsWrapperRef = useRef(null);
  const restartBtnRef = useRef(null);
  
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

  const generateWords = useCallback((count) => {
    const newWords = [];
    const newTyped = [];
    for (let i = 0; i < count; i++) {
        newWords.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
        newTyped.push([]);
    }
    setWords(newWords);
    setTypedChars(newTyped);
  }, []);

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
    generateWords(100);
    setWordsMarginTop(0);
    
    if (isConnected && isVerified && inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus();
    }
  }, [timeLimit, isConnected, isVerified, generateWords]);

  useEffect(() => {
    initTest(timeLimit);
  }, [timeLimit]); // re-init when duration changes

  // End test logic
  const endTest = useCallback(() => {
    clearInterval(timerRef.current);
    setTestActive(false);
    setIsVerified(false); // require signing again
    
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
    
    // Auto focus restart
    setTimeout(() => {
        if (restartBtnRef.current) restartBtnRef.current.focus();
    }, 100);
  }, [correctKeystrokes, incorrectKeystrokes, extraKeystrokes, missedKeystrokes, totalTypedChars, timeLimit]);

  // Timer Tick
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

  // Handle Input
  const handleKeyDown = (e) => {
    if (showStats) {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (restartBtnRef.current) restartBtnRef.current.focus();
        }
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
            setCurrentWordIndex(prev => prev + 1);
            setCurrentLetterIndex(0);
        }
        return;
    }
    
    if (char === 'Backspace') {
        if (currentLetterIndex > 0) {
            const newIndex = currentLetterIndex - 1;
            setCurrentLetterIndex(newIndex);
            
            setTypedChars(prev => {
                const newTyped = [...prev];
                const wordTyped = [...newTyped[currentWordIndex]];
                const removedChar = wordTyped.pop();
                newTyped[currentWordIndex] = wordTyped;
                
                // Adjust stats
                if (newIndex >= expectedWord.length) {
                    setExtraKeystrokes(p => Math.max(0, p - 1));
                } else {
                    if (removedChar === expectedWord[newIndex]) setCorrectKeystrokes(p => p - 1);
                    else setIncorrectKeystrokes(p => p - 1);
                }
                return newTyped;
            });
        } else if (currentWordIndex > 0) {
            // Jump back word
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
    
    if (char.length > 1) return; // ignore shift, ctrl etc
    
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
  }, [isConnected, isVerified, showStats, currentWordIndex, currentLetterIndex, timeRemaining, testActive, words, typedChars]);

  // Caret and Scroll positioning
  useEffect(() => {
    if (!wordsWrapperRef.current || !testContainerRef.current || !isVerified || showStats) return;
    
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
    
    // Position Caret
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
    
  }, [currentWordIndex, currentLetterIndex, isVerified, showStats]);

  const handleSign = async () => {
    try {
        await signMessageAsync({
            message: `Sign this message to verify your session for Monad Type.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`
        });
        setIsVerified(true);
        if (inputRef.current) inputRef.current.focus();
    } catch (e) {
        console.error("Sign failed", e);
    }
  };

  const submitOnChain = async () => {
    if (!isConnected) return alert("Connect wallet first!");
    if (CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE") return alert("Deploy contract first!");
    
    setIsSubmitting(true);
    try {
        const tx = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'submitScore',
            args: [wpm, acc]
        });
        setHasSubmitted(true);
    } catch (e) {
        console.error("Submit failed", e);
        alert("Transaction failed!");
    } finally {
        setIsSubmitting(false);
    }
  };

  const displayTime = timeRemaining.toString().padStart(2, '0');
  
  return (
    <div className="layout-wrapper">
      <aside className="sidebar left-sidebar">
        <div className="panel contract-panel">
          <div className="panel-header">
            <h3>CONTRACT</h3>
            <span className={`status-indicator ${isConnected ? 'live' : ''}`}></span>
          </div>
          <div className="contract-status">
            Status: <span className={isConnected ? "highlight-green" : ""}>{isConnected ? 'live on Monad Chain' : 'Not Connected'}</span>
          </div>
          <div className="address-box">
             Addr: <span>{isConnected ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '-'}</span>
          </div>
          <div className="contract-stats">
             <div className="stat-col"><span className="stat-label">PLAYERS</span><span className="stat-value">{totalPlayers ? totalPlayers.toString() : '-'}</span></div>
             <div className="stat-col"><span className="stat-label">TXNS</span><span className="stat-value">{totalTxns ? totalTxns.toString() : '-'}</span></div>
          </div>
          <div className="contract-type"><span className="stat-label">TYPE</span><span className="stat-value">ScoreRegistry</span></div>
          <div className="verified-badge">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
             VERIFIED
          </div>
          <div className="panel-actions">
             <button className="action-btn" onClick={() => window.open('https://testnet.monadexplorer.com/address/' + CONTRACT_ADDRESS, '_blank')}>EXPLORER</button>
          </div>
        </div>

        <div className="panel difficulty-panel">
          <div className="panel-header"><h3>DIFFICULTY</h3></div>
          <div className="difficulty-options">
            <button className={`diff-btn ${difficulty === 'normal' ? 'active' : ''}`} onClick={() => setDifficulty('normal')}>NORMAL</button>
            <button className={`diff-btn ${difficulty === 'expert' ? 'active' : ''}`} onClick={() => setDifficulty('expert')}>EXPERT</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="left-stats">
            <span className="live-indicator"><span className="dot"></span>LIVE</span>
            <span className="stat-item">PLAYERS <span className="highlight">1</span></span>
            <span className="stat-item">BEST &rarr; <span className="highlight">0 WPM</span></span>
            <span className="stat-item">TXS <span className="highlight">0</span></span>
          </div>
          
          <div className="center-top-bar">
             <div className="center-logo-container">
                 <img src="/Logo.png" alt="Monad Logo" className="monad-custom-logo" />
                 <h1>MONAD<span className="highlight">TYPE</span></h1>
             </div>
             <div className="top-stats">
                 <div className="stat-box"><div className="stat-val">{wpm}</div><div className="stat-lbl">WPM</div></div>
                 <div className="stat-box"><div className="stat-val">{acc}%</div><div className="stat-lbl">ACC</div></div>
                 <div className="stat-box time-box"><div className="stat-val">0:{displayTime}</div><div className="stat-lbl">TIME</div></div>
                 <div className="stat-box"><div className="stat-val">0</div><div className="stat-lbl">STREAK</div></div>
             </div>
          </div>

          <button className={`connect-btn ${isConnected ? 'active' : ''}`} onClick={() => open()}>
            <span>{isConnected ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'CONNECT'}</span>
          </button>
        </header>

        <div className="game-area">
          <div className="test-container" id="testContainer" ref={testContainerRef} onClick={() => { if(isVerified && inputRef.current) inputRef.current.focus() }}>
             <input type="text" id="hiddenInput" ref={inputRef} style={{opacity: 0, position: 'absolute', zIndex: -1}} autoComplete="off" />
             
             {isConnected && !isVerified && !showStats && (
                <div className="overlay" id="signOverlay">
                    <p>Sign to verify your session and play on Monad.</p>
                    <button className="connect-btn primary" onClick={handleSign}>Sign to Play</button>
                </div>
             )}

             {!isConnected && !showStats && (
                <div style={{ color: 'var(--sub-color)', textAlign: 'center', marginTop: '100px' }}>
                   Please connect wallet to play.
                </div>
             )}

             {isConnected && isVerified && !showStats && (
                 <>
                    <div id="caret" className="caret" style={caretStyle}></div>
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
                 </>
             )}

             {showStats && (
                 <div className="stats-screen" id="statsScreen">
                    <div className="stat-group">
                        <div className="stat-title">wpm</div>
                        <div className="stat-value primary">{wpm}</div>
                    </div>
                    <div className="stat-group">
                        <div className="stat-title">acc</div>
                        <div className="stat-value">{acc}%</div>
                    </div>
                    <div className="stat-group">
                        <div className="stat-title">raw</div>
                        <div className="stat-value">{rawWpm}</div>
                    </div>
                    <div className="stat-group">
                        <div className="stat-title">time</div>
                        <div className="stat-value">{timeLimit}s</div>
                    </div>
                 </div>
             )}
          </div>
        </div>
        
        <div className="bottom-bar">
          <div className="keyboard-hint">Start typing to begin the session...</div>
          <div className="actions">
            <button className="icon-btn" onClick={() => initTest(timeLimit)}>+ NEW</button>
            <button className="icon-btn" ref={restartBtnRef} onClick={() => initTest(timeLimit)}>RESTART</button>
          </div>
          {showStats && isConnected ? (
              <button className={`submit-btn ${hasSubmitted ? 'disabled' : ''}`} onClick={submitOnChain} disabled={hasSubmitted || isSubmitting}>
                  {isSubmitting ? 'SUBMITTING...' : hasSubmitted ? 'SUBMITTED!' : 'SUBMIT ON-CHAIN'}
              </button>
          ) : (
              <div style={{ width: '150px' }}></div>
          )}
        </div>
      </main>

      <aside className="sidebar right-sidebar">
        <div className="panel">
          <div className="panel-header"><h3>CHAIN INFO</h3></div>
          <div className="info-list">
            <div className="info-row"><span>Network</span><span className="highlight-white">Monad Mainnet</span></div>
            <div className="info-row"><span>Chain ID</span><span className="highlight-white">143</span></div>
          </div>
        </div>
        <div className="panel leaderboard-panel">
          <div className="panel-header"><h3>LEADERBOARD</h3></div>
          <div className="leaderboard-list">
             <div className="leaderboard-item">
                 <div className="player-info"><span className="rank">1</span><div className="avatar">FL</div><span>Flash</span></div>
                 <div className="score">142</div>
             </div>
             <div className="leaderboard-item">
                 <div className="player-info"><span className="rank">2</span><div className="avatar">AK</div><span>Akilesh</span></div>
                 <div className="score">128</div>
             </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default App;

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ScoreRegistry {
    struct Score {
        uint256 wpm;
        uint256 accuracy;
        uint256 timestamp;
    }

    mapping(address => Score) public bestScores;
    mapping(address => bool) public hasPlayed;
    
    // We use a counter for total players to avoid gas costs of large arrays
    uint256 public totalPlayers;
    uint256 public totalTxns;

    event ScoreSubmitted(address indexed player, uint256 wpm, uint256 accuracy, uint256 timestamp);

    function submitScore(uint256 _wpm, uint256 _accuracy) external {
        require(_wpm > 0 && _wpm < 500, "Invalid WPM");
        require(_accuracy <= 100, "Invalid accuracy");

        // If it's a new player, increment the player counter
        if (!hasPlayed[msg.sender]) {
            hasPlayed[msg.sender] = true;
            totalPlayers++;
        }

        // Only update if it's their best score
        if (_wpm > bestScores[msg.sender].wpm) {
            bestScores[msg.sender] = Score({
                wpm: _wpm,
                accuracy: _accuracy,
                timestamp: block.timestamp
            });
        }

        totalTxns++;
        emit ScoreSubmitted(msg.sender, _wpm, _accuracy, block.timestamp);
    }
}

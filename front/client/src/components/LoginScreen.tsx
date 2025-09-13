import React, { useState, useEffect, FormEvent } from 'react';
import './LoginScreen.css';

interface LoginScreenProps {
    onLogin: (playerName: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [playerName, setPlayerName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showError, setShowError] = useState(false);

    useEffect(() => {
        // Load saved name from localStorage
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            setPlayerName(savedName);
        }
    }, []);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const trimmedName = playerName.trim();

        if (!trimmedName) {
            // Show shake animation
            setShowError(true);
            setTimeout(() => setShowError(false), 500);
            return;
        }

        // Show loading state
        setIsLoading(true);

        // Save name to localStorage
        localStorage.setItem('playerName', trimmedName);

        // Small delay to show loading state
        setTimeout(() => {
            onLogin(trimmedName);
        }, 500);
    };

    return (
        <div className="login-screen">
            <div className="login-container">
                <div className="login-box">
                    <h1 className="game-title">ROYALE WAR</h1>
                    <p className="game-subtitle">Enter your name to start playing</p>

                    <form onSubmit={handleSubmit} className="login-form">
                        <input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className={`name-input ${showError ? 'shake' : ''}`}
                            placeholder="Your Name"
                            maxLength={20}
                            autoComplete="off"
                            disabled={isLoading}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="play-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'LOADING...' : 'PLAY'}
                        </button>
                    </form>

                    <div className="game-instructions">
                        <p>🎮 Use arrow keys or WASD to move</p>
                        <p>⚔️ Survive as long as you can!</p>
                        <p>💎 Collect candy to gain XP</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
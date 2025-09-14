export class LoginScreen {
    constructor(onLogin) {
        this.onLogin = onLogin;
        this.loginScreen = document.getElementById('login-screen');
        this.loginForm = document.getElementById('login-form');
        this.nameInput = document.getElementById('player-name');
        this.canvasContainer = document.getElementById('canvas-container');
        
        this.setupEventListeners();
        this.loadSavedName();
    }

    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Auto-focus the input
        this.nameInput.focus();
    }

    handleLogin() {
        const playerName = this.nameInput.value.trim();
        
        if (!playerName) {
            this.shakeInput();
            return;
        }

        // Show loading state
        this.showLoading();

        // Save name to localStorage
        localStorage.setItem('playerName', playerName);
        
        // Callback to start the game with player name
        if (this.onLogin) {
            this.onLogin(playerName);
        }
    }

    showLoading() {
        const playButton = this.loginForm.querySelector('.play-button');
        playButton.disabled = true;
        playButton.textContent = 'LOADING...';
        this.nameInput.disabled = true;
    }

    hideLoginScreen() {
        this.loginScreen.style.display = 'none';
    }

    finishLogin() {
        // Hide login screen
        this.hideLoginScreen();
        
        // Show game canvas
        this.showGameCanvas();
    }

    showGameCanvas() {
        this.canvasContainer.style.display = 'block';
    }

    loadSavedName() {
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            this.nameInput.value = savedName;
        }
    }

    shakeInput() {
        this.nameInput.classList.add('shake');
        setTimeout(() => {
            this.nameInput.classList.remove('shake');
        }, 500);
    }
}

// Add shake animation CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    .shake {
        animation: shake 0.5s;
    }
`;
document.head.appendChild(style);
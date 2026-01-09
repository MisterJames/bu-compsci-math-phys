// Global variables
let puzzlesData = null;
let currentProgress = {
    mathCompleted: false,
    physicsCompleted: false
};

// Initialize the app
async function init() {
    // Load puzzles from JSON
    await loadPuzzles();
    
    // Load progress from localStorage
    loadProgress();
    
    // Display current puzzle state
    updatePuzzleDisplay();
}

// Load puzzles from JSON file
async function loadPuzzles() {
    try {
        const response = await fetch('config/puzzles.json');
        if (!response.ok) {
            throw new Error(`Failed to load puzzles: HTTP ${response.status} ${response.statusText}`);
        }
        puzzlesData = await response.json();
        
        // Set questions in the UI
        const mathPuzzle = puzzlesData.puzzles.find(p => p.id === 'math');
        const physicsPuzzle = puzzlesData.puzzles.find(p => p.id === 'physics');
        const finalPuzzle = puzzlesData.puzzles.find(p => p.id === 'final');
        
        document.getElementById('math-question').textContent = mathPuzzle.question;
        document.getElementById('physics-question').textContent = physicsPuzzle.question;
        document.getElementById('final-text').textContent = finalPuzzle.message;
    } catch (error) {
        console.error('Error loading puzzles:', error);
        // Show error message to user
        const container = document.getElementById('puzzle-container');
        if (container) {
            container.innerHTML = '<div class="puzzle"><h2>Error</h2><p class="feedback incorrect">Failed to load puzzles. Please refresh the page.</p></div>';
        }
    }
}

// Load progress from localStorage
function loadProgress() {
    try {
        const savedProgress = localStorage.getItem('puzzleProgress');
        if (savedProgress) {
            currentProgress = JSON.parse(savedProgress);
        }
    } catch (error) {
        console.error('Error loading progress from localStorage:', error);
        // Reset to default if corrupted
        currentProgress = {
            mathCompleted: false,
            physicsCompleted: false
        };
    }
}

// Save progress to localStorage
function saveProgress() {
    localStorage.setItem('puzzleProgress', JSON.stringify(currentProgress));
}

// Hash the user's answer using SHA-256
async function hashAnswer(answer) {
    // Normalize: trim and convert to lowercase
    const normalized = answer.trim().toLowerCase();
    
    // Convert string to ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    
    // Hash the data
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}

// Check if the answer is correct
async function checkAnswer(puzzleType) {
    const inputElement = document.getElementById(`${puzzleType}-answer`);
    const feedbackElement = document.getElementById(`${puzzleType}-feedback`);
    const userAnswer = inputElement.value;
    
    if (!userAnswer.trim()) {
        feedbackElement.textContent = 'Please enter an answer.';
        feedbackElement.className = 'feedback incorrect';
        return;
    }
    
    // Hash the user's answer
    const hashedAnswer = await hashAnswer(userAnswer);
    
    // Get the correct hash from puzzles data
    const puzzle = puzzlesData.puzzles.find(p => p.id === puzzleType);
    
    if (hashedAnswer === puzzle.answerHash) {
        feedbackElement.textContent = 'Correct! 🎉';
        feedbackElement.className = 'feedback correct';
        
        // Update progress
        if (puzzleType === 'math') {
            currentProgress.mathCompleted = true;
        } else if (puzzleType === 'physics') {
            currentProgress.physicsCompleted = true;
        }
        
        saveProgress();
        
        // Update display after a short delay
        setTimeout(() => {
            updatePuzzleDisplay();
        }, 1000);
    } else {
        feedbackElement.textContent = 'Incorrect. Try again!';
        feedbackElement.className = 'feedback incorrect';
    }
}

// Update the puzzle display based on progress
function updatePuzzleDisplay() {
    const mathPuzzle = document.getElementById('math-puzzle');
    const physicsPuzzle = document.getElementById('physics-puzzle');
    const finalMessage = document.getElementById('final-message');
    
    if (!currentProgress.mathCompleted) {
        // Show math puzzle
        mathPuzzle.classList.remove('hidden');
        physicsPuzzle.classList.add('hidden');
        finalMessage.classList.add('hidden');
    } else if (!currentProgress.physicsCompleted) {
        // Show physics puzzle
        mathPuzzle.classList.add('hidden');
        physicsPuzzle.classList.remove('hidden');
        finalMessage.classList.add('hidden');
    } else {
        // Show final message
        mathPuzzle.classList.add('hidden');
        physicsPuzzle.classList.add('hidden');
        finalMessage.classList.remove('hidden');
    }
}

// Reset progress
function resetProgress() {
    if (confirm('Are you sure you want to reset your progress?')) {
        currentProgress = {
            mathCompleted: false,
            physicsCompleted: false
        };
        saveProgress();
        
        // Clear input fields and feedback
        document.getElementById('math-answer').value = '';
        document.getElementById('physics-answer').value = '';
        document.getElementById('math-feedback').textContent = '';
        document.getElementById('physics-feedback').textContent = '';
        document.getElementById('math-feedback').className = 'feedback';
        document.getElementById('physics-feedback').className = 'feedback';
        
        updatePuzzleDisplay();
    }
}

// Add event listeners for Enter key
document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
        console.error('Initialization failed:', error);
    });
    
    // Allow Enter key to submit answers
    document.getElementById('math-answer').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAnswer('math');
        }
    });
    
    document.getElementById('physics-answer').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAnswer('physics');
        }
    });
});

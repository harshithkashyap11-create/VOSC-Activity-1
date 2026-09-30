const setupScreen = document.querySelector('#setup');
const gameScreen = document.querySelector('#game');
const startButton = document.querySelector('#start-game');
const boardElement = document.querySelector('#game-board');
const cells = [...document.querySelectorAll('.cell')];
const turnMessage = document.querySelector('#turn-message');
const gameSubtitle = document.querySelector('#game-subtitle');
const difficultyGroup = document.querySelector('#difficulty-group');
const markGroup = document.querySelector('#mark-group');

const cellNames = ['Top left', 'Top middle', 'Top right', 'Middle left', 'Center', 'Middle right', 'Bottom left', 'Bottom middle', 'Bottom right'];
const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

let mode = 'computer';
let difficulty = 'medium';
let playerMark = 'X';
let computerMark = 'O';
let board = Array(9).fill('');
let currentTurn = 'X';
let roundEnded = false;
let botThinking = false;
let botTimer;
let roundToken = 0;
let scores = { player: 0, opponent: 0, draws: 0 };

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    setChoice('[data-mode]', button, 'mode');
    mode = button.dataset.mode;
    difficultyGroup.classList.toggle('is-hidden', mode !== 'computer');
    markGroup.classList.toggle('is-hidden', mode !== 'computer');
    resetScores();
  });
});

document.querySelectorAll('[data-difficulty]').forEach((button) => {
  button.addEventListener('click', () => {
    setChoice('[data-difficulty]', button, 'difficulty');
    difficulty = button.dataset.difficulty;
    resetScores();
  });
});

document.querySelectorAll('[data-mark]').forEach((button) => {
  button.addEventListener('click', () => {
    setChoice('[data-mark]', button, 'mark');
    playerMark = button.dataset.mark;
    resetScores();
  });
});

startButton.addEventListener('click', startGame);
document.querySelector('#change-game').addEventListener('click', showSetup);
document.querySelector('#new-game').addEventListener('click', showSetup);
document.querySelector('#restart-round').addEventListener('click', resetRound);
cells.forEach((cell) => cell.addEventListener('click', () => playCell(Number(cell.dataset.cell))));

document.addEventListener('keydown', (event) => {
  if (gameScreen.classList.contains('is-hidden') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (!/^[1-9]$/.test(event.key)) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]')) return;
  event.preventDefault();
  playCell(Number(event.key) - 1);
});

function setChoice(selector, selected, groupName) {
  document.querySelectorAll(selector).forEach((button) => {
    const active = button === selected;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (groupName === 'mode') difficultyGroup.setAttribute('aria-label', `${selected.dataset.mode} game settings`);
}

function startGame() {
  computerMark = playerMark === 'X' ? 'O' : 'X';
  setupScreen.classList.add('is-hidden');
  gameScreen.classList.remove('is-hidden');
  gameSubtitle.textContent = mode === 'computer'
    ? `You’re ${playerMark} · ${capitalize(difficulty)} · vs Computer`
    : 'Two players · one board';
  renderScores();
  resetRound();
  document.querySelector('#game-title').focus({ preventScroll: true });
}

function showSetup() {
  clearTimeout(botTimer);
  roundToken += 1;
  botThinking = false;
  roundEnded = true;
  gameScreen.classList.add('is-hidden');
  setupScreen.classList.remove('is-hidden');
  document.querySelector('#setup-title').focus({ preventScroll: true });
}

function resetRound() {
  clearTimeout(botTimer);
  roundToken += 1;
  const thisRound = roundToken;
  board = Array(9).fill('');
  currentTurn = 'X';
  roundEnded = false;
  botThinking = mode === 'computer' && currentTurn === computerMark;
  renderBoard();
  setStatus(botThinking ? 'Computer is thinking…' : mode === 'computer' ? 'Your turn' : 'Player 1’s turn');
  if (botThinking) scheduleComputerTurn(thisRound, 350);
}

function playCell(index) {
  if (roundEnded || botThinking || board[index]) return;
  if (mode === 'computer' && currentTurn !== playerMark) return;

  board[index] = currentTurn;
  const result = getResult(board);
  renderBoard(result?.line ?? []);

  if (result) {
    finishRound(result);
    return;
  }

  currentTurn = currentTurn === 'X' ? 'O' : 'X';
  if (mode === 'computer' && currentTurn === computerMark) {
    botThinking = true;
    setStatus('Computer is thinking…');
    renderBoard();
    scheduleComputerTurn(roundToken, 420);
  } else {
    setStatus(mode === 'computer' ? 'Your turn' : `Player ${currentTurn === 'X' ? '1' : '2'}’s turn`);
    renderBoard();
  }
}

function scheduleComputerTurn(token, delay) {
  botTimer = window.setTimeout(() => {
    if (token !== roundToken || roundEnded) return;
    const move = chooseComputerMove();
    botThinking = false;
    if (move !== -1) {
      board[move] = computerMark;
      const result = getResult(board);
      renderBoard(result?.line ?? []);
      if (result) {
        finishRound(result);
        return;
      }
    }
    currentTurn = playerMark;
    setStatus('Your turn');
    renderBoard();
  }, delay);
}

function chooseComputerMove() {
  const openCells = board.flatMap((mark, index) => mark ? [] : [index]);
  if (!openCells.length) return -1;
  if (difficulty === 'easy') return pick(openCells);
  if (difficulty === 'hard') return pick(findBestMoves(board, computerMark, playerMark));

  const immediateWin = openCells.find((index) => {
    const next = [...board];
    next[index] = computerMark;
    return getResult(next)?.winner === computerMark;
  });
  if (immediateWin !== undefined) return immediateWin;

  const immediateBlock = openCells.find((index) => {
    const next = [...board];
    next[index] = playerMark;
    return getResult(next)?.winner === playerMark;
  });
  if (immediateBlock !== undefined) return immediateBlock;

  const best = findBestMoves(board, computerMark, playerMark);
  if (Math.random() < 0.62) return pick(best);
  return pick(openCells);
}

function findBestMoves(position, maximizingMark, minimizingMark) {
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const index of position.flatMap((mark, i) => mark ? [] : [i])) {
    position[index] = maximizingMark;
    const score = minimax(position, minimizingMark, maximizingMark, minimizingMark, 1);
    position[index] = '';
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) {
      bestMoves.push(index);
    }
  }
  return bestMoves;
}

function minimax(position, turn, maximizingMark, minimizingMark, depth) {
  const result = getResult(position);
  if (result) {
    if (result.winner === maximizingMark) return 10 - depth;
    if (result.winner === minimizingMark) return depth - 10;
    return 0;
  }

  const maximizing = turn === maximizingMark;
  let bestScore = maximizing ? -Infinity : Infinity;
  for (const index of position.flatMap((mark, i) => mark ? [] : [i])) {
    position[index] = turn;
    const nextTurn = turn === 'X' ? 'O' : 'X';
    const score = minimax(position, nextTurn, maximizingMark, minimizingMark, depth + 1);
    position[index] = '';
    bestScore = maximizing ? Math.max(bestScore, score) : Math.min(bestScore, score);
  }
  return bestScore;
}

function getResult(position) {
  for (const line of winningLines) {
    const [first, second, third] = line;
    if (position[first] && position[first] === position[second] && position[first] === position[third]) {
      return { winner: position[first], line };
    }
  }
  if (position.every(Boolean)) return { winner: null, line: [] };
  return null;
}

function finishRound(result) {
  roundEnded = true;
  botThinking = false;
  if (result.winner === null) {
    scores.draws += 1;
    turnMessage.textContent = 'A draw. Well played.';
  } else {
    const humanWon = mode === 'computer' ? result.winner === playerMark : result.winner === 'X';
    if (humanWon) {
      scores.player += 1;
      turnMessage.textContent = mode === 'computer' ? 'You won. Nicely played!' : 'Player 1 wins! Nicely played.';
    } else {
      scores.opponent += 1;
      turnMessage.textContent = mode === 'computer' ? 'Computer wins this one.' : 'Player 2 wins! Nicely played.';
    }
  }
  turnMessage.classList.add('is-result');
  renderScores();
  renderBoard(result.line);
}

function renderBoard(winningLine = []) {
  cells.forEach((cell, index) => {
    const mark = board[index];
    cell.classList.toggle('mark-x', mark === 'X');
    cell.classList.toggle('mark-o', mark === 'O');
    cell.classList.toggle('winning-cell', winningLine.includes(index));
    cell.dataset.key = String(index + 1);
    cell.setAttribute('aria-label', `${cellNames[index]}, ${mark || `empty, key ${index + 1}`}`);
    cell.disabled = Boolean(mark) || roundEnded || botThinking;
  });
  boardElement.setAttribute('aria-label', `Tic-Tac-Toe board. ${board.filter(Boolean).length} of 9 squares filled.`);
}

function renderScores() {
  const firstLabel = document.querySelector('#player-one-label');
  const secondLabel = document.querySelector('#player-two-label');
  firstLabel.textContent = mode === 'computer' ? `YOU (${playerMark})` : 'PLAYER 1 (X)';
  secondLabel.textContent = mode === 'computer' ? `BOT (${computerMark})` : 'PLAYER 2 (O)';
  document.querySelector('#player-one-score').textContent = String(scores.player);
  document.querySelector('#player-two-score').textContent = String(scores.opponent);
  document.querySelector('#draw-score').textContent = String(scores.draws);
}

function setStatus(message) {
  turnMessage.textContent = message;
  turnMessage.classList.remove('is-result');
}

function resetScores() {
  scores = { player: 0, opponent: 0, draws: 0 };
  renderScores();
}

function pick(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function capitalize(value) {
  return value[0].toUpperCase() + value.slice(1);
}

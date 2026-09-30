# VOSC Activity-1

## Your Move — Tic-Tac-Toe

A small, browser-based Tic-Tac-Toe game. Play a quick match against the computer or take turns with a friend on the same device.

## Files

- `index.html` — game screens and controls.
- `style.css` — layout, colours, responsive styles, and animations.
- `script.js` — turn rules, scorekeeping, and computer opponent.

## Run it

Open `index.html` in a modern browser. No install or build step is needed.

## How to play

1. Choose **Vs computer** or **With a friend**.
2. Against the computer, select a difficulty and choose X or O. If you choose O, the computer makes the opening move as X.
3. Select an empty square to place your mark. You can also use the number keys 1–9, moving left to right and top to bottom.
4. Get three marks in a row to win. Use **Restart round** to start over while keeping the match score, or **Change game** to return to the choices.

## Computer opponent

- **Easy** picks an empty square at random.
- **Medium** takes an immediate win or blocks one, then mixes smart moves with unexpected ones.
- **Hard** searches the possible moves with minimax. It will not lose; the best result against it is a draw.

The board, score, and controls work on both desktop and mobile screens.

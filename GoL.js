document.addEventListener('DOMContentLoaded', function () {
  const cellSize = 10;
  const rows = Math.floor(window.innerHeight / cellSize);
  const cols = Math.floor(window.innerWidth / cellSize);
  const container = document.getElementById('game-container');

  // Generate a more random and sparse initial seed
  function generateRandomSeed() {
    const seed = [];
    for (let i = 0; i < rows; i++) {
      seed[i] = [];
      for (let j = 0; j < cols; j++) {
        seed[i][j] = Math.random() > 0.9 ? 1 : 0; // Adjust the probability as needed for sparsity
      }
    }
    return seed;
  }

  // Render the initial seed
  function renderSeed(seed) {
    seed.forEach((row, i) => {
      row.forEach((cell, j) => {
        const cellElement = document.createElement('div');
        cellElement.className = `cell ${cell ? 'alive' : ''}`;
        cellElement.addEventListener('mousedown', () => toggleCellState(cellElement));
        container.appendChild(cellElement);
      });
    });
  }

  // Update the grid based on the rules of the Game of Life
  function updateGrid() {
    const cells = document.querySelectorAll('.cell');
    const newStates = [];

    cells.forEach((cell, index) => {
      const neighbors = getNeighbors(index, cols, cells.length);
      const aliveNeighbors = neighbors.filter((neighbor) => cells[neighbor].classList.contains('alive')).length;

      if (cell.classList.contains('alive')) {
        newStates[index] = aliveNeighbors === 2 || aliveNeighbors === 3 ? 1 : 0;
      } else {
        newStates[index] = aliveNeighbors === 3 ? 1 : 0;
      }
    });

    // Update cell states
    cells.forEach((cell, index) => {
      cell.classList.toggle('alive', newStates[index] === 1);
    });
  }

  // Get the indices of neighboring cells with wrapping around the screen
  function getNeighbors(index, cols, totalCells) {
    const neighbors = [];
    const row = Math.floor(index / cols);
    const col = index % cols;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = (row + i + rows) % rows;
        const newCol = (col + j + cols) % cols;
        neighbors.push(newRow * cols + newCol);
      }
    }

    // Remove the center cell (current cell)
    neighbors.splice(4, 1);

    return neighbors;
  }

  // Toggle the state of a cell
  function toggleCellState(cell) {
    cell.classList.toggle('alive');
  }

  // Handle mouse events
  let isMousePressed = false;

  container.addEventListener('mousedown', () => (isMousePressed = true));
  container.addEventListener('mouseup', () => (isMousePressed = false));
  container.addEventListener('mouseleave', () => (isMousePressed = false));

  container.addEventListener('mousemove', function (event) {
    if (isMousePressed) {
      const target = event.target;
      if (target.classList.contains('cell')) {
        toggleCellState(target);
      }
    }
  });

  // Initialize the game
  function init() {
    container.classList.add('space-theme');
    const initialSeed = generateRandomSeed();
    renderSeed(initialSeed);
    setInterval(updateGrid, 50); // Update every 50 milliseconds for faster animation
  }

  init();
});
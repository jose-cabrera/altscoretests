const express = require('express');
const router = express.Router();

// Function to parse radar coordinates
function parseRadarCoordinates(input) {
  // Split the input by | and filter out empty strings
  const coordinates = input.split('|').filter(coord => coord.length > 0);
  
  // Create an 8x8 grid filled with '0'
  const grid = Array(8).fill().map(() => Array(8).fill('0'));
  
  // Process each coordinate
  coordinates.forEach((coord, rowIndex) => {
    // Split the coordinate into individual cells (each cell is 3 characters)
    const cells = coord.match(/.{1,3}/g) || [];
    
    cells.forEach(cell => {
      if (cell.length === 3) {
        const column = cell[0].toLowerCase().charCodeAt(0) - 97; // Convert a-h to 0-7
        let value = cell[1];        
        const row = parseInt(cell[2]) - 1; // Convert 1-8 to 0-7
        
        if (column >= 0 && column < 8 && row >= 0 && row < 8) {
          // Debug log
          console.log(`Processing cell: ${cell}, Column: ${column}, Row: ${row}, Value: ${value}`);
          grid[7 - row][column] = value; // Invert row to match the required display
        }
      }
    });
  });
  
  return grid;
}

// Function to display the grid
function displayGrid(grid) {
  console.log('\nRadar Grid:');
  console.log('----------------');
  grid.forEach(row => {
    console.log(row.join(' '));
  });
  console.log('----------------\n');
}

// Endpoint to process radar coordinates
router.post('/', (req, res) => {
  try {
    const { coordinates } = req.body;
    
    if (!coordinates) {
      return res.status(400).json({ error: 'Coordinates are required' });
    }

    console.log('Received coordinates:', coordinates);

    // Parse and display the grid
    const grid = parseRadarCoordinates(coordinates);
    displayGrid(grid);

    res.status(200).json({ message: 'Radar coordinates processed successfully' });
  } catch (error) {
    console.error('Error processing radar coordinates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
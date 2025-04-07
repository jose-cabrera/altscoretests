const express = require('express');
const axios = require('axios');
const starwarsRouter = require('./starwars');
const radarRouter = require('./radar');
const pokemonRouter = require('./pokemon');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Mount the Star Wars routes
app.use('/starwars', starwarsRouter);

// Mount the Radar routes
app.use('/radar', radarRouter);

// Mount the Pokemon routes
app.use('/pokemon', pokemonRouter);

// Function to fetch a single page of stars
async function fetchStarsPage(page) {
  try {
    const response = await axios.get(`https://makers-challenge.altscore.ai/v1/s1/e2/resources/stars?page=${page}`, {
      headers: {
        'API-KEY': 'f2ff8a4650a447bd9152be0e8a366a76'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error.message);
    return null;
  }
}

// Function to fetch all pages
async function fetchAllStars() {
  const allStars = [];
  const totalPages = 34;

  for (let page = 1; page <= totalPages; page++) {
    console.log(`Fetching page ${page}...`);
    const pageData = await fetchStarsPage(page);
    
    if (pageData) {
      allStars.push(...pageData);
    }
    
    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allStars;
}

// Function to calculate total resonance
function calculateTotalResonance(stars) {
  return stars.reduce((sum, star) => {
    return sum + (star.resonance || 0);
  }, 0);
}

// Function to calculate average resonance
function calculateAverageResonance(stars) {
  if (stars.length === 0) return 0;
  const total = calculateTotalResonance(stars);
  return total / stars.length;
}

// Endpoint to fetch all stars and calculate resonance
app.get('/api/stars', async (req, res) => {
  try {
    const stars = await fetchAllStars();
    const totalResonance = calculateTotalResonance(stars);
    const averageResonance = calculateAverageResonance(stars);
    
    res.json({
      totalStars: stars.length,
      totalResonance: totalResonance,
      averageResonance: averageResonance,
      data: stars
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example route that uses axios
app.get('/api/example', async (req, res) => {
  try {
    const response = await axios.get('https://api.example.com/data');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
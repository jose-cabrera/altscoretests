const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_FILE = path.join(__dirname, '../data/pokemon_cache.json');
const CSV_FILE = path.join(__dirname, '../data/pokemon_data.csv');
const cache = {
  pokemon: new Map(),
  lastFetch: null
};

// Function to save data to CSV
async function saveToCSV(pokemonData) {
  try {
    // Create CSV header
    let csvContent = 'id,name,height,types\n';
    
    // Add each pokemon's data
    for (const [id, pokemon] of pokemonData.entries()) {
      const types = pokemon.types.join('|'); // Join types with pipe separator
      csvContent += `${id},${pokemon.name},${pokemon.height},${types}\n`;
    }
    
    // Create data directory if it doesn't exist
    await fs.mkdir(path.dirname(CSV_FILE), { recursive: true });
    
    // Write CSV file
    await fs.writeFile(CSV_FILE, csvContent);
    console.log('Data saved to CSV file');
  } catch (error) {
    console.error('Error saving CSV:', error);
  }
}

// Function to load cache from file
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    const parsedData = JSON.parse(data);
    
    // Convert the plain object back to a Map
    cache.pokemon = new Map(Object.entries(parsedData.pokemon));
    cache.lastFetch = parsedData.lastFetch;
    
    console.log('Cache loaded from file');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error loading cache:', error);
    }
  }
}

// Function to save cache to file
async function saveCache() {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    
    // Convert Map to plain object for JSON serialization
    const cacheData = {
      pokemon: Object.fromEntries(cache.pokemon),
      lastFetch: cache.lastFetch
    };
    
    // Save JSON cache
    await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log('Cache saved to file');
    
    // Save CSV file
    await saveToCSV(cache.pokemon);
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

// Function to check if cache is valid
function isCacheValid() {
  if (!cache.lastFetch) return false;
  return (Date.now() - cache.lastFetch) < CACHE_DURATION;
}

// Function to fetch a single pokemon
async function fetchPokemon(id) {
  // Check cache first
  if (cache.pokemon.has(id)) {
    return cache.pokemon.get(id);
  }

  try {
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const pokemonData = response.data;
    
    // Save only essential data to cache
    const essentialData = {
      name: pokemonData.name,
      height: pokemonData.height,
      types: pokemonData.types.map(type => type.type.name) // Only save type names
    };
    
    // Save to cache
    cache.pokemon.set(id, essentialData);
    await saveCache();
    
    return pokemonData;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error(`Error fetching pokemon ${id}:`, error.message);
    return null;
  }
}

// Function to fetch all pokemon
async function fetchAllPokemon() {
  const allPokemon = [];
  let id = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching pokemon ${id}...`);
    const pokemon = await fetchPokemon(id);
    
    if (pokemon) {
      // Only store essential data in memory
      allPokemon.push({
        name: pokemon.name,
        height: pokemon.height,
        types: pokemon.types.map(type => type.type.name) // Only save type names
      });
    } else {
      hasMore = false;
    }
    
    id++;
    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Update last fetch time and save cache
  cache.lastFetch = Date.now();
  await saveCache();

  return allPokemon;
}

// Function to calculate average heights by type
function calculateAverageHeightsByType(pokemonList) {
  const typeHeights = {
    bug: { sum: 0, count: 0 },
    dark: { sum: 0, count: 0 },
    dragon: { sum: 0, count: 0 },
    electric: { sum: 0, count: 0 },
    fairy: { sum: 0, count: 0 },
    fighting: { sum: 0, count: 0 },
    fire: { sum: 0, count: 0 },
    flying: { sum: 0, count: 0 },
    ghost: { sum: 0, count: 0 },
    grass: { sum: 0, count: 0 },
    ground: { sum: 0, count: 0 },
    ice: { sum: 0, count: 0 },
    normal: { sum: 0, count: 0 },
    poison: { sum: 0, count: 0 },
    psychic: { sum: 0, count: 0 },
    rock: { sum: 0, count: 0 },
    steel: { sum: 0, count: 0 },
    water: { sum: 0, count: 0 }
  };

  // Sum up heights for each type
  pokemonList.forEach(pokemon => {
    const height = pokemon.height; // Keep in decimeters
    pokemon.types.forEach(typeName => {
      if (typeHeights[typeName]) {
        typeHeights[typeName].sum += height;
        typeHeights[typeName].count++;
      }
    });
  });

  // Calculate averages
  const heights = {};
  Object.entries(typeHeights).forEach(([type, data]) => {
    heights[type] = data.count > 0 
      ? Number((data.sum / data.count).toFixed(3))
      : 0;
  });

  return { heights };
}

// Endpoint to get average heights by type
router.get('/heights', async (req, res) => {
  try {
    console.log('Fetching all pokemon data...');
    const allPokemon = await fetchAllPokemon();
    
    console.log('Calculating average heights by type...');
    const result = calculateAverageHeightsByType(allPokemon);
    
    res.json(result);
  } catch (error) {
    console.error('Error calculating heights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Function to fetch multiple pokemon
async function fetchPokemonRange(startId, endId) {
  const pokemonList = [];
  
  for (let id = startId; id <= endId; id++) {
    console.log(`Fetching pokemon ${id}...`);
    const pokemon = await fetchPokemon(id);
    
    if (pokemon) {
      pokemonList.push(pokemon);
    }
    
    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return pokemonList;
}

// Load cache when the module is initialized
loadCache().catch(console.error);

module.exports = router; 
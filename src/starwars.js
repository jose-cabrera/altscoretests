const express = require('express');
const axios = require('axios');

const router = express.Router();

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const cache = {
  people: new Map(),
  planets: new Map(),
  oracle: new Map(),
  lastFetch: null
};

// Function to check if cache is valid
function isCacheValid() {
  if (!cache.lastFetch) return false;
  return (Date.now() - cache.lastFetch) < CACHE_DURATION;
}

// Function to decode base64
function decodeBase64(base64String) {
  try {
    return Buffer.from(base64String, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Error decoding base64:', error);
    return null;
  }
}

// Function to check if text contains Light Side or Dark Side
function checkSide(text) {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  if (lowerText.includes('light side')) return 'light';
  if (lowerText.includes('dark side')) return 'dark';
  return null;
}

// Function to fetch oracle data for a person
async function fetchOracleData(name) {
  // Check cache first
  if (cache.oracle.has(name)) {
    console.log(`Using cached oracle data for ${name}`);
    return cache.oracle.get(name);
  }

  try {
    const response = await axios.get(`https://makers-challenge.altscore.ai/v1/s1/e3/resources/oracle-rolodex`, {
      params: {
        name: name
      },
      headers: {
        'API-KEY': 'f2ff8a4650a447bd9152be0e8a366a76'
      }
    });
    
    if (response.data && response.data.oracle_notes) {
      const decodedNotes = decodeBase64(response.data.oracle_notes);
      const side = checkSide(decodedNotes);
      const oracleData = {
        name,
        oracle_notes: decodedNotes,
        side
      };
      
      // Store in cache
      cache.oracle.set(name, oracleData);
      return oracleData;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching oracle data for ${name}:`, error.message);
    return null;
  }
}

// Function to fetch a single person
async function fetchPerson(id) {
  // Check cache first
  if (cache.people.has(id)) {
    console.log(`Using cached person data for ID ${id}`);
    return cache.people.get(id);
  }

  try {
    const response = await axios.get(`https://swapi.dev/api/people/${id}`);
    const personData = response.data;
    
    // Store in cache
    cache.people.set(id, personData);
    return personData;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error(`Error fetching person ${id}:`, error.message);
    return null;
  }
}

// Function to fetch a single planet
async function fetchPlanet(id) {
  // Check cache first
  if (cache.planets.has(id)) {
    console.log(`Using cached planet data for ID ${id}`);
    return cache.planets.get(id);
  }

  try {
    const response = await axios.get(`https://swapi.dev/api/planets/${id}`);
    const planetData = response.data;
    
    // Store in cache
    cache.planets.set(id, planetData);
    return planetData;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error(`Error fetching planet ${id}:`, error.message);
    return null;
  }
}

// Function to extract planet ID from URL
function getPlanetIdFromUrl(url) {
  const matches = url.match(/\/(\d+)\/$/);
  return matches ? matches[1] : null;
}

// Function to fetch all people with oracle data
async function fetchAllPeople() {
  const allPeople = [];
  const MAX_PEOPLE = 83;
  let lightSideCount = 0;
  let darkSideCount = 0;

  for (let id = 1; id <= MAX_PEOPLE; id++) {
    console.log(`Fetching person ${id}...`);
    const person = await fetchPerson(id);
    
    if (person) {
      // Fetch oracle data for the person
      const oracleData = await fetchOracleData(person.name);
      if (oracleData) {
        if (oracleData.side === 'light') lightSideCount++;
        if (oracleData.side === 'dark') darkSideCount++;
        
        person.oracle_data = oracleData;
      }
      allPeople.push(person);
    }
    
    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    people: allPeople,
    lightSideCount,
    darkSideCount
  };
}

// Function to fetch all planets
async function fetchAllPlanets() {
  const allPlanets = [];
  let id = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching planet ${id}...`);
    const planet = await fetchPlanet(id);
    
    if (planet) {
      allPlanets.push(planet);
    } else {
      hasMore = false;
    }
    
    id++;
    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allPlanets;
}

// Function to organize people by planet
function organizePeopleByPlanet(people, planets) {
  const planetMap = new Map();
  
  // Initialize planet map with empty residents array and side counts
  planets.forEach(planet => {
    planetMap.set(planet.url, {
      ...planet,
      residents: [],
      lightSideCount: 0,
      darkSideCount: 0,
      ibf: 0
    });
  });

  // Add people to their respective planets and count sides
  people.forEach(person => {
    const planetUrl = person.homeworld;
    if (planetMap.has(planetUrl)) {
      const planet = planetMap.get(planetUrl);
      planet.residents.push(person);
      
      // Count sides if oracle data exists
      if (person.oracle_data && person.oracle_data.side) {
        if (person.oracle_data.side === 'light') {
          planet.lightSideCount++;
        } else if (person.oracle_data.side === 'dark') {
          planet.darkSideCount++;
        }
      }
    }
  });

  // Calculate IBF for each planet
  planetMap.forEach(planet => {
    const totalResidents = planet.residents.length;
    if (totalResidents > 0) {
      planet.ibf = (planet.lightSideCount - planet.darkSideCount) / totalResidents;
    }
  });

  return Array.from(planetMap.values());
}

// Function to get planets with residents
function getPlanetsWithResidents(planets) {
  return planets.filter(planet => planet.residents.length > 0);
}

// Endpoint to fetch all Star Wars data
router.get('/', async (req, res) => {
  try {
    console.log('Starting to fetch Star Wars data...');
    
    // Check if we have valid cached data
    if (isCacheValid()) {
      console.log('Using cached data');
      const cachedData = {
        totalPeople: cache.people.size,
        totalPlanets: cache.planets.size,
        lightSideCount: Array.from(cache.oracle.values()).filter(data => data.side === 'light').length,
        darkSideCount: Array.from(cache.oracle.values()).filter(data => data.side === 'dark').length,
        planets: organizePeopleByPlanet(
          Array.from(cache.people.values()),
          Array.from(cache.planets.values())
        )
      };
      return res.json(cachedData);
    }

    // If cache is invalid or empty, fetch fresh data
    const [peopleData, planets] = await Promise.all([
      fetchAllPeople(),
      fetchAllPlanets()
    ]);

    // Update cache timestamp
    cache.lastFetch = Date.now();

    // Organize people by planet
    const planetsWithResidents = organizePeopleByPlanet(peopleData.people, planets);

    res.json({
      totalPeople: peopleData.people.length,
      totalPlanets: planets.length,
      lightSideCount: peopleData.lightSideCount,
      darkSideCount: peopleData.darkSideCount,
      planets: planetsWithResidents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to get only planets with residents
router.get('/planets-with-residents', async (req, res) => {
  try {
    console.log('Starting to fetch planets with residents...');
    
    // Check if we have valid cached data
    if (isCacheValid()) {
      console.log('Using cached data');
      const cachedData = {
        totalPlanetsWithResidents: cache.planets.size,
        lightSideCount: Array.from(cache.oracle.values()).filter(data => data.side === 'light').length,
        darkSideCount: Array.from(cache.oracle.values()).filter(data => data.side === 'dark').length,
        planets: getPlanetsWithResidents(
          organizePeopleByPlanet(
            Array.from(cache.people.values()),
            Array.from(cache.planets.values())
          )
        )
      };
      return res.json(cachedData);
    }

    // If cache is invalid or empty, fetch fresh data
    const [peopleData, planets] = await Promise.all([
      fetchAllPeople(),
      fetchAllPlanets()
    ]);

    // Update cache timestamp
    cache.lastFetch = Date.now();

    // Organize people by planet and filter for planets with residents
    const allPlanets = organizePeopleByPlanet(peopleData.people, planets);
    const planetsWithResidents = getPlanetsWithResidents(allPlanets);

    res.json({
      totalPlanetsWithResidents: planetsWithResidents.length,
      lightSideCount: peopleData.lightSideCount,
      darkSideCount: peopleData.darkSideCount,
      planets: planetsWithResidents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 
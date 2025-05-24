// StarWars API Code
// This code intentionally violates clean code principles for refactoring practice

const process = require("process");
const http = require("http");
const https = require("https");

const cache = {};
let isDebugMode = true;
let errorCount = 0;
let requestTimeoutMs = 5000;
const statusCodeOK = 200;
const notFoundStatusCode = 404;
const DEFAULTPORT = 3000;
const PORT = process.env.PORT || DEFAULTPORT;

// Global variables for tracking state
let characterID = 1;
let fetchCount = 0;
let totalDataSize = 0;
const sliceAmount = 2;
const args = process.argv.slice(sliceAmount);

async function fetchData(requestUrl) {
    const cachedData = getDataFromCache(requestUrl);
    if (cachedData) return cachedData;

    return await doHttpRequest(requestUrl);
}

function getDataFromCache(requestUrl) {
    if (cache[requestUrl]) {
        if (isDebugMode) console.log("Using cached data for", requestUrl);
        return cache[requestUrl];
    }

    return null;
}

function doHttpRequest(requestUrl) {
    return new Promise((resolve, reject) => {
        const req = https.get(`https://swapi.dev/api/${requestUrl}`, { rejectUnauthorized: false }, (res) => {
            handleResponse(res, requestUrl, resolve, reject);
        });

        handleRequestErrors(req, requestUrl, reject);
    });
}

function handleResponse(res, requestUrl, resolve, reject) {
    if (!handleFailedResponse(res.statusCode, reject)) return;

    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => handleSuccessResponse(data, requestUrl, resolve, reject));
}

function handleFailedResponse(statusCode, reject) {
    const BAD_STATUS_CODE = 400;
    if (statusCode >= BAD_STATUS_CODE) {
        errorCount++;
        reject(new Error(`Request failed with status code ${statusCode}`));

        return false;
    }

    return true;
}

function handleSuccessResponse(data, requestUrl, resolve, reject) {
    try {
        const parsedData = JSON.parse(data);
        saveToCache(requestUrl, parsedData);
        resolve(parsedData);
        logDebugInfo(requestUrl);
    } catch (error) {
        errorCount++;
        reject(error);
    }
}

function saveToCache(requestUrl, data) {
    cache[requestUrl] = data;
}

function logDebugInfo(requestUrl) {
    if (!isDebugMode) return;
    console.log(`Successfully fetched data for ${requestUrl}`);
    console.log(`Cache size: ${Object.keys(cache).length}`);
}

function handleRequestErrors(req, requestUrl, reject) {
    req.on("error", (error) => {
        errorCount++;
        reject(error);
    });

    req.setTimeout(requestTimeoutMs, () => {
        req.abort();
        errorCount++;
        reject(new Error(`Request timeout for ${requestUrl}`));
    });
}

async function displayData() {
    try {
        if (isDebugMode) console.log("Starting data fetch...");
        fetchCount++;

        await displayCharacterData();
        await displayStarshipsData();
        await displayPlanetsData();
        await displayFilmsData();
        await displayVehiclesData();

        // Print stats
        if (isDebugMode) displayStats();

    } catch (error) {
        console.error("Error:", error.message);
        errorCount++;
    }
}

async function displayCharacterData() {
    const character = await fetchData(`people/${characterID}`);
    totalDataSize += JSON.stringify(character).length;
    console.log("Character:", character.name);
    console.log("Height:", character.height);
    console.log("Mass:", character.mass);
    console.log("Birthday:", character.birth_year);

    if (character.films && character.films.length > 0) {
        console.log("Appears in", character.films.length, "films");
    }
}

async function displayStarshipsData() {
    const starships = await fetchData("starships/?page=1");
    const maxStarshipsToDisplay = 3;

    totalDataSize += JSON.stringify(starships).length;
    console.log("\nTotal Starships:", starships.count);

    const starshipsToShow = starships.results.slice(0, maxStarshipsToDisplay);

    starshipsToShow.forEach((starship, i) => {
        console.log(`\nStarship ${i + 1}:`);
        console.log("Name:", starship.name);
        console.log("Model:", starship.model);
        console.log("Manufacturer:", starship.manufacturer);

        const cost = starship.cost_in_credits;
        console.log("Cost:", cost !== "unknown" ? `${cost} credits` : "unknown");
        console.log("Speed:", starship.max_atmosphering_speed);
        console.log("Hyperdrive Rating:", starship.hyperdrive_rating);

        const hasPilots = starship.pilots?.length > 0;
        if (hasPilots) {
            console.log("Pilots:", starship.pilots.length);
        }
    });
}

async function displayPlanetsData() {
    // Find planets with population > 1000000000 and diameter > 10000
    const planets = await fetchData("planets/?page=1");
    totalDataSize += JSON.stringify(planets).length;

    console.log("\nLarge populated planets:");

    for (let i = 0; i < planets.results.length; i++) {
        const planet = planets.results[i];
        const minPopulation = 1000000000;
        const minDiameter = 10000;

        if (checkPlanetPopulationAndDiameter(planet, minPopulation, minDiameter)) {
            console.log(planet.name, "- Pop:", planet.population, "- Diameter:", 
                planet.diameter, "- Climate:", planet.climate);

            // Check if it appears in any films
            if (planet.films && planet.films.length > 0) {
                console.log(`Appears in ${planet.films.length} films`);
            }
        }
    }
}

function checkPlanetPopulationAndDiameter(planet, minPopulation, minDiameter) {
    return (
        planet.population !== "unknown" &&
        parseInt(planet.population) > minPopulation &&
        planet.diameter !== "unknown" &&
        parseInt(planet.diameter) > minDiameter
    );
}

async function displayFilmsData() {
    // Get films and sort by release date, then print details
    const films = await fetchData("films/");
    totalDataSize += JSON.stringify(films).length;
    const filmList = films.results;

    filmList.sort((filmA, filmB) => {
        return new Date(filmA.release_date) - new Date(filmB.release_date);
    });

    console.log("\nStar Wars Films in chronological order:");
    for (let i = 0; i < filmList.length; i++) {
        const film = filmList[i];
        console.log(`${i + 1}. ${film.title} (${film.release_date})`);
        console.log(`Director: ${film.director}`);
        console.log(`Producer: ${film.producer}`);
        console.log(`Characters: ${film.characters.length}`);
        console.log(`Planets: ${film.planets.length}`);
    }
}

function displayStats() {
    console.log("\nStats:");
    console.log("API Calls:", fetchCount);
    console.log("Cache Size:", Object.keys(cache).length);
    console.log("Total Data Size:", totalDataSize, "bytes");
    console.log("Error Count:", errorCount);
}

// OBS: Esperando retorno do professor, rota não funcionando.
// Get a vehicle and display details
async function displayVehiclesData() {
    const maxFetchedVehicles = 4;

    if (characterID <= maxFetchedVehicles) {
        const vehicle = await fetchData(`vehicles/${characterID}`);
        totalDataSize += JSON.stringify(vehicle).length;
        console.log("\nFeatured Vehicle:");
        console.log("Name:", vehicle.name);
        console.log("Model:", vehicle.model);
        console.log("Manufacturer:", vehicle.manufacturer);
        console.log("Cost:", vehicle.cost_in_credits, "credits");
        console.log("Length:", vehicle.length);
        console.log("Crew Required:", vehicle.crew);
        console.log("Passengers:", vehicle.passengers);
        characterID++;  // Increment for next call
    }
}

// Process command line arguments
if (args.includes("--no-debug")) {
    isDebugMode = false;
}
if (args.includes("--timeout")) {
    const index = args.indexOf("--timeout");
    if (index < args.length - 1) {
        requestTimeoutMs = parseInt(args[index + 1]);
    }
}

// Create a simple HTTP server to display the results
const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(statusCodeOK, { "Content-Type": "text/html" });
        const htmlPageParams = { fetchCount, cache, errCount: errorCount, isDebugMode, timeout: requestTimeoutMs };
        res.end(renderHtmlPage(htmlPageParams));
    } else if (req.url === "/api") {
        displayData();
        res.writeHead(statusCodeOK, { "Content-Type": "text/plain" });
        res.end("Check server console for results");
    } else if (req.url === "/stats") {
        res.writeHead(statusCodeOK, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                api_calls: fetchCount,
                cache_size: Object.keys(cache).length,
                data_size: totalDataSize,
                errors: errorCount,
                debug: isDebugMode,
                timeout: requestTimeoutMs,
            })
        );
    } else {
        res.writeHead(notFoundStatusCode, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
});

function getHtmlPageStyle() {
    return `
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #FFE81F; background-color: #000; padding: 10px; }
            button { background-color: #FFE81F; border: none; padding: 10px 20px; cursor: pointer; }
            .footer { margin-top: 50px; font-size: 12px; color: #666; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        </style>
    `;
}

function getHtmlPageScript() {
    return `
        <script>
            function fetchData() {
                document.getElementById('results').innerHTML = '<p>Loading data...</p>';
                fetch('/api')
                    .then(res => res.text())
                    .then(text => {
                        alert('API request made! Check server console.');
                        document.getElementById('results').innerHTML = '<p>Data fetched! Check server console.</p>';
                    })
                    .catch(err => {
                        document.getElementById('results').innerHTML = '<p>Error: ' + err.message + '</p>';
                    });
            }
        </script>
    `;
}

function renderHtmlPage(htmlPageParams) {
    return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Star Wars API Demo</title>
                ${getHtmlPageStyle()}
            </head>
            <body>
                <h1>Star Wars API Demo</h1>
                <p>This page demonstrates fetching data from the Star Wars API.</p>
                <p>Check your console for the API results.</p>
                <button onclick="fetchData()">Fetch Star Wars Data</button>
                <div id="results"></div>
                ${getHtmlPageScript()}
                <div class="footer">
                    <p>
                        API calls: ${htmlPageParams.fetchCount} | 
                        Cache entries: ${Object.keys(htmlPageParams.cache).length} | 
                        Errors: ${htmlPageParams.errCount}
                    </p>
                    <pre>${`Debug mode: ${htmlPageParams.isDebugMode ? "ON" : "OFF"} | ` +
                        `Timeout: ${htmlPageParams.timeout}ms`}</pre>
                </div>
            </body>
        </html>
    `;
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log("Open the URL in your browser and click the button to fetch Star Wars data");
    if (isDebugMode) {
        console.log("Debug mode: ON");
        console.log("Timeout:", requestTimeoutMs, "ms");
    }
});

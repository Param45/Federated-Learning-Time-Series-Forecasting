// Global Chart Instances & State
let dlChart, ulChart, rntiChart, rbDownChart, rbUpChart;
let globalCSVData = [];
let currentScrubIndex = 0;
let isPlaying = false;
let playInterval = null;
const WINDOW_SIZE = 300;

// Station Coordinates
const stationCoords = {
    "ElBorn": [41.3851, 2.1834],
    "LesCorts": [41.3809, 2.1228],  // Camp Nou
    "PobleSec": [41.3743, 2.1625]
};

// Initialize Leaflet Map (Dark theme map tiles)
const map = L.map('map').setView([41.3851, 2.1734], 14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Markers
const markers = {};
for (const [station, coords] of Object.entries(stationCoords)) {
    markers[station] = L.marker(coords).addTo(map)
        .bindPopup(`<b style="color: black;">${station}</b><br><span style="color: black;">5G Base Station Node</span>`)
        .on('click', () => {
            selectStation(station);
        });
}

// Chart Configurations
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.color = "#94a3b8";

function createDualChart(ctx, title, colorTrue, colorPred, yAxisLabel) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Actual Data',
                    data: [],
                    borderColor: colorTrue,
                    backgroundColor: colorTrue + '1A', // adds subtle background tint
                    borderWidth: 3,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0.4 // Smoother bezier curves
                },
                {
                    label: 'Federated Prediction',
                    data: [],
                    borderColor: colorPred,
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0.4 // Smoother bezier curves
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            scales: {
                y: { 
                    beginAtZero: false, 
                    grid: { color: '#2a2e37', drawBorder: false },
                    title: {
                        display: true,
                        text: yAxisLabel,
                        color: '#94a3b8',
                        font: { size: 13, weight: '500' }
                    }
                },
                x: { 
                    grid: { display: false, drawBorder: false },
                    title: {
                        display: true,
                        text: 'Timestamps (HH:MM:SS)',
                        color: '#94a3b8',
                        font: { size: 13, weight: '500' }
                    }
                }
            },
            plugins: {
                legend: { 
                    display: true, 
                    position: 'top',
                    labels: { color: '#e2e8f0', usePointStyle: true, boxWidth: 8, padding: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 10
                }
            }
        }
    });
}

// Initialize empty charts
const dlCtx = document.getElementById('downlinkChart').getContext('2d');
const ulCtx = document.getElementById('uplinkChart').getContext('2d');
const rntiCtx = document.getElementById('rntiChart').getContext('2d');
const rbDownCtx = document.getElementById('rbDownChart').getContext('2d');
const rbUpCtx = document.getElementById('rbUpChart').getContext('2d');

dlChart = createDualChart(dlCtx, 'Downlink Traffic', '#3b82f6', '#ef4444', 'Data Rate (bps)');  // Blue vs Red
ulChart = createDualChart(ulCtx, 'Uplink Traffic', '#14b8a6', '#f59e0b', 'Data Rate (bps)');  // Teal vs Amber
rntiChart = createDualChart(rntiCtx, 'RNTI Count', '#8b5cf6', '#10b981', 'Total Active Clients');  // Purple vs Emerald
rbDownChart = createDualChart(rbDownCtx, 'RB Downlink', '#ec4899', '#06b6d4', 'Allocated Resource Blocks');  // Pink vs Cyan
rbUpChart = createDualChart(rbUpCtx, 'RB Uplink', '#6366f1', '#f43f5e', 'Allocated Resource Blocks');  // Indigo vs Rose

// Load and Parse CSV Data
function loadData(station) {
    // using the fused "_dashboard.csv" created by python
    const url = `data/${station}_dashboard.csv`;
    
    Papa.parse(url, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            updateDashboard(results.data, station);
        },
        error: function(err) {
            console.error("Error fetching data:", err);
            document.getElementById('total-samples').innerText = "Data missing";
        }
    });
}

function updateDashboard(data, station) {
    // Filter and cache globally
    globalCSVData = data.filter(r => r.true_down !== null && r.pred_down !== null);
    
    document.getElementById('total-samples').innerText = globalCSVData.length.toLocaleString();
    
    // Reset Playback
    stopPlayback();
    
    // Configure Scrubber bounds
    const scrubber = document.getElementById('timeScrubber');
    scrubber.min = Math.min(WINDOW_SIZE, globalCSVData.length);
    scrubber.max = globalCSVData.length;
    scrubber.value = globalCSVData.length;
    currentScrubIndex = globalCSVData.length;
    
    document.getElementById('startTimeLabel').innerText = extractLabel(globalCSVData[0].time);
    
    renderWindow();

    // Update titles
    document.getElementById('dl-chart-title').innerText = `${station} - Downlink Details (bps)`;
    document.getElementById('ul-chart-title').innerText = `${station} - Uplink Details (bps)`;
    document.getElementById('rnti-chart-title').innerText = `${station} - Active Clients (RNTI)`;
    document.getElementById('rb-down-chart-title').innerText = `${station} - Downlink Resource Blocks`;
    document.getElementById('rb-up-chart-title').innerText = `${station} - Uplink Resource Blocks`;
}

function extractLabel(timeStr) {
    return String(timeStr).split(' ')[1] || `T-${timeStr}`;
}

function renderWindow() {
    if(!globalCSVData.length) return;
    
    const startIndex = Math.max(0, currentScrubIndex - WINDOW_SIZE);
    const displayData = globalCSVData.slice(startIndex, currentScrubIndex);
    const labels = displayData.map(r => extractLabel(r.time));
    
    // Update labels UI
    document.getElementById('currentTimeLabel').innerText = labels[labels.length - 1] || 'Current';

    // Update charts
    dlChart.data.labels = labels;
    dlChart.data.datasets[0].data = displayData.map(r => r.true_down);
    dlChart.data.datasets[1].data = displayData.map(r => r.pred_down);
    dlChart.update();

    ulChart.data.labels = labels;
    ulChart.data.datasets[0].data = displayData.map(r => r.true_up);
    ulChart.data.datasets[1].data = displayData.map(r => r.pred_up);
    ulChart.update();
    
    rntiChart.data.labels = labels;
    rntiChart.data.datasets[0].data = displayData.map(r => r.true_rnti);
    rntiChart.data.datasets[1].data = displayData.map(r => r.pred_rnti);
    rntiChart.update();

    rbDownChart.data.labels = labels;
    rbDownChart.data.datasets[0].data = displayData.map(r => r.true_rb_down);
    rbDownChart.data.datasets[1].data = displayData.map(r => r.pred_rb_down);
    rbDownChart.update();

    rbUpChart.data.labels = labels;
    rbUpChart.data.datasets[0].data = displayData.map(r => r.true_rb_up);
    rbUpChart.data.datasets[1].data = displayData.map(r => r.pred_rb_up);
    rbUpChart.update();
}

// ==== SIMULATION & PLAYBACK LOGIC ==== //
const playBtn = document.getElementById('playBtn');
const scrubber = document.getElementById('timeScrubber');
const speedSelect = document.getElementById('speedSelect');

function stopPlayback() {
    isPlaying = false;
    clearInterval(playInterval);
    playBtn.innerHTML = '▶ Start Simulation';
    playBtn.classList.remove('playing');
}

function togglePlayback() {
    if (isPlaying) {
        stopPlayback();
    } else {
        // Jump to start if currently at end
        if (currentScrubIndex >= globalCSVData.length) {
            currentScrubIndex = WINDOW_SIZE;
            scrubber.value = WINDOW_SIZE;
        }
        
        isPlaying = true;
        playBtn.innerHTML = '⏸ Pause Simulation';
        playBtn.classList.add('playing');
        
        const speedMultiplier = parseInt(speedSelect.value);
        // 1x = 1 data point per second (1000ms), 10x = 1 point per 100ms
        const intervalMs = 1000 / speedMultiplier;
        
        playInterval = setInterval(() => {
            if (currentScrubIndex < globalCSVData.length) {
                currentScrubIndex++;
                scrubber.value = currentScrubIndex;
                renderWindow();
            } else {
                stopPlayback(); // Reached end
            }
        }, intervalMs);
    }
}

playBtn.addEventListener('click', togglePlayback);

scrubber.addEventListener('input', (e) => {
    stopPlayback(); // Stop if user manually scrubs
    currentScrubIndex = parseInt(e.target.value);
    renderWindow();
});

speedSelect.addEventListener('change', () => {
    if (isPlaying) {
        stopPlayback();
        togglePlayback(); // Restart with new speed
    }
});
// =================================== //

// Station Selection Logic
function selectStation(station) {
    // UI Update
    document.querySelectorAll('.station-btn').forEach(btn => {
        if(btn.dataset.station === station) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Map Focus
    map.flyTo(stationCoords[station], 15, {
        duration: 1.5
    });
    markers[station].openPopup();

    // Data Load
    loadData(station);
}

// Attach Event Listeners
document.querySelectorAll('.station-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        selectStation(e.target.dataset.station);
    });
});

// Initial Load
setTimeout(() => {
    selectStation('ElBorn');
}, 500);

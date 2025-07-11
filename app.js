const { ipcRenderer } = require('electron');
const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const colorHistoryDiv = document.getElementById('colorHistory');
const widthInput = document.getElementById('canvasWidth');
const heightInput = document.getElementById('canvasHeight');
const resizeBtn = document.getElementById('resizeCanvas');

let pixelWidth = 16;
let pixelHeight = 16;
let pixelSize = 16;

let currentColor = '#000000';
let colorHistory = [currentColor];
const maxColorHistory = 8;

let history = [];
let redoStack = [];
let isDrawing = false;

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < pixelWidth; x++) {
        for (let y = 0; y < pixelHeight; y++) {
            ctx.strokeStyle = '#eee';
            ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
    }
}

function resizeCanvas() {
    pixelWidth = parseInt(widthInput.value);
    pixelHeight = parseInt(heightInput.value);
    canvas.width = pixelWidth * pixelSize;
    canvas.height = pixelHeight * pixelSize;
    drawGrid();
    history = [];
    redoStack = [];
}

canvas.addEventListener('mousedown', function(e) {
    isDrawing = true;
    drawPixel(e);
});
canvas.addEventListener('mousemove', function(e) {
    if (isDrawing) {
        drawPixel(e);
    }
});
canvas.addEventListener('mouseup', function(e) {
    if (isDrawing) {
        isDrawing = false;
    }
});
canvas.addEventListener('mouseleave', function(e) {
    if (isDrawing) {
        isDrawing = false;
    }
});

function drawPixel(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    ctx.fillStyle = currentColor;
    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    ctx.strokeStyle = '#eee';
    ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    history.push({x, y, color: currentColor});
    if (history.length > 1000) history.shift();
    redoStack = [];
    updateColorHistory(currentColor);
}


function updateColorHistory(newColor) {
    if (colorHistory[colorHistory.length - 1] !== newColor) {
        colorHistory = colorHistory.filter(c => c !== newColor);
        colorHistory.push(newColor);
        if (colorHistory.length > maxColorHistory) colorHistory.shift();
        renderColorHistory();
    }
}

function renderColorHistory() {
    if (!colorHistoryDiv) return;
    colorHistoryDiv.innerHTML = '';
    colorHistory.forEach(color => {
        const swatch = document.createElement('button');
        swatch.className = 'color-swatch';
        swatch.style.background = color;
        swatch.title = color;
        swatch.onclick = () => {
            colorPicker.value = color;
            currentColor = color;
            updateColorHistory(color);
        };
        colorHistoryDiv.appendChild(swatch);
    });
}

colorPicker.addEventListener('input', function() {
    currentColor = colorPicker.value;
});

window.addEventListener('DOMContentLoaded', () => {
    renderColorHistory();
    const updateModeSelect = document.getElementById('updateMode');
    if (updateModeSelect) {
        const savedMode = localStorage.getItem('updateMode');
        if (savedMode) updateModeSelect.value = savedMode;
        updateModeSelect.addEventListener('change', () => {
            localStorage.setItem('updateMode', updateModeSelect.value);
            window.postMessage({ type: 'updateMode', value: updateModeSelect.value }, '*');
        });
    }
});

resizeBtn.addEventListener('click', resizeCanvas);

function drawPixelsOnly() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const action of history) {
        ctx.fillStyle = action.color;
        ctx.fillRect(action.x * pixelSize, action.y * pixelSize, pixelSize, pixelSize);
    }
}

function exportImage(format) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    drawPixelsOnly();
    let dataUrl = null;
    if (format === 'png') {
        dataUrl = canvas.toDataURL('image/png');
    } else if (format === 'jpg') {
        dataUrl = canvas.toDataURL('image/jpeg');
    }

    ctx.putImageData(imageData, 0, 0);
    redrawFromHistory();
    return dataUrl;
}

function undo() {
    if (history.length > 0) {
        redoStack.push(history.pop());
        redrawFromHistory();
    }
}

function redo() {
    if (redoStack.length > 0) {
        history.push(redoStack.pop());
        redrawFromHistory();
    }
}

function redrawFromHistory() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    for (const action of history) {
        ctx.fillStyle = action.color;
        ctx.fillRect(action.x * pixelSize, action.y * pixelSize, pixelSize, pixelSize);
        ctx.strokeStyle = '#eee';
        ctx.strokeRect(action.x * pixelSize, action.y * pixelSize, pixelSize, pixelSize);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    }
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
    }
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        drawPixelsOnly();
        canvas.toBlob(function(blob) {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
            }).catch(() => {
                alert('Failed to copy image to clipboard.');
            });
            redrawFromHistory();
        }, 'image/png');
    }
});

ipcRenderer.on('export-image', (event, filePath) => {
    let ext = filePath.split('.').pop().toLowerCase();
    let format = ext === 'jpg' || ext === 'jpeg' ? 'jpg' : 'png';
    let dataUrl = exportImage(format);
    ipcRenderer.send('export-image-data', { filePath, dataUrl });
});

ipcRenderer.on('export-pp', (event, filePath) => {
    const ppObj = {
        format: 'PixelPainterPP v1',
        pixels: history
    };
    const ppData = JSON.stringify(ppObj, null, 2);
    ipcRenderer.send('export-pp-data', { filePath, ppData });
});

ipcRenderer.on('import-pp-data', (event, data) => {
    try {
        const ppObj = JSON.parse(data);
        if (ppObj.format === 'PixelPainterPP v1' && Array.isArray(ppObj.pixels)) {
            history = ppObj.pixels;
            redoStack = [];
            redrawFromHistory();
        } else {
            alert('Invalid .pp file format');
        }
    } catch (e) {
        alert('Failed to load .pp file');
    }
});

resizeCanvas();
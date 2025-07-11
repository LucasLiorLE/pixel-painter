const { ipcRenderer } = require('electron');
const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
let alphaSlider = document.getElementById('alphaSlider');
let alphaValue = 1.0;
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
let isErasing = false;
let lastDrawnPos = null;

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
    if (e.button === 2) {
        isErasing = true;
        lastDrawnPos = null;
        erasePixel(e);
        return;
    }
    isDrawing = true;
    lastDrawnPos = null;
    drawPixel(e, true);
});
canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});
canvas.addEventListener('mousemove', function(e) {
    if (isDrawing) {
        drawPixel(e, false);
    } else if (isErasing) {
        erasePixel(e);
    }
});
document.addEventListener('mouseup', function(e) {
    isDrawing = false;
    isErasing = false;
    lastDrawnPos = null;
});
function erasePixel(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    if (lastDrawnPos && lastDrawnPos.x === x && lastDrawnPos.y === y) {
        return;
    }
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].x === x && history[i].y === y) {
            history.splice(i, 1);
            break;
        }
    }
    redrawFromHistory();
    lastDrawnPos = {x, y};
}

function drawPixel(e, forceDraw = false) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    if (!forceDraw && lastDrawnPos && lastDrawnPos.x === x && lastDrawnPos.y === y) {
        return;
    }
    ctx.fillStyle = hexToRgba(currentColor, alphaValue);
    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    ctx.strokeStyle = '#eee';
    ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    history.push({x, y, color: currentColor, alpha: alphaValue});
    if (history.length > 1000) history.shift();
    redoStack = [];
    updateColorHistory(currentColor);
    lastDrawnPos = {x, y};
}

function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0,2), 16);
        g = parseInt(hex.substring(2,4), 16);
        b = parseInt(hex.substring(4,6), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
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
    alphaSlider = document.getElementById('alphaSlider');
    const alphaLabel = document.getElementById('alphaLabel');
    alphaSlider.addEventListener('input', function() {
        alphaValue = parseInt(alphaSlider.value, 10) / 100;
        alphaLabel.textContent = `${alphaSlider.value}%`;
    });
    alphaValue = parseInt(alphaSlider.value, 10) / 100;
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
        ctx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
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
        ctx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
        ctx.fillRect(action.x * pixelSize, action.y * pixelSize, pixelSize, pixelSize);
        ctx.strokeStyle = '#eee';
        ctx.strokeRect(action.x * pixelSize, action.y * pixelSize, pixelSize, pixelSize);
    }
}


let undoInterval = null;
let undoHeld = false;

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (!undoHeld) {
            undo();
            undoHeld = true;
            undoInterval = setInterval(() => {
                undo();
            }, 80);
        }
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
    if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        if (navigator.clipboard && navigator.clipboard.read) {
            navigator.clipboard.read().then(items => {
                for (const item of items) {
                    for (const type of item.types) {
                        if (type.startsWith('image/')) {
                            item.getType(type).then(blob => {
                                const img = new Image();
                                img.onload = function() {
                                    const tempCanvas = document.createElement('canvas');
                                    tempCanvas.width = pixelWidth;
                                    tempCanvas.height = pixelHeight;
                                    const tempCtx = tempCanvas.getContext('2d');
                                    tempCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                    drawGrid();
                                    history = [];
                                    redoStack = [];
                                    for (let x = 0; x < pixelWidth; x++) {
                                        for (let y = 0; y < pixelHeight; y++) {
                                            const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
                                            const color = `rgb(${pixelData[0]},${pixelData[1]},${pixelData[2]})`;
                                            ctx.fillStyle = color;
                                            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                                            ctx.strokeStyle = '#eee';
                                            ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                                            history.push({x, y, color});
                                        }
                                    }
                                };
                                img.src = URL.createObjectURL(blob);
                            });
                            return;
                        }
                    }
                }
                alert('No image found in clipboard.');
            }).catch(() => {
                alert('Failed to read clipboard.');
            });
        } else {
            alert('Clipboard image paste not supported in this browser.');
        }
    }

    if (!e.ctrlKey && (e.key === '+' || e.key === '=')) {
        pixelSize = Math.min(pixelSize + 2, 64);
        canvas.width = pixelWidth * pixelSize;
        canvas.height = pixelHeight * pixelSize;
        redrawFromHistory();
    }
    if (!e.ctrlKey && (e.key === '-' || e.key === '_')) {
        pixelSize = Math.max(pixelSize - 2, 4);
        canvas.width = pixelWidth * pixelSize;
        canvas.height = pixelHeight * pixelSize;
        redrawFromHistory();
    }
});

document.addEventListener('keyup', function(e) {
    if (undoHeld && e.key === 'z') {
        undoHeld = false;
        clearInterval(undoInterval);
        undoInterval = null;
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
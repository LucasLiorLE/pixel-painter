const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
let alphaSlider = document.getElementById('alphaSlider');
let alphaValue = 1.0;
const colorHistoryDiv = document.getElementById('colorHistory');
const widthInput = document.getElementById('canvasWidth');
const heightInput = document.getElementById('canvasHeight');
const resizeBtn = document.getElementById('resizeCanvas');
const exportPNGBtn = document.getElementById('exportPNG');
const exportJPGBtn = document.getElementById('exportJPG');
const exportPPBtn = document.getElementById('exportPP');
const importPPInput = document.getElementById('importPP');
const importPPBtn = document.getElementById('importPPBtn');
const exportWidthInput = document.getElementById('exportWidth');
const exportHeightInput = document.getElementById('exportHeight');
const horizontalSymmetryBtn = document.getElementById('horizontalSymmetryBtn');
const verticalSymmetryBtn = document.getElementById('verticalSymmetryBtn');

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
let isDraggingSymmetry = false;
let horizontalSymmetryActive = false;
let verticalSymmetryActive = false;
let horizontalAxis = Math.floor(pixelHeight / 2);
let verticalAxis = Math.floor(pixelWidth / 2);

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < pixelWidth; x++) {
        for (let y = 0; y < pixelHeight; y++) {
            ctx.strokeStyle = '#eee';
            ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
    }
    drawSymmetryAxes();
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
    if (e.shiftKey) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / pixelSize);
        const y = Math.floor((e.clientY - rect.top) / pixelSize);
        if (horizontalSymmetryActive) horizontalAxis = y;
        if (verticalSymmetryActive) verticalAxis = x;
        drawGrid();
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
    if (isDrawing && !isDraggingSymmetry) {
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

    if (horizontalSymmetryActive) {
        const sy = horizontalAxis * 2 - y;
        if (sy >= 0 && sy < pixelHeight) {
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].x === x && history[i].y === sy) {
                    history.splice(i, 1);
                    break;
                }
            }
        }
    }
    if (verticalSymmetryActive) {
        const sx = verticalAxis * 2 - x;
        if (sx >= 0 && sx < pixelWidth) {
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].x === sx && history[i].y === y) {
                    history.splice(i, 1);
                    break;
                }
            }
        }
    }
    if (horizontalSymmetryActive && verticalSymmetryActive) {
        const sx = verticalAxis * 2 - x;
        const sy = horizontalAxis * 2 - y;
        if (sx >= 0 && sx < pixelWidth && sy >= 0 && sy < pixelHeight) {
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].x === sx && history[i].y === sy) {
                    history.splice(i, 1);
                    break;
                }
            }
        }
    }
    redrawFromHistory();
    lastDrawnPos = {x, y};
}

function drawSymmetryAxes() {
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    if (horizontalSymmetryActive) {
        ctx.beginPath();
        ctx.moveTo(0, horizontalAxis * pixelSize + pixelSize / 2);
        ctx.lineTo(canvas.width, horizontalAxis * pixelSize + pixelSize / 2);
        ctx.stroke();
    }
    if (verticalSymmetryActive) {
        ctx.beginPath();
        ctx.moveTo(verticalAxis * pixelSize + pixelSize / 2, 0);
        ctx.lineTo(verticalAxis * pixelSize + pixelSize / 2, canvas.height);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
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

    if (horizontalSymmetryActive) {
        const sy = horizontalAxis * 2 - y;
        if (sy >= 0 && sy < pixelHeight) {
            ctx.fillStyle = hexToRgba(currentColor, alphaValue);
            ctx.fillRect(x * pixelSize, sy * pixelSize, pixelSize, pixelSize);
            ctx.strokeRect(x * pixelSize, sy * pixelSize, pixelSize, pixelSize);
            history.push({x, y: sy, color: currentColor, alpha: alphaValue});
        }
    }
    if (verticalSymmetryActive) {
        const sx = verticalAxis * 2 - x;
        if (sx >= 0 && sx < pixelWidth) {
            ctx.fillStyle = hexToRgba(currentColor, alphaValue);
            ctx.fillRect(sx * pixelSize, y * pixelSize, pixelSize, pixelSize);
            ctx.strokeRect(sx * pixelSize, y * pixelSize, pixelSize, pixelSize);
            history.push({x: sx, y, color: currentColor, alpha: alphaValue});
        }
    }
    if (horizontalSymmetryActive && verticalSymmetryActive) {
        const sx = verticalAxis * 2 - x;
        const sy = horizontalAxis * 2 - y;
        if (sx >= 0 && sx < pixelWidth && sy >= 0 && sy < pixelHeight) {
            ctx.fillStyle = hexToRgba(currentColor, alphaValue);
            ctx.fillRect(sx * pixelSize, sy * pixelSize, pixelSize, pixelSize);
            ctx.strokeRect(sx * pixelSize, sy * pixelSize, pixelSize, pixelSize);
            history.push({x: sx, y: sy, color: currentColor, alpha: alphaValue});
        }
    }
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
            currentColor = color;
            colorPicker.value = color;
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
    let exportWidth = parseInt(exportWidthInput.value) || canvas.width;
    let exportHeight = parseInt(exportHeightInput.value) || canvas.height;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportWidth;
    tempCanvas.height = exportHeight;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.fillStyle = '#fff';
    tempCtx.fillRect(0, 0, exportWidth, exportHeight);
    for (const action of history) {
        const x = Math.round(action.x * exportWidth / pixelWidth);
        const y = Math.round(action.y * exportHeight / pixelHeight);
        const w = Math.ceil(exportWidth / pixelWidth);
        const h = Math.ceil(exportHeight / pixelHeight);
        tempCtx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
        tempCtx.fillRect(x, y, w, h);
    }
    let dataUrl = null;
    if (format === 'png') {
        dataUrl = tempCanvas.toDataURL('image/png');
    } else if (format === 'jpg') {
        dataUrl = tempCanvas.toDataURL('image/jpeg');
    }
    return dataUrl;
}

function exportPP() {
    const ppObj = {
        format: 'PixelPainterPP v1',
        pixels: history
    };
    return JSON.stringify(ppObj, null, 2);
}

function downloadFile(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

exportPNGBtn.addEventListener('click', () => {
    const dataUrl = exportImage('png');
    downloadFile(dataUrl, 'pixel-art.png');
});
exportJPGBtn.addEventListener('click', () => {
    const dataUrl = exportImage('jpg');
    downloadFile(dataUrl, 'pixel-art.jpg');
});
exportPPBtn.addEventListener('click', () => {
    const ppData = exportPP();
    const blob = new Blob([ppData], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    downloadFile(url, 'pixel-art.pp');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});
importPPBtn.addEventListener('click', () => {
    importPPInput.click();
});
importPPInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const ppObj = JSON.parse(evt.target.result);
            if (ppObj.format && ppObj.pixels) {
                history = ppObj.pixels;
                redrawFromHistory();
            } else {
                alert('Invalid .pp file');
            }
        } catch (err) {
            alert('Failed to import: ' + err.message);
        }
    };
    reader.readAsText(file);
});

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
    }
    drawSymmetryAxes();
}

horizontalSymmetryBtn.addEventListener('click', () => {
    horizontalSymmetryActive = !horizontalSymmetryActive;
    drawGrid();
});
verticalSymmetryBtn.addEventListener('click', () => {
    verticalSymmetryActive = !verticalSymmetryActive;
    drawGrid();
});

resizeCanvas();

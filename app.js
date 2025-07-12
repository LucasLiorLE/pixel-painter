window.addEventListener('DOMContentLoaded', () => {
    const exportSheetBtn = document.getElementById('exportSheetBtn');
    if (exportSheetBtn) {
        exportSheetBtn.onclick = exportSpriteSheet;
    }
});

function exportSpriteSheet() {

    const exportWidthInput = document.getElementById('exportWidth');
    const exportHeightInput = document.getElementById('exportHeight');
    let exportWidth = exportWidthInput ? parseInt(exportWidthInput.value) : pixelWidth * pixelSize;
    let exportHeight = exportHeightInput ? parseInt(exportHeightInput.value) : pixelHeight * pixelSize;

    const frameW = exportWidth;
    const frameH = exportHeight;
    const totalFrames = frames.length;
    let fps = 8;
    if (typeof playbackInput !== 'undefined' && playbackInput && playbackInput.value) {
        fps = Math.max(1, parseInt(playbackInput.value) || 8);
    }
    const cols = Math.min(fps, totalFrames);
    const rows = Math.ceil(totalFrames / cols);
    const sheetW = frameW * cols;
    const sheetH = frameH * rows;
    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = sheetW;
    sheetCanvas.height = sheetH;
    const sheetCtx = sheetCanvas.getContext('2d');
    for (let i = 0; i < totalFrames; i++) {
        const frame = frames[i];
        const x = (i % cols) * frameW;
        const y = Math.floor(i / cols) * frameH;
        for (const layer of frame.layers) {
            if (!layer.visible) continue;
            for (const action of layer.history) {
                const scaleX = exportWidth / (pixelWidth * pixelSize);
                const scaleY = exportHeight / (pixelHeight * pixelSize);
                sheetCtx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
                sheetCtx.fillRect(x + action.x * pixelSize * scaleX, y + action.y * pixelSize * scaleY, pixelSize * scaleX, pixelSize * scaleY);
            }
        }
    }
    const dataUrl = sheetCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'sprite_sheet.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
    }, 100);
}
window.addEventListener('DOMContentLoaded', () => {
    const exportFramesBtn = document.getElementById('exportFramesBtn');
    if (exportFramesBtn) {
        exportFramesBtn.onclick = exportAllFrames;
    }
});

function exportAllFrames() {

    const exportWidthInput = document.getElementById('exportWidth');
    const exportHeightInput = document.getElementById('exportHeight');
    let exportWidth = exportWidthInput ? parseInt(exportWidthInput.value) : pixelWidth * pixelSize;
    let exportHeight = exportHeightInput ? parseInt(exportHeightInput.value) : pixelHeight * pixelSize;

    const frameImages = [];
    frames.forEach((frame, idx) => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = exportWidth;
        tempCanvas.height = exportHeight;
        const tempCtx = tempCanvas.getContext('2d');
        for (const layer of frame.layers) {
            if (!layer.visible) continue;
            for (const action of layer.history) {
                const scaleX = exportWidth / (pixelWidth * pixelSize);
                const scaleY = exportHeight / (pixelHeight * pixelSize);
                tempCtx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
                tempCtx.fillRect(action.x * pixelSize * scaleX, action.y * pixelSize * scaleY, pixelSize * scaleX, pixelSize * scaleY);
            }
        }
        const dataUrl = tempCanvas.toDataURL('image/png');
        frameImages.push({
            name: `frame_${idx + 1}.png`,
            dataUrl
        });
    });

    const meta = {
        format: 'PixelPainterFrames v1',
        frameCount: frames.length,
        width,
        height,
        frames: frameImages.map(f => ({ name: f.name, dataUrl: f.dataUrl }))
    };

    const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frames_export.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

let isPlaying = false;
let playbackInterval = null;
let playbackFrameCount = 0;
let playbackInput = document.getElementById('playbackFrameCount');

window.addEventListener('DOMContentLoaded', () => {
    if (!playbackInput) {
        const label = document.createElement('label');
        label.textContent = 'Playback FPS:';
        label.htmlFor = 'playbackFrameCount';
        label.style.marginRight = '4px';
        playbackInput = document.createElement('input');
        playbackInput.type = 'number';
        playbackInput.min = 1;
        playbackInput.max = 60;
        playbackInput.value = 8;
        playbackInput.id = 'playbackFrameCount';
        playbackInput.style.margin = '8px';
        playbackInput.style.width = '60px';
        playbackInput.title = 'Playback frames per second';

        if (framesList && framesList.parentNode) {
            framesList.parentNode.insertBefore(label, framesList);
            framesList.parentNode.insertBefore(playbackInput, framesList);
        } else {
            document.body.appendChild(label);
            document.body.appendChild(playbackInput);
        }
    }
});

function startFramePlayback() {
    if (isPlaying || frames.length === 0) return;
    isPlaying = true;
    let fps = parseInt(playbackInput.value) || 8;
    let frameIdx = 0;
    currentFrameIndex = 0; 
    renderFramesPanel();
    renderLayersPanel();
    redrawFromHistory();
    playbackInterval = setInterval(() => {
        frameIdx++;
        if (frameIdx < frames.length) {
            currentFrameIndex = frameIdx;
            renderFramesPanel();
            renderLayersPanel();
            redrawFromHistory();
        } else {
            stopFramePlayback();
        }
    }, Math.round(1000 / fps));
}

function stopFramePlayback() {
    isPlaying = false;
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
}

document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && !isPlaying) {
        startFramePlayback();
    } else if (e.code === 'Space' && isPlaying) {
        stopFramePlayback();
    }
});
const layersList = document.getElementById('layersList');
const addLayerBtn = document.getElementById('addLayerBtn');
const framesList = document.getElementById('framesList');
const addFrameBtn = document.getElementById('addFrameBtn');

function renderLayersPanel() {
    if (!layersList) return;
    layersList.innerHTML = '';
    const frame = frames[currentFrameIndex];
    frame.layers.forEach((layer, idx) => {

        if (!layer.name) layer.name = `Layer ${idx + 1}`;
        const div = document.createElement('div');
        div.className = 'layer-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.marginBottom = '4px';
        div.style.background = idx === currentLayerIndex ? '#e0e0ff' : 'transparent';
        div.style.borderRadius = '4px';
        div.style.padding = '2px 4px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layer.visible;
        checkbox.style.marginRight = '4px';
        checkbox.onclick = (e) => {
            e.stopPropagation();
            layer.visible = checkbox.checked;
            redrawFromHistory();
        };

        const label = document.createElement('span');
        label.textContent = layer.name;
        label.style.flex = '1';

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 32;
        thumbCanvas.height = 32;
        thumbCanvas.style.marginLeft = '4px';
        thumbCanvas.style.border = '1px solid #ccc';
        thumbCanvas.style.background = '#fff';
        const thumbCtx = thumbCanvas.getContext('2d');

        for (const action of layer.history) {

            const tx = Math.floor(action.x * (32 / pixelWidth));
            const ty = Math.floor(action.y * (32 / pixelHeight));
            const tw = Math.ceil(32 / pixelWidth);
            const th = Math.ceil(32 / pixelHeight);
            thumbCtx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
            thumbCtx.fillRect(tx, ty, tw, th);
        }

        div.appendChild(checkbox);
        div.appendChild(label);
        div.appendChild(thumbCanvas);

        div.onclick = (e) => {
            if (e.target !== checkbox && e.target !== label && e.target !== thumbCanvas) {
                currentLayerIndex = idx;
                renderLayersPanel();
                redrawFromHistory();
            }
        };

        layersList.appendChild(div);
    });
}

if (addLayerBtn) {
    addLayerBtn.onclick = () => {
        const frame = frames[currentFrameIndex];
        const newLayer = createLayer();
        newLayer.name = `Layer ${frame.layers.length + 1}`;
        frame.layers.push(newLayer);
        currentLayerIndex = frame.layers.length - 1;
        renderLayersPanel();
        redrawFromHistory();
    };
}

function renderFramesPanel() {
    if (!framesList) return;
    framesList.innerHTML = '';
    frames.forEach((frame, idx) => {

        if (!frame.name) frame.name = `Frame ${idx + 1}`;
        const frameDiv = document.createElement('div');
        frameDiv.style.display = 'flex';
        frameDiv.style.flexDirection = 'column';
        frameDiv.style.alignItems = 'center';
        frameDiv.style.marginRight = '4px';

        const btn = document.createElement('button');
        btn.textContent = frame.name;
        btn.style.background = idx === currentFrameIndex ? '#e0ffe0' : '#fff';
        btn.style.border = '1px solid #aaa';
        btn.style.borderRadius = '4px';
        btn.style.padding = '2px 8px';
        btn.onclick = () => {
            currentFrameIndex = idx;
            currentLayerIndex = 0;
            renderFramesPanel();
            renderLayersPanel();
            redrawFromHistory();
        };

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 32;
        thumbCanvas.height = 32;
        thumbCanvas.style.marginTop = '2px';
        thumbCanvas.style.border = '1px solid #ccc';
        thumbCanvas.style.background = '#fff';
        const thumbCtx = thumbCanvas.getContext('2d');

        for (const layer of frame.layers) {
            if (!layer.visible) continue;
            for (const action of layer.history) {

                const tx = Math.floor(action.x * (32 / pixelWidth));
                const ty = Math.floor(action.y * (32 / pixelHeight));
                const tw = Math.ceil(32 / pixelWidth);
                const th = Math.ceil(32 / pixelHeight);
                thumbCtx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
                thumbCtx.fillRect(tx, ty, tw, th);
            }
        }

        frameDiv.appendChild(btn);
        frameDiv.appendChild(thumbCanvas);
        framesList.appendChild(frameDiv);
    });
}

if (addFrameBtn) {
    addFrameBtn.onclick = () => {
        frames.push(createFrame());
        currentFrameIndex = frames.length - 1;
        currentLayerIndex = 0;
        renderFramesPanel();
        renderLayersPanel();
        redrawFromHistory();
    };
}
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

document.addEventListener('keydown', function(e) {
    if (!e.ctrlKey && (e.key === 'o' || e.key === 'O')) {
        onionSkinEnabled = !onionSkinEnabled;
        redrawFromHistory();
    }

    if (e.ctrlKey && (e.key === 'o' || e.key === 'O')) {

        let handler = function(ev) {
            const num = parseInt(ev.key);
            if (!isNaN(num)) {
                onionSkinDepth = num;
                redrawFromHistory();
            }
            document.removeEventListener('keydown', handler);
        };
        document.addEventListener('keydown', handler);
    }

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
        const exportWidthInput = document.getElementById('exportWidth');
        const exportHeightInput = document.getElementById('exportHeight');
        let exportWidth = exportWidthInput ? parseInt(exportWidthInput.value) : pixelWidth * pixelSize;
        let exportHeight = exportHeightInput ? parseInt(exportHeightInput.value) : pixelHeight * pixelSize;
        if (frames.length === 1) {
            const frame = frames[0];
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = exportWidth;
            tempCanvas.height = exportHeight;
            const tempCtx = tempCanvas.getContext('2d');
            for (const layer of frame.layers) {
                for (const action of layer.history) {
                    const scaleX = exportWidth / (pixelWidth * pixelSize);
                    const scaleY = exportHeight / (pixelHeight * pixelSize);
                    tempCtx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
                    tempCtx.fillRect(action.x * pixelSize * scaleX, action.y * pixelSize * scaleY, pixelSize * scaleX, pixelSize * scaleY);
                }
            }
            tempCanvas.toBlob(function(blob) {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).then(() => {
                }).catch(() => {
                    alert('Failed to copy image to clipboard.');
                });
            }, 'image/png');
        } else if (frames.length > 1) {
            let fps = 8;
            if (typeof playbackInput !== 'undefined' && playbackInput && playbackInput.value) {
                fps = Math.max(1, parseInt(playbackInput.value) || 8);
            }
            const cols = Math.min(fps, frames.length);
            const rows = Math.ceil(frames.length / cols);
            const frameW = exportWidth;
            const frameH = exportHeight;
            const sheetW = frameW * cols;
            const sheetH = frameH * rows;
            const sheetCanvas = document.createElement('canvas');
            sheetCanvas.width = sheetW;
            sheetCanvas.height = sheetH;
            const sheetCtx = sheetCanvas.getContext('2d');
            for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                const x = (i % cols) * frameW;
                const y = Math.floor(i / cols) * frameH;
                for (const layer of frame.layers) {
                    if (!layer.visible) continue;
                    for (const action of layer.history) {
                        const scaleX = exportWidth / (pixelWidth * pixelSize);
                        const scaleY = exportHeight / (pixelHeight * pixelSize);
                        sheetCtx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
                        sheetCtx.fillRect(x + action.x * pixelSize * scaleX, y + action.y * pixelSize * scaleY, pixelSize * scaleX, pixelSize * scaleY);
                    }
                }
            }
            sheetCanvas.toBlob(function(blob) {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).then(() => {
                }).catch(() => {
                    alert('Failed to copy sprite sheet to clipboard.');
                });
            }, 'image/png');
        }
    }
    if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();

    }
    if (!e.ctrlKey && (e.key === '+' || e.key === '=')) {  }
    if (!e.ctrlKey && (e.key === '-' || e.key === '_')) {  }
});

let currentColor = '#000000';
let colorHistory = [currentColor];
const maxColorHistory = 8;

let frames = [];
let currentFrameIndex = 0;
let currentLayerIndex = 0;
let onionSkinEnabled = false;
let onionSkinDepth = 1;

function createLayer() {
    return {
        visible: true,
        name: '', 
        history: [],
        redoStack: [],
    };
}

function createFrame() {
    return {
        layers: [createLayer()],
    };
}

frames.push(createFrame());

window.addEventListener('DOMContentLoaded', () => {
    const clearLayerBtn = document.getElementById('clearLayerBtn');
    if (clearLayerBtn) {
        clearLayerBtn.onclick = clearCurrentLayer;
    }
});

function clearCurrentLayer() {
    const frame = frames[currentFrameIndex];
    const layer = frame.layers[currentLayerIndex];
    layer.history = [];
    layer.redoStack = [];
    redrawFromHistory();
    renderLayersPanel();
    renderFramesPanel();
}

let isDrawing = false;
let isErasing = false;
let lastDrawnPos = null;
let isDraggingSymmetry = false;

let horizontalSymmetryActive = false;
let verticalSymmetryActive = false;
let horizontalAxis = Math.floor(pixelHeight / 2);
let verticalAxis = Math.floor(pixelWidth / 2);
const horizontalSymmetryBtn = document.getElementById('horizontalSymmetryBtn');
const verticalSymmetryBtn = document.getElementById('verticalSymmetryBtn');

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
    redrawFromHistory();
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
        const mouseX = Math.floor((e.clientX - rect.left) / pixelSize);
        const mouseY = Math.floor((e.clientY - rect.top) / pixelSize);
        let updated = false;
        if (horizontalSymmetryActive) {
            horizontalAxis = Math.max(0, Math.min(pixelHeight - 1, mouseY));
            updated = true;
        }
        if (verticalSymmetryActive) {
            verticalAxis = Math.max(0, Math.min(pixelWidth - 1, mouseX));
            updated = true;
        }
        if (updated) {
            redrawFromHistory();
            drawSymmetryAxes();
            return;
        }
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
        const mirrorY = horizontalAxis * 2 - y;
        if (mirrorY >= 0 && mirrorY < pixelHeight && mirrorY !== y) {
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].x === x && history[i].y === mirrorY) {
                    history.splice(i, 1);
                    break;
                }
            }
        }
    }
    if (verticalSymmetryActive) {
        const mirrorX = verticalAxis * 2 - x;
        if (mirrorX >= 0 && mirrorX < pixelWidth && mirrorX !== x) {
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].x === mirrorX && history[i].y === y) {
                    history.splice(i, 1);
                    break;
                }
            }
        }
    }

    if (horizontalSymmetryActive && verticalSymmetryActive) {
        const mirrorY = horizontalAxis * 2 - y;
        const mirrorX = verticalAxis * 2 - x;
        if (mirrorY >= 0 && mirrorY < pixelHeight && mirrorY !== y && mirrorX >= 0 && mirrorX < pixelWidth && mirrorX !== x) {
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].x === mirrorX && history[i].y === mirrorY) {
                    history.splice(i, 1);
                    break;
                }
            }
        }
    }
    redrawFromHistory();
    lastDrawnPos = {x, y};
    renderLayersPanel();
    renderFramesPanel();
}

function drawSymmetryAxes() {
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    if (horizontalSymmetryActive) {
        const y = horizontalAxis * pixelSize + pixelSize / 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width - 20, y - 8);
        ctx.lineTo(canvas.width, y);
        ctx.lineTo(canvas.width - 20, y + 8);
        ctx.stroke();
    }
    if (verticalSymmetryActive) {
        const x = verticalAxis * pixelSize + pixelSize / 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 8, canvas.height - 20);
        ctx.lineTo(x, canvas.height);
        ctx.lineTo(x + 8, canvas.height - 20);
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
    const frame = frames[currentFrameIndex];
    const layer = frame.layers[currentLayerIndex];
    ctx.fillStyle = hexToRgba(currentColor, alphaValue);
    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    layer.history.push({x, y, color: currentColor, alpha: alphaValue});

    if (horizontalSymmetryActive) {
        const mirrorY = horizontalAxis * 2 - y;
        if (mirrorY >= 0 && mirrorY < pixelHeight && mirrorY !== y) {
            ctx.fillStyle = hexToRgba(currentColor, alphaValue);
            ctx.fillRect(x * pixelSize, mirrorY * pixelSize, pixelSize, pixelSize);
            layer.history.push({x, y: mirrorY, color: currentColor, alpha: alphaValue});
        }
    }
    if (verticalSymmetryActive) {
        const mirrorX = verticalAxis * 2 - x;
        if (mirrorX >= 0 && mirrorX < pixelWidth && mirrorX !== x) {
            ctx.fillStyle = hexToRgba(currentColor, alphaValue);
            ctx.fillRect(mirrorX * pixelSize, y * pixelSize, pixelSize, pixelSize);
            layer.history.push({x: mirrorX, y, color: currentColor, alpha: alphaValue});
        }
    }

    if (horizontalSymmetryActive && verticalSymmetryActive) {
        const mirrorY = horizontalAxis * 2 - y;
        const mirrorX = verticalAxis * 2 - x;
        if (mirrorY >= 0 && mirrorY < pixelHeight && mirrorY !== y && mirrorX >= 0 && mirrorX < pixelWidth && mirrorX !== x) {
            ctx.fillStyle = hexToRgba(currentColor, alphaValue);
            ctx.fillRect(mirrorX * pixelSize, mirrorY * pixelSize, pixelSize, pixelSize);
            layer.history.push({x: mirrorX, y: mirrorY, color: currentColor, alpha: alphaValue});
        }
    }
    if (layer.history.length > 1000) layer.history.shift();
    layer.redoStack = [];
    updateColorHistory(currentColor);
    lastDrawnPos = {x, y};
    renderLayersPanel();
    renderFramesPanel();
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

resizeBtn.addEventListener('click', resizeCanvasOnly);

function resizeCanvasOnly() {
    pixelWidth = parseInt(widthInput.value);
    pixelHeight = parseInt(heightInput.value);
    canvas.width = pixelWidth * pixelSize;
    canvas.height = pixelHeight * pixelSize;
    drawGrid();
    redrawFromHistory();
}

function drawPixelsOnly() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const action of history) {
        ctx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
        ctx.fillRect(action.x * pixelSize, action.y * pixelSize, pixelSize, pixelSize);
    }
}

function exportImage(format, exportWidth, exportHeight) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportWidth;
    tempCanvas.height = exportHeight;
    const tempCtx = tempCanvas.getContext('2d');

    const scaleX = exportWidth / (pixelWidth * pixelSize);
    const scaleY = exportHeight / (pixelHeight * pixelSize);
    for (const action of history) {
        const x = action.x * pixelSize * scaleX;
        const y = action.y * pixelSize * scaleY;
        const w = pixelSize * scaleX;
        const h = pixelSize * scaleY;
        tempCtx.fillStyle = action.alpha !== undefined ? hexToRgba(action.color, action.alpha) : action.color;
        tempCtx.fillRect(x, y, w, h);
        tempCtx.strokeStyle = '#eee';
        tempCtx.strokeRect(x, y, w, h);
    }
    let dataUrl = null;
    if (format === 'png') {
        dataUrl = tempCanvas.toDataURL('image/png');
    } else if (format === 'jpg') {
        dataUrl = tempCanvas.toDataURL('image/jpeg');
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

    if (onionSkinEnabled) {
        for (let i = 1; i <= onionSkinDepth; i++) {
            const prevFrameIndex = currentFrameIndex - i;
            if (prevFrameIndex >= 0) {
                const prevFrame = frames[prevFrameIndex];
                for (const layer of prevFrame.layers) {
                    if (!layer.visible) continue;
                    for (const action of layer.history) {
                        ctx.globalAlpha = 0.2; 
                        ctx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
                        ctx.fillRect(action.x * pixelSize, action.y * pixelSize, pixelSize, pixelSize);
                        ctx.globalAlpha = 1.0;
                    }
                }
            }
        }
    }

    const frame = frames[currentFrameIndex];
    for (const layer of frame.layers) {
        if (!layer.visible) continue;
        for (const action of layer.history) {
            ctx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
            ctx.fillRect(action.x * pixelSize, action.y * pixelSize, pixelSize, pixelSize);
        }
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
        const exportWidthInput = document.getElementById('exportWidth');
        const exportHeightInput = document.getElementById('exportHeight');
        let exportWidth = exportWidthInput ? parseInt(exportWidthInput.value) : pixelWidth * pixelSize;
        let exportHeight = exportHeightInput ? parseInt(exportHeightInput.value) : pixelHeight * pixelSize;
        if (frames.length === 1) {
            const frame = frames[0];
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = exportWidth;
            tempCanvas.height = exportHeight;
            const tempCtx = tempCanvas.getContext('2d');
            for (const layer of frame.layers) {
                for (const action of layer.history) {
                    const scaleX = exportWidth / (pixelWidth * pixelSize);
                    const scaleY = exportHeight / (pixelHeight * pixelSize);
                    tempCtx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
                    tempCtx.fillRect(action.x * pixelSize * scaleX, action.y * pixelSize * scaleY, pixelSize * scaleX, pixelSize * scaleY);
                }
            }
            tempCanvas.toBlob(function(blob) {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).then(() => {
                }).catch(() => {
                    alert('Failed to copy image to clipboard.');
                });
            }, 'image/png');
        } else if (frames.length > 1) {
            let fps = 8;
            if (typeof playbackInput !== 'undefined' && playbackInput && playbackInput.value) {
                fps = Math.max(1, parseInt(playbackInput.value) || 8);
            }
            const cols = Math.min(fps, frames.length);
            const rows = Math.ceil(frames.length / cols);
            const frameW = exportWidth;
            const frameH = exportHeight;
            const sheetW = frameW * cols;
            const sheetH = frameH * rows;
            const sheetCanvas = document.createElement('canvas');
            sheetCanvas.width = sheetW;
            sheetCanvas.height = sheetH;
            const sheetCtx = sheetCanvas.getContext('2d');
            for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                const x = (i % cols) * frameW;
                const y = Math.floor(i / cols) * frameH;
                for (const layer of frame.layers) {
                    if (!layer.visible) continue;
                    for (const action of layer.history) {
                        const scaleX = exportWidth / (pixelWidth * pixelSize);
                        const scaleY = exportHeight / (pixelHeight * pixelSize);
                        sheetCtx.fillStyle = hexToRgba(action.color, action.alpha !== undefined ? action.alpha : 1.0);
                        sheetCtx.fillRect(x + action.x * pixelSize * scaleX, y + action.y * pixelSize * scaleY, pixelSize * scaleX, pixelSize * scaleY);
                    }
                }
            }
            sheetCanvas.toBlob(function(blob) {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).then(() => {
                }).catch(() => {
                    alert('Failed to copy sprite sheet to clipboard.');
                });
            }, 'image/png');
        }
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

horizontalSymmetryBtn.addEventListener('click', () => {
    horizontalSymmetryActive = !horizontalSymmetryActive;
    redrawFromHistory();
    drawSymmetryAxes();
});
verticalSymmetryBtn.addEventListener('click', () => {
    verticalSymmetryActive = !verticalSymmetryActive;
    redrawFromHistory();
    drawSymmetryAxes();
});

canvas.addEventListener('mousedown', function(e) {
    if (e.button === 2) {
        isErasing = true;
        lastDrawnPos = null;
        erasePixel(e);
        return;
    }

    if (e.shiftKey) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = Math.floor((e.clientX - rect.left) / pixelSize);
        const mouseY = Math.floor((e.clientY - rect.top) / pixelSize);
        let updated = false;
        if (horizontalSymmetryActive) {
            horizontalAxis = Math.max(0, Math.min(pixelHeight - 1, mouseY));
            updated = true;
        }
        if (verticalSymmetryActive) {
            verticalAxis = Math.max(0, Math.min(pixelWidth - 1, mouseX));
            updated = true;
        }
        if (updated) {
            redrawFromHistory();
            drawSymmetryAxes();
            return;
        }
    }
    isDrawing = true;
    lastDrawnPos = null;
    drawPixel(e, true);
});

const oldDrawGrid = drawGrid;
drawGrid = function() {
    oldDrawGrid();
    drawSymmetryAxes();
};

ipcRenderer.on('export-image', (event, filePath) => {
    let ext = filePath.split('.').pop().toLowerCase();
    let format = ext === 'jpg' || ext === 'jpeg' ? 'jpg' : 'png';
    const exportWidthInput = document.getElementById('exportWidth');
    const exportHeightInput = document.getElementById('exportHeight');
    let exportWidth = exportWidthInput ? parseInt(exportWidthInput.value) : canvas.width;
    let exportHeight = exportHeightInput ? parseInt(exportHeightInput.value) : canvas.height;
    let dataUrl = exportImage(format, exportWidth, exportHeight);
    ipcRenderer.send('export-image-data', { filePath, dataUrl });
});

ipcRenderer.on('export-pp', (event, filePath) => {
    const ppObj = {
        format: 'PixelPainterPP v2',
        frames: frames.map(frame => ({
            name: frame.name || '',
            layers: frame.layers.map(layer => ({
                name: layer.name || '',
                visible: layer.visible,
                history: layer.history.slice(),
                redoStack: layer.redoStack ? layer.redoStack.slice() : []
            }))
        }))
    };
    const ppData = JSON.stringify(ppObj, null, 2);
    ipcRenderer.send('export-pp-data', { filePath, ppData });
});

ipcRenderer.on('import-pp-data', (event, data) => {
    try {
        const ppObj = JSON.parse(data);
        if (ppObj.format === 'PixelPainterPP v2' && Array.isArray(ppObj.frames)) {
            frames = ppObj.frames.map(frame => ({
                name: frame.name || '',
                layers: frame.layers.map(layer => ({
                    name: layer.name || '',
                    visible: layer.visible !== false,
                    history: Array.isArray(layer.history) ? layer.history.slice() : [],
                    redoStack: Array.isArray(layer.redoStack) ? layer.redoStack.slice() : []
                }))
            }));
            currentFrameIndex = 0;
            currentLayerIndex = 0;
            renderFramesPanel();
            renderLayersPanel();
            redrawFromHistory();
        } else if (ppObj.format === 'PixelPainterPP v1' && Array.isArray(ppObj.pixels)) {

            frames = [{
                name: '',
                layers: [{
                    name: '',
                    visible: true,
                    history: ppObj.pixels,
                    redoStack: []
                }]
            }];
            currentFrameIndex = 0;
            currentLayerIndex = 0;
            renderFramesPanel();
            renderLayersPanel();
            redrawFromHistory();
        } else {
            alert('Invalid .pp file format');
        }
    } catch (e) {
        alert('Failed to load .pp file');
    }
});

resizeCanvas();
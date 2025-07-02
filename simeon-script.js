const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let isDrawing = false;
let currentColor = '#000';
let currentBrushSize = 3;
let isRainbowMode = false;
let lastDrawPoints = null; // Store last drawing position for line drawing

// Undo functionality
let canvasHistory = [];
let maxHistoryStates = 20;

// Hexagon properties
let centerX, centerY, radius;

// High-resolution canvas scaling
let scale = 1;

// Initialize canvas
function init() {
    setupCanvas();
    drawHexagon();
    addEventListeners();
    // Reset brush slider to default position
    document.getElementById('brushSize').value = 3;
    document.getElementById('brushSizeValue').textContent = '3';
    // Save initial blank canvas state
    saveCanvasState();
}

// Setup canvas dimensions based on screen size with high-resolution support
function setupCanvas() {
    const container = document.querySelector('.container');
    const containerWidth = container.clientWidth - 40; // account for padding
    const maxSize = Math.min(containerWidth, 600);
    const displaySize = Math.max(300, maxSize); // minimum 300px
    
    // Get device pixel ratio for high-resolution displays
    const dpr = window.devicePixelRatio || 1;
    scale = dpr;
    
    // Set CSS display size
    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';
    
    // Set actual canvas resolution (higher for sharp rendering)
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    
    // Scale the context to match device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Update hexagon properties based on display size
    centerX = displaySize / 2;
    centerY = displaySize / 2;
    radius = displaySize * 0.42; // 42% of display width
    
    // Ensure crisp lines and shapes
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
}

// Draw the hexagon outline
function drawHexagon() {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.closePath();
    ctx.stroke();
}

// Add event listeners for drawing
function addEventListeners() {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Window resize event
    window.addEventListener('resize', handleResize);
    
    // Keyboard events for undo (Ctrl+Z)
    document.addEventListener('keydown', handleKeydown);
}

// Handle window resize
function handleResize() {
    // Save current drawing at high resolution
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Recalculate canvas size
    setupCanvas();
    
    // Restore drawing with proper scaling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Draw the preserved image back onto the resized canvas
    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 
                  0, 0, parseFloat(canvas.style.width), parseFloat(canvas.style.height));
    
    drawHexagon();
}

// Handle keyboard events
function handleKeydown(e) {
    // Check for Ctrl+Z (or Cmd+Z on Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault(); // Prevent browser's default undo behavior
        undoLastAction();
    }
    
    // Color cycling with D and F keys
    if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        cyclePresetColor(1); // Forward
    } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        cyclePresetColor(-1); // Backward
    }
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    // Convert to canvas coordinates (accounting for CSS vs actual canvas size)
    const x = (touch.clientX - rect.left) * (canvas.style.width ? 
        parseFloat(canvas.style.width) / rect.width : 1);
    const y = (touch.clientY - rect.top) * (canvas.style.height ? 
        parseFloat(canvas.style.height) / rect.height : 1);
    
    if (e.type === 'touchstart') {
        startDrawing({offsetX: x, offsetY: y});
    } else if (e.type === 'touchmove') {
        draw({offsetX: x, offsetY: y});
    }
}

function startDrawing(e) {
    isDrawing = true;
    lastDrawPoints = null; // Reset for new stroke
    // Save canvas state before starting to draw (for undo functionality)
    saveCanvasState();
    draw(e); // Draw initial point
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if (e.offsetX !== undefined && e.offsetY !== undefined) {
        // Mouse events - convert from browser coordinates to canvas display coordinates
        x = e.offsetX * (canvas.style.width ? 
            parseFloat(canvas.style.width) / rect.width : 1);
        y = e.offsetY * (canvas.style.height ? 
            parseFloat(canvas.style.height) / rect.height : 1);
    } else {
        // Touch events - convert from screen coordinates to canvas display coordinates
        x = (e.clientX - rect.left) * (canvas.style.width ? 
            parseFloat(canvas.style.width) / rect.width : 1);
        y = (e.clientY - rect.top) * (canvas.style.height ? 
            parseFloat(canvas.style.height) / rect.height : 1);
    }
    
    // Check if point is inside hexagon
    if (isPointInHexagon(x, y)) {
        drawSymmetricLines(x, y);
    }
}

function stopDrawing() {
    isDrawing = false;
    lastDrawPoints = null; // Reset for next stroke
}

// Check if a point is inside the hexagon using proper polygon collision detection
function isPointInHexagon(x, y) {
    // Generate hexagon vertices
    const vertices = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        vertices.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    }
    
    // Point-in-polygon algorithm (ray casting)
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x;
        const yi = vertices[i].y;
        const xj = vertices[j].x;
        const yj = vertices[j].y;
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    
    return inside;
}

// Rainbow colors array for rainbow mode
const rainbowColors = [
    '#ff0000', // Red
    '#ff4500', // Orange Red
    '#ff8000', // Orange
    '#ffff00', // Yellow
    '#80ff00', // Yellow Green
    '#00ff00', // Green
    '#00ff80', // Green Cyan
    '#00ffff', // Cyan
    '#0080ff', // Blue
    '#0000ff', // Blue
    '#4000ff', // Blue Violet
    '#8000ff', // Violet
    '#ff00ff', // Magenta
    '#ff0080'  // Pink
];

// Set rainbow mode
function setRainbowMode() {
    isRainbowMode = true;
    currentPresetIndex = -1; // Reset preset selection when activating rainbow mode
    
    // Update active color button
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.rainbow-btn').classList.add('active');
    
    // Update preset display
    updatePresetDisplay();
    
    showToast(translations[currentLanguage].rainbowActivated);
}

// Set drawing color
function setColor(color) {
    currentColor = color;
    isRainbowMode = false;
    currentPresetIndex = -1; // Reset preset selection when manually selecting color
    
    // Update active color button
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update preset display
    updatePresetDisplay();
}

// Get current drawing color (with rainbow mode support)
function getCurrentColor() {
    if (isRainbowMode) {
        // Return a random rainbow color
        return rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
    }
    return currentColor;
}

// Draw lines with 6-fold rotational symmetry
function drawSymmetricLines(x, y) {
    const currentPoints = getSymmetricPoints(x, y);
    
    // Get the color for this brush stroke
    const strokeColor = getCurrentColor();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = currentBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (lastDrawPoints) {
        // Draw lines from last position to current position for all symmetric points
        for (let i = 0; i < currentPoints.length; i++) {
            ctx.beginPath();
            ctx.moveTo(lastDrawPoints[i].x, lastDrawPoints[i].y);
            ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
            ctx.stroke();
        }
    } else {
        // First point of stroke - draw dots to start the line
        ctx.fillStyle = strokeColor;
        currentPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, currentBrushSize / 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    // Store current points for next draw call
    lastDrawPoints = currentPoints;
}

// Calculate all 6 symmetric points using rotational symmetry
function getSymmetricPoints(x, y) {
    const points = [];
    const dx = x - centerX;
    const dy = y - centerY;
    
    // Get angle and distance from center
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Generate 6 points with 60-degree rotations
    for (let i = 0; i < 6; i++) {
        const newAngle = angle + (i * Math.PI) / 3;
        const newX = centerX + distance * Math.cos(newAngle);
        const newY = centerY + distance * Math.sin(newAngle);
        points.push({x: newX, y: newY});
    }
    
    return points;
}

// Save current canvas state for undo functionality
function saveCanvasState() {
    // Save the current canvas state
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvasHistory.push(imageData);
    
    // Limit history to prevent memory issues
    if (canvasHistory.length > maxHistoryStates) {
        canvasHistory.shift(); // Remove the oldest state
    }
}

// Undo the last drawing action
function undoLastAction() {
    if (canvasHistory.length > 0) {
        // Get the previous state
        const previousState = canvasHistory.pop();
        
        // Restore the previous state
        ctx.putImageData(previousState, 0, 0);
        
        // Redraw the hexagon outline
        drawHexagon();
        
        showToast(translations[currentLanguage].undoSuccess);
    } else {
        showToast(translations[currentLanguage].nothingToUndo);
    }
}

// Clear the canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHexagon();
    
    // Clear undo history and save blank state as new starting point
    canvasHistory = [];
    saveCanvasState();
}

// Set brush size
function setBrushSize(size) {
    currentBrushSize = parseInt(size);
    document.getElementById('brushSizeValue').textContent = size;
}









// Export canvas as PNG
function exportImage() {
    // Create a high-resolution temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Export at the full high-resolution size for maximum quality
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Enable high-quality image smoothing
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    
    // Fill with white background at full resolution
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the main canvas content at full resolution
    tempCtx.drawImage(canvas, 0, 0);
    
    // Create download link with high-quality PNG
    const link = document.createElement('a');
    link.download = 'hexagon-symmetry-art.png';
    link.href = tempCanvas.toDataURL('image/png', 1.0); // Maximum quality
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show a toast to indicate the high-resolution export
    showToast('Image exported! 📸');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);

// Expanded Color Palette
const expandedColors = {
    reds: ['#ff0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc', '#cc0000', '#990000', '#660000'],
    oranges: ['#ff6600', '#ff8533', '#ffa366', '#ffc299', '#ffe0cc', '#cc5200', '#993d00', '#662900'],
    yellows: ['#ffff00', '#ffff33', '#ffff66', '#ffff99', '#ffffcc', '#cccc00', '#999900', '#666600'],
    greens: ['#00ff00', '#33ff33', '#66ff66', '#99ff99', '#ccffcc', '#00cc00', '#009900', '#006600'],
    blues: ['#0000ff', '#3333ff', '#6666ff', '#9999ff', '#ccccff', '#0000cc', '#000099', '#000066'],
    purples: ['#8000ff', '#9933ff', '#b366ff', '#cc99ff', '#e6ccff', '#6600cc', '#4d0099', '#330066'],
    pinks: ['#ff00ff', '#ff33ff', '#ff66ff', '#ff99ff', '#ffccff', '#cc00cc', '#990099', '#660066'],
    browns: ['#8b4513', '#a0522d', '#cd853f', '#daa520', '#d2691e', '#654321', '#8b4513', '#a0522d'],
    grays: ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#e0e0e0', '#f5f5f5', '#ffffff']
};

function openColorPalette() {
    const modal = document.getElementById('colorPaletteModal');
    if (!modal) {
        createColorPaletteModal();
    }
    document.getElementById('colorPaletteModal').classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeColorPalette() {
    document.getElementById('colorPaletteModal').classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

function createColorPaletteModal() {
    const modal = document.createElement('div');
    modal.id = 'colorPaletteModal';
    modal.className = 'color-palette-modal';
    
    const content = document.createElement('div');
    content.className = 'color-palette-content';
    
    // Header
    const header = document.createElement('div');
    header.className = 'color-palette-header';
    
    const title = document.createElement('h3');
    title.className = 'color-palette-title';
    title.textContent = 'Choose a Colour';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-palette-btn';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = closeColorPalette;
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    content.appendChild(header);
    
    // Create color sections
    Object.entries(expandedColors).forEach(([sectionName, colors]) => {
        const section = document.createElement('div');
        section.className = 'color-section';
        
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'color-section-title';
        sectionTitle.textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
        section.appendChild(sectionTitle);
        
        const grid = document.createElement('div');
        grid.className = 'color-grid';
        
        colors.forEach(color => {
            const colorBtn = document.createElement('div');
            colorBtn.className = 'color-grid-item';
            colorBtn.style.backgroundColor = color;
            colorBtn.onclick = () => selectPaletteColor(color);
            colorBtn.title = color;
            grid.appendChild(colorBtn);
        });
        
        section.appendChild(grid);
        content.appendChild(section);
    });
    
    // Custom color section
    const customSection = document.createElement('div');
    customSection.className = 'color-section';
    
    const customTitle = document.createElement('div');
    customTitle.className = 'color-section-title';
    customTitle.textContent = 'Custom Color';
    customSection.appendChild(customTitle);
    
    const customColorDiv = document.createElement('div');
    customColorDiv.className = 'custom-color-section';
    
    const customLabel = document.createElement('label');
    customLabel.className = 'custom-color-label';
    customLabel.textContent = 'Pick any color:';
    
    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.className = 'custom-color-input';
    customInput.value = currentColor;
    customInput.onchange = (e) => selectPaletteColor(e.target.value);
    
    customColorDiv.appendChild(customLabel);
    customColorDiv.appendChild(customInput);
    customSection.appendChild(customColorDiv);
    content.appendChild(customSection);
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeColorPalette();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeColorPalette();
        }
    });
}

function selectPaletteColor(color) {
    currentColor = color;
    isRainbowMode = false;
    
    // Update active color button in main palette (if it exists)
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.style.backgroundColor === color || 
            btn.style.background === color ||
            rgbToHex(btn.style.backgroundColor) === color) {
            btn.classList.add('active');
        }
    });
    
    // If the color isn't in the main palette, highlight the palette button
    const mainColors = ['#000', '#ff6b6b', '#4ecdc4', '#45d168', '#f9ca24', '#6c5ce7', '#a55eea'];
    if (!mainColors.includes(color)) {
        document.querySelector('.palette-btn')?.classList.add('active');
    }
    
    closeColorPalette();
}

// Helper function to convert RGB to HEX
function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent') return '#000000';
    
    // Check if it's already a hex color
    if (rgb.startsWith('#')) return rgb;
    
    // Extract RGB values
    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return '#000000';
    
    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);
    
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// History and Save functionality
let savedDesigns = [];
const STORAGE_KEY = 'hexagon-saved-designs';

// Load saved designs from localStorage
function loadSavedDesigns() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        savedDesigns = saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading saved designs:', error);
        savedDesigns = [];
    }
    updateHistoryPanel();
}

// Save current canvas design
function saveDesign() {
    try {
        // Create a high-resolution thumbnail
        const thumbnailCanvas = document.createElement('canvas');
        const thumbnailCtx = thumbnailCanvas.getContext('2d');
        const thumbnailSize = 200 * (window.devicePixelRatio || 1); // High-res thumbnail
        
        thumbnailCanvas.width = thumbnailSize;
        thumbnailCanvas.height = thumbnailSize;
        
        // Enable high-quality scaling for thumbnail
        thumbnailCtx.imageSmoothingEnabled = true;
        thumbnailCtx.imageSmoothingQuality = 'high';
        
        // Fill with white background
        thumbnailCtx.fillStyle = '#ffffff';
        thumbnailCtx.fillRect(0, 0, thumbnailSize, thumbnailSize);
        
        // Draw the main canvas scaled down at high resolution
        thumbnailCtx.drawImage(canvas, 0, 0, thumbnailSize, thumbnailSize);
        
        // Create full-size canvas with white background (already high-res)
        const fullCanvas = document.createElement('canvas');
        const fullCtx = fullCanvas.getContext('2d');
        fullCanvas.width = canvas.width;
        fullCanvas.height = canvas.height;
        
        // Enable high-quality settings
        fullCtx.imageSmoothingEnabled = true;
        fullCtx.imageSmoothingQuality = 'high';
        
        // Fill with white background
        fullCtx.fillStyle = '#ffffff';
        fullCtx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
        
        // Draw main canvas content at full resolution
        fullCtx.drawImage(canvas, 0, 0);
        
        // Save the design
        const locale = currentLanguage === 'de' ? 'de-DE' : 'en-GB';
        const design = {
            id: Date.now(),
            date: new Date().toLocaleString(locale, {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            thumbnail: thumbnailCanvas.toDataURL('image/png', 0.9), // Slightly compressed for storage
            canvasData: fullCanvas.toDataURL('image/png', 1.0), // Full quality
            timestamp: Date.now()
        };
        
        savedDesigns.unshift(design); // Add to beginning
        
        // Limit to 20 saved designs
        if (savedDesigns.length > 20) {
            savedDesigns = savedDesigns.slice(0, 20);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDesigns));
        updateHistoryPanel();
        
        // Show success feedback
        showToast(translations[currentLanguage].designSaved);
        
    } catch (error) {
        console.error('Error saving design:', error);
        showToast(translations[currentLanguage].errorSaving);
    }
}

// Toggle history panel
function toggleHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    const overlay = document.getElementById('historyOverlay');
    
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    } else {
        panel.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        loadSavedDesigns(); // Refresh the panel when opening
    }
}

// Update the history panel display
function updateHistoryPanel() {
    const grid = document.getElementById('historyGrid');
    
    if (savedDesigns.length === 0) {
        grid.innerHTML = `
            <div class="history-empty">
                <p data-translate="noDesigns">${translations[currentLanguage].noDesigns}</p>
                <span data-translate="createFirst">${translations[currentLanguage].createFirst}</span>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = savedDesigns.map(design => `
        <div class="history-item" onclick="loadDesign(${design.id})">
            <img src="${design.thumbnail}" alt="Saved design" class="history-thumbnail">
            <div class="history-info">
                <div class="history-date">${design.date}</div>
            </div>
            <button class="history-delete" onclick="event.stopPropagation(); deleteDesign(${design.id})" title="Delete design">×</button>
        </div>
    `).join('');
}

// Load a saved design onto the canvas
function loadDesign(designId) {
    try {
        const design = savedDesigns.find(d => d.id === designId);
        if (!design) {
            showToast(translations[currentLanguage].designNotFound);
            return;
        }
        
        const img = new Image();
        img.onload = function() {
            // Clear canvas completely
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the saved design at the correct scale
            // The saved image might be at a different resolution, so scale appropriately
            ctx.drawImage(img, 0, 0, img.width, img.height, 
                         0, 0, parseFloat(canvas.style.width) || canvas.width, 
                         parseFloat(canvas.style.height) || canvas.height);
            
            // Redraw hexagon outline on top
            drawHexagon();
            
            // Clear undo history and save this as new starting point
            canvasHistory = [];
            saveCanvasState();
            
            showToast(translations[currentLanguage].designLoaded);
            toggleHistoryPanel(); // Close the panel
        };
        
        img.onerror = function() {
            showToast(translations[currentLanguage].errorLoading);
        };
        
        img.src = design.canvasData;
        
    } catch (error) {
        console.error('Error loading design:', error);
        showToast(translations[currentLanguage].errorLoading);
    }
}

// Delete a saved design
function deleteDesign(designId) {
    try {
        savedDesigns = savedDesigns.filter(d => d.id !== designId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDesigns));
        updateHistoryPanel();
        showToast(translations[currentLanguage].designDeleted);
    } catch (error) {
        console.error('Error deleting design:', error);
        showToast(translations[currentLanguage].errorDeleting);
    }
}

// Show toast notification
function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Style the toast
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '24px';
    toast.style.zIndex = '10000';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '500';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Color cycling functionality
let presetColors = ['', '', '', '', '']; // 5 preset slots
let currentPresetIndex = -1; // -1 means no preset is currently active
let selectedPresetSlot = -1; // Which slot is currently selected for setting

// Select a preset slot to set its color
function selectPresetSlot(slotIndex) {
    // If slot is empty, set it to current color
    if (presetColors[slotIndex] === '') {
        if (currentColor !== '#000' || !isRainbowMode) {
            presetColors[slotIndex] = isRainbowMode ? '#ff0000' : currentColor;
            updatePresetDisplay();
            showToast(translations[currentLanguage].presetColorSet + ' ' + (slotIndex + 1));
        } else {
            showToast(translations[currentLanguage].selectColorFirst);
        }
    } else {
        // If slot has a color, activate it
        currentColor = presetColors[slotIndex];
        isRainbowMode = false;
        currentPresetIndex = slotIndex;
        updatePresetDisplay();
        updateColorButtons();
        showToast(translations[currentLanguage].presetActivated + ' ' + (slotIndex + 1));
    }
}

// Cycle through preset colors with D/F keys
function cyclePresetColor(direction) {
    // Get available preset colors (non-empty slots)
    const availablePresets = [];
    presetColors.forEach((color, index) => {
        if (color !== '') {
            availablePresets.push({ color, index });
        }
    });
    
    if (availablePresets.length === 0) {
        showToast(translations[currentLanguage].noPresetsSet);
        return;
    }
    
    // Find current position in available presets
    let currentPos = -1;
    if (currentPresetIndex !== -1) {
        currentPos = availablePresets.findIndex(preset => preset.index === currentPresetIndex);
    }
    
    // Calculate next position
    let nextPos;
    if (currentPos === -1) {
        // No preset currently active, start from first or last
        nextPos = direction > 0 ? 0 : availablePresets.length - 1;
    } else {
        nextPos = (currentPos + direction + availablePresets.length) % availablePresets.length;
    }
    
    // Activate the preset
    const selectedPreset = availablePresets[nextPos];
    currentColor = selectedPreset.color;
    isRainbowMode = false;
    currentPresetIndex = selectedPreset.index;
    
    updatePresetDisplay();
    updateColorButtons();
    showToast(translations[currentLanguage].cycledToPreset + ' ' + (selectedPreset.index + 1));
}

// Update the visual display of preset colors and current selection
function updatePresetDisplay() {
    for (let i = 0; i < 5; i++) {
        const slot = document.querySelector(`[data-slot="${i}"]`);
        const colorDiv = slot.querySelector('.preset-color');
        
        if (presetColors[i] === '') {
            colorDiv.style.backgroundColor = '';
            colorDiv.classList.add('empty');
            colorDiv.textContent = translations[currentLanguage].clickToSet;
        } else {
            colorDiv.style.backgroundColor = presetColors[i];
            colorDiv.classList.remove('empty');
            colorDiv.textContent = '';
        }
        
        // Update active state
        if (i === currentPresetIndex) {
            slot.classList.add('active');
        } else {
            slot.classList.remove('active');
        }
    }
    
    // Update current preset display
    const currentDisplay = document.getElementById('currentPresetDisplay');
    if (currentPresetIndex !== -1) {
        currentDisplay.textContent = `Preset ${currentPresetIndex + 1}`;
        currentDisplay.style.backgroundColor = presetColors[currentPresetIndex];
        currentDisplay.style.color = getContrastColor(presetColors[currentPresetIndex]);
    } else {
        currentDisplay.textContent = translations[currentLanguage].none;
        currentDisplay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        currentDisplay.style.color = '#666';
    }
}

// Update color buttons to reflect current selection
function updateColorButtons() {
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (!isRainbowMode) {
        // Find matching color button
        const matchingBtn = Array.from(document.querySelectorAll('.color-btn')).find(btn => {
            const btnColor = btn.style.backgroundColor || btn.style.background;
            return rgbToHex(btnColor) === currentColor || btnColor === currentColor;
        });
        
        if (matchingBtn) {
            matchingBtn.classList.add('active');
        }
    }
}

// Clear all preset colors
function clearAllPresets() {
    presetColors = ['', '', '', '', ''];
    currentPresetIndex = -1;
    updatePresetDisplay();
    showToast(translations[currentLanguage].presetsCleared);
}

// Get contrasting text color for a background color
function getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Language functionality
let currentLanguage = 'en';

const translations = {
    en: {
        title: "Symmetry Drawing",
        subtitle1: "For Simeon (Herr Vogt)",
        subtitle2: "Hexagons are the bestagons.",
        subtitle3: "More shapes and symmetry coming soon...",
        instructions: "How to use: Click and drag to draw on the hexagon. Touch and drag on mobile. Enjoy ;)",
        clearBtn: "Clear Canvas",
        undoBtn: "Undo",
        exportBtn: "Export PNG",
        saveBtn: "Save Design",
        historyBtn: "History",
        colorsLabel: "Colours:",
        brushSizeLabel: "Brush Size:",
        savedDesigns: "Saved Designs",
        noDesigns: "No saved designs yet",
        createFirst: "Create and save your first design!",
        bestagonsTitle: "Bestagons",
        bestagonsSubtitle: "A collection of the best hexagons",
        developedBy: "Developed by",
        githubLink: "Click here to view the code on GitHub :)",
        // Toast messages
        rainbowActivated: "Rainbow mode activated! 🌈",
        designSaved: "Design saved! ✨",
        designLoaded: "Design loaded! ✨",
        designDeleted: "Design deleted",
        designNotFound: "Design not found",
        errorLoading: "Error loading design",
        errorDeleting: "Error deleting design",
        errorSaving: "Error saving design",
        undoSuccess: "Undo successful! ↶",
        nothingToUndo: "Nothing to undo",
        // Colour cycling
        colorCyclingLabel: "Colour Cycling:",
        cyclingInstructions: "Press D/F to cycle through your preset colours",
        clickToSet: "Click to set",
        clearPresets: "Clear All",
        currentColor: "Current: ",
        none: "None",
        presetColorSet: "Preset colour set for slot",
        selectColorFirst: "Select a colour first",
        presetActivated: "Preset activated:",
        noPresetsSet: "No preset colours set",
        cycledToPreset: "Cycled to preset",
        presetsCleared: "All presets cleared"
    },
    de: {
        title: "Symmetrie-Zeichnung",
        subtitle1: "Für Simeon (Herr Vogt)",
        subtitle2: "Hexagons sind die Bestagons.",
        subtitle3: "Weitere Formen und Symmetrien kommen bald...",
        instructions: "Anleitung: Klicken und ziehen, um auf das Sechseck zu zeichnen. Auf Mobilgeräten berühren und ziehen. Viel Spass ;)",
        clearBtn: "Leinwand Löschen",
        undoBtn: "Rückgängig",
        exportBtn: "PNG Exportieren",
        saveBtn: "Design Speichern",
        historyBtn: "Verlauf",
        colorsLabel: "Farben:",
        brushSizeLabel: "Pinselgrösse:",
        savedDesigns: "Gespeicherte Designs",
        noDesigns: "Noch keine Designs gespeichert",
        createFirst: "Erstelle und speichere dein erstes Design!",
        bestagonsTitle: "Bestagons",
        bestagonsSubtitle: "Eine Sammlung der besten Hexagone",
        developedBy: "Entwickelt von",
        githubLink: "Hier klicken, um den Code auf GitHub anzusehen :)",
        // Toast messages
        rainbowActivated: "Regenbogen-Modus aktiviert! 🌈",
        designSaved: "Design gespeichert! ✨",
        designLoaded: "Design geladen! ✨",
        designDeleted: "Design gelöscht",
        designNotFound: "Design nicht gefunden",
        errorLoading: "Fehler beim Laden des Designs",
        errorDeleting: "Fehler beim Löschen des Designs",
        errorSaving: "Fehler beim Speichern des Designs",
        undoSuccess: "Rückgängig erfolgreich! ↶",
        nothingToUndo: "Nichts rückgängig zu machen",
        // Color cycling
        colorCyclingLabel: "Farb-Cycling:",
        cyclingInstructions: "Drücke D/F um durch deine voreingestellten Farben zu wechseln",
        clickToSet: "Klicken zum Setzen",
        clearPresets: "Alle Löschen",
        currentColor: "Aktuell: ",
        none: "Keine",
        presetColorSet: "Voreinstellung gesetzt für Slot",
        selectColorFirst: "Wähle zuerst eine Farbe",
        presetActivated: "Voreinstellung aktiviert:",
        noPresetsSet: "Keine Farbvoreinstellungen gesetzt",
        cycledToPreset: "Gewechselt zu Voreinstellung",
        presetsCleared: "Alle Voreinstellungen gelöscht"
    }
};

function toggleLanguage() {
    // Switch to the opposite language
    const newLanguage = currentLanguage === 'en' ? 'de' : 'en';
    switchLanguage(newLanguage);
}

function switchLanguage(lang) {
    currentLanguage = lang;
    
    // Update toggle button text
    updateLanguageToggleButton();
    
    // Update all translatable elements
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    // Update history panel if it's open
    updateHistoryPanel();
    
    // Save language preference
    localStorage.setItem('selectedLanguage', lang);
    
    // Update page title and meta description
    updatePageMeta();
}

function updateLanguageToggleButton() {
    const toggleBtn = document.getElementById('langToggleBtn');
    const currentSpan = toggleBtn.querySelector('.lang-current');
    const nextSpan = toggleBtn.querySelector('.lang-next');
    
    if (currentLanguage === 'en') {
        currentSpan.textContent = 'English';
        nextSpan.textContent = 'Deutsch';
    } else {
        currentSpan.textContent = 'Deutsch';
        nextSpan.textContent = 'English';
    }
}

function updatePageMeta() {
    const title = currentLanguage === 'en' 
        ? "Symmetry Drawing | Hexagons are the bestagons"
        : "Symmetrie-Zeichnung | Hexagons are the bestagons";
    
    const description = currentLanguage === 'en'
        ? "Symmetry Drawing | Hexagons are the bestagons"
        : "Symmetrie-Zeichnung | Hexagons are the bestagons";
    
    document.title = title;
    document.querySelector('meta[name="description"]').setAttribute('content', description);
    document.querySelector('meta[property="og:title"]').setAttribute('content', translations[currentLanguage].title);
    document.querySelector('meta[property="og:description"]').setAttribute('content', translations[currentLanguage].subtitle2);
}

function initializeLanguage() {
    // Load saved language preference or default to English
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'en';
    switchLanguage(savedLanguage);
}

// Slideshow functionality
let currentSlideIndex = 0;
let totalSlides = 0;
let availableImages = [];

function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const indicators = document.querySelectorAll('.indicator');
    
    // Hide all slides
    slides.forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Remove active from all indicators
    indicators.forEach(indicator => {
        indicator.classList.remove('active');
    });
    
    // Ensure index is within bounds
    if (index >= totalSlides) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = totalSlides - 1;
    } else {
        currentSlideIndex = index;
    }
    
    // Show current slide and activate indicator
    if (slides[currentSlideIndex]) {
        slides[currentSlideIndex].classList.add('active');
    }
    if (indicators[currentSlideIndex]) {
        indicators[currentSlideIndex].classList.add('active');
    }
}

function changeSlide(direction) {
    showSlide(currentSlideIndex + direction);
}

function currentSlide(index) {
    showSlide(index - 1); // Convert to 0-based index
}

// Dynamically discover available bestagon images
function discoverBestagonImages() {
    return new Promise((resolve) => {
        const images = [];
        let imageIndex = 1;
        
        function checkNextImage() {
            const img = new Image();
            const imagePath = `best_hexagons/${imageIndex}.jpg`;
            
            img.onload = function() {
                images.push({
                    path: imagePath,
                    index: imageIndex,
                    alt: `Bestagon ${imageIndex}`
                });
                imageIndex++;
                checkNextImage();
            };
            
            img.onerror = function() {
                // No more images found, resolve with what we have
                resolve(images);
            };
            
            img.src = imagePath;
        }
        
        checkNextImage();
    });
}

// Initialize the dynamic slideshow
async function initializeBestagonSlideshow() {
    try {
        availableImages = await discoverBestagonImages();
        totalSlides = availableImages.length;
        
        if (totalSlides === 0) {
            console.warn('No bestagon images found');
            return;
        }
        
        // Create slides dynamically
        createSlideshowElements();
        
        // Start the slideshow
        showSlide(0);
        startSlideshow();
        
    } catch (error) {
        console.error('Error initializing bestagon slideshow:', error);
    }
}

// Create slideshow HTML elements dynamically
function createSlideshowElements() {
    const slideshowWrapper = document.querySelector('.slideshow-wrapper');
    const slideIndicators = document.querySelector('.slide-indicators');
    
    if (!slideshowWrapper || !slideIndicators) {
        console.warn('Slideshow elements not found');
        return;
    }
    
    // Clear existing slides and indicators
    slideshowWrapper.innerHTML = '';
    slideIndicators.innerHTML = '';
    
    // Create slides
    availableImages.forEach((imageData, index) => {
        const slide = document.createElement('div');
        slide.className = index === 0 ? 'slide active' : 'slide';
        
        const img = document.createElement('img');
        img.src = imageData.path;
        img.alt = imageData.alt;
        img.className = 'slide-image';
        
        slide.appendChild(img);
        slideshowWrapper.appendChild(slide);
    });
    
    // Create indicators
    availableImages.forEach((_, index) => {
        const indicator = document.createElement('span');
        indicator.className = index === 0 ? 'indicator active' : 'indicator';
        indicator.onclick = () => currentSlide(index + 1);
        slideIndicators.appendChild(indicator);
    });
}

// Auto-advance slideshow every 7 seconds (slower than before)
function startSlideshow() {
    if (totalSlides <= 1) return; // Don't auto-advance if only one or no images
    
    setInterval(() => {
        changeSlide(1);
    }, 7000); // Increased from 5000ms to 7000ms
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    init();
    loadSavedDesigns();
    initializeLanguage(); // Initialize language settings
    updatePresetDisplay(); // Initialize preset display
    initializeBestagonSlideshow(); // Initialize dynamic slideshow
});

// Also initialize on window load as fallback
window.addEventListener('load', function() {
    init();
});

// Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} 
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let isDrawing = false;
let currentColor = '#000';
let currentBrushSize = 3;
let isRainbowMode = false;

// Hexagon properties
let centerX, centerY, radius;

// Initialize canvas
function init() {
    setupCanvas();
    drawHexagon();
    addEventListeners();
    // Reset brush slider to default position
    document.getElementById('brushSize').value = 3;
    document.getElementById('brushSizeValue').textContent = '3';
}

// Setup canvas dimensions based on screen size
function setupCanvas() {
    const container = document.querySelector('.container');
    const containerWidth = container.clientWidth - 40; // account for padding
    const maxSize = Math.min(containerWidth, 600);
    const canvasSize = Math.max(300, maxSize); // minimum 300px
    
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    // Update hexagon properties based on canvas size
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    radius = canvas.width * 0.42; // 42% of canvas width
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
    
    // Draw symmetry lines
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // Draw the 3 symmetry axes
    for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + radius * Math.cos(angle),
            centerY + radius * Math.sin(angle)
        );
        ctx.stroke();
    }
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
}

// Handle window resize
function handleResize() {
    // Save current drawing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Recalculate canvas size
    setupCanvas();
    
    // Restore drawing (this might not be perfect but provides some continuity)
    ctx.putImageData(imageData, 0, 0);
    drawHexagon();
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    
    if (e.type === 'touchstart') {
        startDrawing({offsetX: x, offsetY: y});
    } else if (e.type === 'touchmove') {
        draw({offsetX: x, offsetY: y});
    }
}

function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x, y;
    if (e.offsetX !== undefined && e.offsetY !== undefined) {
        x = e.offsetX * scaleX;
        y = e.offsetY * scaleY;
    } else {
        x = (e.clientX - rect.left) * scaleX;
        y = (e.clientY - rect.top) * scaleY;
    }
    
    // Check if point is inside hexagon
    if (isPointInHexagon(x, y)) {
        drawSymmetricPoints(x, y);
    }
}

function stopDrawing() {
    isDrawing = false;
}

// Check if a point is inside the hexagon (simplified)
function isPointInHexagon(x, y) {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Simple circular boundary check (slightly smaller than actual hexagon)
    return distance <= radius * 0.9;
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
    
    // Update active color button
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.rainbow-btn').classList.add('active');
    
    showToast('Rainbow mode activated! 🌈');
}

// Set drawing color
function setColor(color) {
    currentColor = color;
    isRainbowMode = false;
    
    // Update active color button
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Get current drawing color (with rainbow mode support)
function getCurrentColor() {
    if (isRainbowMode) {
        // Return a random rainbow color
        return rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
    }
    return currentColor;
}

// Draw points with 6-fold rotational symmetry
function drawSymmetricPoints(x, y) {
    const points = getSymmetricPoints(x, y);
    
    // Get the color for this brush stroke (same color for all symmetric points)
    const strokeColor = getCurrentColor();
    ctx.fillStyle = strokeColor;
    
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, currentBrushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    });
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

// Clear the canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHexagon();
}

// Set brush size
function setBrushSize(size) {
    currentBrushSize = parseInt(size);
    document.getElementById('brushSizeValue').textContent = size;
}

// Export canvas as PNG
function exportImage() {
    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the main canvas content on top
    tempCtx.drawImage(canvas, 0, 0);
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'hexagon-symmetry-art.png';
    link.href = tempCanvas.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        // Create a thumbnail
        const thumbnailCanvas = document.createElement('canvas');
        const thumbnailCtx = thumbnailCanvas.getContext('2d');
        const thumbnailSize = 200;
        
        thumbnailCanvas.width = thumbnailSize;
        thumbnailCanvas.height = thumbnailSize;
        
        // Fill with white background
        thumbnailCtx.fillStyle = '#ffffff';
        thumbnailCtx.fillRect(0, 0, thumbnailSize, thumbnailSize);
        
        // Draw the main canvas scaled down
        thumbnailCtx.drawImage(canvas, 0, 0, thumbnailSize, thumbnailSize);
        
        // Save the design
        const design = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            thumbnail: thumbnailCanvas.toDataURL('image/png'),
            canvasData: canvas.toDataURL('image/png'),
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
        showToast('Design saved successfully!');
        
    } catch (error) {
        console.error('Error saving design:', error);
        showToast('Error saving design');
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
                <p>No saved designs yet</p>
                <span>Create and save your first design!</span>
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
            showToast('Design not found');
            return;
        }
        
        const img = new Image();
        img.onload = function() {
            // Clear canvas and redraw hexagon
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the saved design
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Redraw hexagon outline on top
            drawHexagon();
            
            showToast('Design loaded!');
            toggleHistoryPanel(); // Close the panel
        };
        
        img.onerror = function() {
            showToast('Error loading design');
        };
        
        img.src = design.canvasData;
        
    } catch (error) {
        console.error('Error loading design:', error);
        showToast('Error loading design');
    }
}

// Delete a saved design
function deleteDesign(designId) {
    try {
        savedDesigns = savedDesigns.filter(d => d.id !== designId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDesigns));
        updateHistoryPanel();
        showToast('Design deleted');
    } catch (error) {
        console.error('Error deleting design:', error);
        showToast('Error deleting design');
    }
}

// Show toast notification
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: toastSlide 3s ease forwards;
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// CSS animation for toast (injected dynamically)
if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes toastSlide {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            10%, 90% {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize saved designs when page loads
document.addEventListener('DOMContentLoaded', function() {
    init();
    loadSavedDesigns();
}); 
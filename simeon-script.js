const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let isDrawing = false;
let currentColor = '#000';
let currentBrushSize = 3;
let isRainbowMode = false;

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
    draw(e);
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
    showToast('High-resolution image exported! 📸');
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
        const design = {
            id: Date.now(),
            date: new Date().toLocaleString(),
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
        showToast('High-resolution design saved! 💾');
        
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
            // Clear canvas completely
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the saved design at the correct scale
            // The saved image might be at a different resolution, so scale appropriately
            ctx.drawImage(img, 0, 0, img.width, img.height, 
                         0, 0, parseFloat(canvas.style.width) || canvas.width, 
                         parseFloat(canvas.style.height) || canvas.height);
            
            // Redraw hexagon outline on top
            drawHexagon();
            
            showToast('High-resolution design loaded! ✨');
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

// Birthday Animation Functions
function createConfetti() {
    const confettiContainer = document.querySelector('.confetti-container');
    const colors = ['#ff6b6b', '#4ecdc4', '#45d168', '#f9ca24', '#6c5ce7', '#a55eea', '#fd79a8', '#00b894'];
    
    // Create 50 confetti pieces
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 3 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confettiContainer.appendChild(confetti);
    }
    
    // Clean up confetti after animation
    setTimeout(() => {
        confettiContainer.innerHTML = '';
    }, 5000);
}

function startBirthdayAnimation() {
    const birthdayAnimation = document.getElementById('birthdayAnimation');
    
    // Show the animation
    birthdayAnimation.style.display = 'block';
    
    // Create confetti
    createConfetti();
    
    // Hide the animation after 8 seconds
    setTimeout(() => {
        birthdayAnimation.style.display = 'none';
    }, 8000);
}

// Check if birthday animation should be shown (only once per session)
function checkBirthdayAnimation() {
    const hasSeenBirthday = sessionStorage.getItem('hasSeenBirthdayAnimation');
    
    if (!hasSeenBirthday) {
        // Wait 1 second after page load to show the animation
        setTimeout(() => {
            startBirthdayAnimation();
            sessionStorage.setItem('hasSeenBirthdayAnimation', 'true');
        }, 1000);
    }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    init();
    loadSavedDesigns();
    checkBirthdayAnimation();
});

// Also initialize on window load as fallback
window.addEventListener('load', function() {
    init();
    // Don't run birthday animation again if it was already shown
    if (!sessionStorage.getItem('hasSeenBirthdayAnimation')) {
        setTimeout(() => {
            startBirthdayAnimation();
            sessionStorage.setItem('hasSeenBirthdayAnimation', 'true');
        }, 1000);
    }
});

// Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} 
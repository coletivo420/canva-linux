'use strict';

const { ipcRenderer } = require('electron');

// @ltcode/eyedropper
// Color picker library for selecting pixel color from images/canvas on the web

/**
 * EyeDropper - Color picker library for selecting pixel color from images/canvas on the web
 *
 * Manual usage (with canvas):
 *   const eyedropper = new EyeDropper();
 *   eyedropper.open(canvas).then(color => console.log(color.hex));
 *
 * Automated usage (with image URL):
 *   const eyedropper = new EyeDropper();
 *   eyedropper.openFromImageUrl('image.jpg').then(color => console.log(color.hex));
 *
 * ReactJS usage example:
 *   import EyeDropper from '@ltcode/eyedropper';
 *   const ref = useRef();
 *   const pickColor = async () => {
 *     const eyedropper = new EyeDropper();
 *     const color = await eyedropper.open(ref.current);
 *     // color.hex, color.rgb
 *   };
 *   <canvas ref={ref} ... />
 *
 * Note: Only call .open() in browser/client-side code (not SSR).
 */
class EyeDropper {
  /**
   * Utility to draw an <img> element onto a <canvas> (for React usage)
   * @param {HTMLImageElement} img - The image element
   * @param {HTMLCanvasElement} canvas - The canvas element
   * @param {Object} [options] - { cover: boolean } (if true, image will cover canvas, else fit)
   */
  static drawImageToCanvas(img, canvas, options = {}) {
    if (!img || !canvas || !img.naturalWidth || !img.naturalHeight) return;
    
    const ctx = canvas.getContext('2d');
    const { width: canvasW, height: canvasH } = canvas;
    const { naturalWidth: imgW, naturalHeight: imgH } = img;
    
    ctx.clearRect(0, 0, canvasW, canvasH);
    
    let dx, dy, dw, dh;
    
    if (options.cover) {
      // Cover logic (center crop) - optimized calculations
      const ratio = Math.max(canvasW / imgW, canvasH / imgH);
      dw = imgW * ratio;
      dh = imgH * ratio;
      dx = (canvasW - dw) * 0.5; // Faster than division by 2
      dy = (canvasH - dh) * 0.5;
    } else {
      // Fit logic - optimized calculations
      const ratio = Math.min(canvasW / imgW, canvasH / imgH);
      dw = imgW * ratio;
      dh = imgH * ratio;
      dx = (canvasW - dw) * 0.5;
      dy = (canvasH - dh) * 0.5;
    }
    
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  /**
   * @param {Object} options - Global customization options (can be overridden in open)
   * @param {Object} [options.magnifier] - Magnifier customization (size, border, color, etc)
   * @param {Object} [options.preview] - Preview customization (style, HTML, etc)
   * @param {Object} [options.overlay] - Overlay customization (color, opacity, etc)
   * @param {Function} [options.renderPreview] - Custom function to render the preview
   * @param {Function} [options.onMove] - Callback on mouse move
   * @param {Function} [options.onPick] - Callback on color pick
   */
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Opens the color picker over an existing canvas.
   * @param {HTMLCanvasElement|CanvasRenderingContext2D} canvasOrContext - Canvas or 2D context for color picking
   * @param {Object} [options] - Options to override those from the constructor
   * @returns {Promise<{hex: string, rgb: [number, number, number]}>}
   */
  open(canvasOrContext, options = {}) {
    // Ensure running in browser (not SSR)
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('EyeDropper can only be used in the browser environment.');
    }
    this.options = { ...this.options, ...options };
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._createUI(canvasOrContext);
      });
    }

    _createUI(canvasOrContext) {
      this._removeUI();

      // Discover the canvas
      let canvas;
      if (canvasOrContext instanceof HTMLCanvasElement) {
        canvas = canvasOrContext;
      } else if (canvasOrContext && typeof canvasOrContext.getImageData === 'function') {
        canvas = canvasOrContext.canvas;
      } else {
        throw new Error('You must provide a valid canvas or 2D context to EyeDropper.');
      }
      this._canvas = canvas;

            // Optimize canvas context for frequent getImageData operations
      const ctx = this._canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Failed to get 2D context from canvas.');
      }

  // Overlay container
      this._container = document.createElement('div');
      this._container.className = 'eyedropper-overlay';
      this._container.id = 'eyedropper-overlay';
      Object.assign(this._container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        background: (this.options.overlay && this.options.overlay.background) || 'rgba(0,0,0,0.0)',
        zIndex: (this.options.overlay && this.options.overlay.zIndex) || 99999,
        pointerEvents: 'none',
        ...(this.options.overlay && this.options.overlay.style),
      });
      document.body.appendChild(this._container);

  // Magnifier
      const magOpt = this.options.magnifier || {};
      this._magnifier = document.createElement('div');
      this._magnifier.className = 'eyedropper-magnifier';
      this._magnifier.id = 'eyedropper-magnifier';
      Object.assign(this._magnifier.style, {
        position: 'absolute',
        pointerEvents: 'none',
        width: magOpt.width || '80px',
        height: magOpt.height || '80px',
        border: magOpt.border || '2px solid #333',
        borderRadius: magOpt.borderRadius || '50%',
        overflow: magOpt.overflow || 'hidden',
        boxShadow: magOpt.boxShadow || '0 2px 8px #0008',
        zIndex: magOpt.zIndex || 100000,
        display: 'none',
        background: magOpt.background || '#fff',
        ...magOpt.style,
      });
      this._container.appendChild(this._magnifier);

      // Cache the canvas context and dimensions for performance
      this._canvasCache = {
        ctx: ctx,
        width: this._canvas.width,
        height: this._canvas.height,
        scaleX: this._canvas.width / this._canvas.getBoundingClientRect().width,
        scaleY: this._canvas.height / this._canvas.getBoundingClientRect().height,
        magW: parseInt(magOpt.width || '80'),
        magH: parseInt(magOpt.height || '80')
      };

      // Create crosshair element once (as child of magnifier)
      this._crosshair = document.createElement('div');
      this._crosshair.className = 'eyedropper-crosshair';
      this._crosshair.id = 'eyedropper-crosshair';
      Object.assign(this._crosshair.style, {
        position: 'absolute',
        pointerEvents: 'none',
        width: '6px',
        height: '6px',
        border: '1px solid #000',
        backgroundColor: 'transparent',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '1',
        boxSizing: 'border-box'
      });
      this._magnifier.appendChild(this._crosshair);

  // Preview
      const prevOpt = this.options.preview || {};
      this._preview = document.createElement('div');
      this._preview.className = 'eyedropper-preview';
      this._preview.id = 'eyedropper-preview';
      Object.assign(this._preview.style, {
        position: 'fixed',
        left: '0px',
        top: '0px',
        padding: prevOpt.padding || '10px 18px',
        background: prevOpt.background || '#fff',
        borderRadius: prevOpt.borderRadius || '8px',
        boxShadow: prevOpt.boxShadow || '0 2px 8px #0002',
        fontFamily: prevOpt.fontFamily || 'monospace',
        fontSize: prevOpt.fontSize || '1.1em',
        display: 'none', // Initially hidden until hover
        alignItems: prevOpt.alignItems || 'center',
        gap: prevOpt.gap || '12px',
        zIndex: prevOpt.zIndex || 100001,
        pointerEvents: 'none',
        minWidth: prevOpt.minWidth || '80px',
        ...prevOpt.style,
      });

      // Create color preview elements
      this._previewColor = document.createElement('div');
      this._previewColor.className = 'eyedropper-preview-color';
      this._previewColor.id = 'eyedropper-preview-color';
      Object.assign(this._previewColor.style, {
        width: '20px',
        height: '20px',
        borderRadius: '3px',
        border: '1px solid #ccc',
        flexShrink: '0'
      });

      this._colorDisplay = document.createElement('span');
      this._colorDisplay.className = 'eyedropper-color-display';
      this._colorDisplay.id = 'eyedropper-color-display';
      this._colorDisplay.textContent = '';

      this._preview.appendChild(this._previewColor);
      this._preview.appendChild(this._colorDisplay);
      this._container.appendChild(this._preview);

      // Initialize last pixel data for when mouse leaves
      this._lastPixel = null;

  // Events with throttled mouse move for better performance
  this._canvas.addEventListener('mousemove', this._onMouseMoveBound = this._throttledMouseMove.bind(this), { passive: true });
  this._canvas.addEventListener('mouseleave', this._onMouseLeaveBound = this._onMouseLeave.bind(this), { passive: true });
  this._canvas.addEventListener('mouseenter', this._onMouseEnterBound = this._onMouseEnter.bind(this), { passive: true });
  this._canvas.addEventListener('click', this._onClickBound = this._onClick.bind(this));
    }

    // Throttled mouse move for better performance
    _throttledMouseMove(e) {
      if (!this._mouseThrottle) {
        this._mouseThrottle = true;
        requestAnimationFrame(() => {
          this._onMouseMove(e);
          this._mouseThrottle = false;
        });
      }
    }

    _onMouseEnter(e) {
      // Hide cursor and show magnifier on mouse enter (preview will be shown when mouse moves)
      this._canvas.style.cursor = 'none';
      this._magnifier.style.display = 'block';
    }

        _onMouseMove(e) {
      const rect = this._canvas.getBoundingClientRect();
      const x = Math.floor(e.clientX - rect.left);
      const y = Math.floor(e.clientY - rect.top);

      // Simple getImageData call - optimized by willReadFrequently context
      const imageData = this._canvasCache.ctx.getImageData(x, y, 1, 1);
      const [r, g, b] = imageData.data;

      // Update preview with current color
      const hexColor = this._rgbToHex(r, g, b);
      this._previewColor.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      this._colorDisplay.textContent = hexColor;

      // Show preview now that we have valid data
      this._preview.style.display = 'flex';

      // Update magnifier position and content
      this._updateMagnifier(x, y, e, [r, g, b], hexColor);
    }

    _updateMagnifier(x, y, e, rgb, hex) {
      // Update magnifier position
      this._magnifier.style.left = `${e.clientX - this._canvasCache.magW / 2}px`;
      this._magnifier.style.top = `${e.clientY - this._canvasCache.magH / 2}px`;
      
      // Draw magnifier content
      this._drawMagnifier(x, y);
      
      // Position preview below magnifier
      const previewRect = { w: this._preview.offsetWidth, h: this._preview.offsetHeight };
      const px = e.clientX - this._canvasCache.magW / 2;
      const py = e.clientY + this._canvasCache.magH / 2 + 8;
      this._preview.style.left = `${px + this._canvasCache.magW / 2 - previewRect.w / 2}px`;
      this._preview.style.top = `${py}px`;
      
      // Store last pixel data
      this._lastPixel = {
        x: x,
        y: y,
        clientX: e.clientX,
        clientY: e.clientY,
        hex: hex,
        rgb: rgb
      };
    }

    _onMouseLeave() {
      // Keep magnifier and preview visible showing last selected pixel
      if (this._lastPixel && this._canvasCache && this._lastPixel.hex && this._lastPixel.rgb) {
        // Keep magnifier at last position using cached dimensions
        this._magnifier.style.left = `${this._lastPixel.clientX - this._canvasCache.magW / 2}px`;
        this._magnifier.style.top = `${this._lastPixel.clientY - this._canvasCache.magH / 2}px`;
        
        this._drawMagnifier(this._lastPixel.x, this._lastPixel.y);
        
        // Keep preview with last pixel data using proper elements
        if (typeof this.options.renderPreview === 'function') {
          this._preview.innerHTML = this.options.renderPreview(this._lastPixel);
        } else {
          // Update the preview elements properly with valid data
          this._previewColor.style.backgroundColor = `rgb(${this._lastPixel.rgb[0]}, ${this._lastPixel.rgb[1]}, ${this._lastPixel.rgb[2]})`;
          this._colorDisplay.textContent = this._lastPixel.hex;
          this._preview.style.display = 'flex';
        }
        
        // Position preview below magnifier
        const previewRect = { w: this._preview.offsetWidth, h: this._preview.offsetHeight };
        const px = this._lastPixel.clientX - this._canvasCache.magW / 2;
        const py = this._lastPixel.clientY + this._canvasCache.magH / 2 + 8;
        this._preview.style.left = `${px + this._canvasCache.magW / 2 - previewRect.w / 2}px`;
        this._preview.style.top = `${py}px`;
      } else {
        // If no valid last pixel, hide elements and restore cursor
        this._canvas.style.cursor = 'default';
        this._magnifier.style.display = 'none';
        this._preview.style.display = 'none';
      }
    }

    _onClick(e) {
      // Use the pixel data we already have from the last mouse move
      if (this._lastPixel) {
        const { hex, rgb, x, y } = this._lastPixel;
        if (typeof this.options.onPick === 'function') {
          this.options.onPick({ hex, rgb, x, y, event: e });
        }
        this._resolve({ hex, rgb });
      } else {
        // Fallback: get pixel data if somehow we don't have it
        const position = this._currentPosition || (() => {
          const rect = this._canvas.getBoundingClientRect();
          return {
            x: Math.floor((e.clientX - rect.left) * (this._canvasCache?.scaleX || (this._canvas.width / rect.width))),
            y: Math.floor((e.clientY - rect.top) * (this._canvasCache?.scaleY || (this._canvas.height / rect.height))),
          };
        })();

        // Simple getImageData call - optimized by willReadFrequently context
        const imageData = this._canvasCache.ctx.getImageData(position.x, position.y, 1, 1);
        const [r, g, b] = imageData.data;
        const hex = this._rgbToHex(r, g, b);
        const rgb = [r, g, b];
        
        if (typeof this.options.onPick === 'function') {
          this.options.onPick({ hex, rgb, x: position.x, y: position.y, event: e });
        }
        this._resolve({ hex, rgb });
      }
      this._removeUI();
    }

    _drawMagnifier(x, y) {
      // Cache magnifier options on first use
      if (!this._magnifierCache) {
        this._magnifierCache = {
          size: (this.options.magnifier && this.options.magnifier.size) || 20,
          zoom: (this.options.magnifier && this.options.magnifier.zoom) || 4
        };
      }

      const { size, zoom } = this._magnifierCache;
      
      // Create or reuse magnifier canvas
      if (!this._magCanvas) {
        this._magCanvas = document.createElement('canvas');
        this._magCanvas.className = 'eyedropper-magnifier-canvas';
        this._magCanvas.id = 'eyedropper-magnifier-canvas';
        // Insert canvas before crosshair to maintain proper z-order
        this._magnifier.insertBefore(this._magCanvas, this._crosshair);
      }
      
      // Only resize if dimensions changed
      const newWidth = size * zoom;
      const newHeight = size * zoom;
      if (this._magCanvas.width !== newWidth || this._magCanvas.height !== newHeight) {
        this._magCanvas.width = newWidth;
        this._magCanvas.height = newHeight;
      }
      
      // Use cached context with willReadFrequently optimization
      if (!this._magCtx) {
        this._magCtx = this._magCanvas.getContext('2d', { willReadFrequently: true });
        this._magCtx.imageSmoothingEnabled = false;
      }
      
      this._magCtx.drawImage(
        this._canvas,
        x - size / 2, y - size / 2, size, size,
        0, 0, newWidth, newHeight
      );
    }

    _rgbToHex(r, g, b) {
      // Faster bitwise conversion without array creation
      return '#' + 
        ((1 << 24) + (r << 16) + (g << 8) + b)
          .toString(16)
          .slice(1);
    }

    _removeUI() {
      if (this._container && this._container.parentNode) {
        this._container.parentNode.removeChild(this._container);
      }
      if (this._canvas) {
        // Restore cursor
        this._canvas.style.cursor = 'default';
        this._canvas.removeEventListener('mousemove', this._onMouseMoveBound);
        this._canvas.removeEventListener('mouseleave', this._onMouseLeaveBound);
        this._canvas.removeEventListener('mouseenter', this._onMouseEnterBound);
        this._canvas.removeEventListener('click', this._onClickBound);
      }
      // Clear all cached references and data
      this._container = null;
      this._canvas = null;
      this._magnifier = null;
      this._crosshair = null;
      this._preview = null;
      this._lastPixel = null;
      this._currentPosition = null;
      this._canvasCache = null;
      this._magnifierCache = null;
      this._magCanvas = null;
      this._magCtx = null;
      this._mouseThrottle = false;
      this._imageDataCache = null;
    }

  /**
   * Automated method: pass only image URL, library handles canvas creation and setup
   * @param {string} imageUrl - URL of the image to load
   * @param {Object} [options] - Options to override constructor options
   * @param {Object} [canvasOptions] - Canvas configuration { width, height, position }
   * @returns {Promise<{hex: string, rgb: [number, number, number]}>}
   */
  openFromImageUrl(imageUrl, options = {}, canvasOptions = {}) {
    // Ensure running in browser (not SSR)
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('EyeDropper can only be used in the browser environment.');
    }

    return new Promise((resolve, reject) => {
      // Calculate position for loading and canvas
      const canvasTop = canvasOptions.position?.top || '50%';
      const canvasLeft = canvasOptions.position?.left || '50%';
      const canvasWidth = canvasOptions.width || 400; // Default fallback
      const canvasHeight = canvasOptions.height || 300; // Default fallback

      // Create loading overlay positioned where canvas will appear
      const loadingOverlay = this._createLoadingOverlay(canvasTop, canvasLeft, canvasWidth, canvasHeight);
      document.body.appendChild(loadingOverlay);

      // Create temporary image element
      const img = new Image();
      img.crossOrigin = 'anonymous'; // For CORS images
      
      img.onload = () => {
        try {
          // Remove loading overlay
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
          }

          // Create temporary canvas
          const canvas = document.createElement('canvas');
          canvas.className = 'eyedropper-main-canvas';
          canvas.id = 'eyedropper-main-canvas';
          const finalCanvasWidth = canvasOptions.width || img.naturalWidth;
          const finalCanvasHeight = canvasOptions.height || img.naturalHeight;
          
          canvas.width = finalCanvasWidth;
          canvas.height = finalCanvasHeight;
          canvas.style.position = 'fixed';
          canvas.style.top = canvasTop;
          canvas.style.left = canvasLeft;
          canvas.style.transform = 'translate(-50%, -50%)';
          canvas.style.zIndex = '99998';
          canvas.style.border = '2px solid #333';
          canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          canvas.style.background = '#fff';
          
          // Draw image to canvas
          EyeDropper.drawImageToCanvas(img, canvas, { cover: canvasOptions.cover });
          
          // Add canvas to body temporarily
          document.body.appendChild(canvas);
          
          // Open eyedropper on this canvas
          this.open(canvas, options).then((color) => {
            // Clean up: remove temporary canvas
            if (canvas.parentNode) {
              canvas.parentNode.removeChild(canvas);
            }
            resolve(color);
          }).catch(reject);
          
        } catch (error) {
          // Remove loading overlay on error
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
          }
          reject(error);
        }
      };
      
      img.onerror = () => {
        // Remove loading overlay on error
        if (loadingOverlay.parentNode) {
          loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
        reject(new Error(`Failed to load image from URL: ${imageUrl}`));
      };
      
      img.src = imageUrl;
    });
  }

  /**
   * Creates a loading overlay with skeleton/spinner positioned where canvas will appear
   * @param {string} top - Top position (e.g., '50%')
   * @param {string} left - Left position (e.g., '50%')
   * @param {number} width - Expected canvas width
   * @param {number} height - Expected canvas height
   * @returns {HTMLElement} Loading overlay element
   */
  _createLoadingOverlay(top = '50%', left = '50%', width = 400, height = 300) {
    const overlay = document.createElement('div');
    overlay.className = 'eyedropper-loading-overlay';
    overlay.id = 'eyedropper-loading-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: top,
      left: left,
      transform: 'translate(-50%, -50%)',
      width: `${width}px`,
      height: `${height}px`,
      background: '#fff',
      border: '2px solid #333',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '99998',
      fontFamily: 'Arial, sans-serif'
    });

    const loadingContent = document.createElement('div');
    loadingContent.className = 'eyedropper-loading-content';
    loadingContent.id = 'eyedropper-loading-content';
    Object.assign(loadingContent.style, {
      textAlign: 'center'
    });

    // Skeleton loader animation (proportional to canvas size)
    const skeleton = document.createElement('div');
    skeleton.className = 'eyedropper-loading-skeleton';
    skeleton.id = 'eyedropper-loading-skeleton';
    const skeletonWidth = Math.min(width * 0.7, 200);
    const skeletonHeight = Math.min(height * 0.5, 120);
    
    Object.assign(skeleton.style, {
      width: `${skeletonWidth}px`,
      height: `${skeletonHeight}px`,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-loading 1.5s infinite',
      borderRadius: '8px',
      marginBottom: '16px',
      margin: '0 auto 16px auto'
    });

    const text = document.createElement('div');
    text.className = 'eyedropper-loading-text';
    text.id = 'eyedropper-loading-text';
    text.textContent = 'Loading image...';
    Object.assign(text.style, {
      color: '#666',
      fontSize: '14px',
      fontWeight: '500'
    });

    // Add CSS animation for skeleton
    if (!document.getElementById('skeleton-animation-style')) {
      const style = document.createElement('style');
      style.id = 'skeleton-animation-style';
      style.textContent = `
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `;
      document.head.appendChild(style);
    }

    loadingContent.appendChild(skeleton);
    loadingContent.appendChild(text);
    overlay.appendChild(loadingContent);

    return overlay;
  }

  attachToImage(imgElement) {
    // Initialize eyedropper on an <img> element
    // Example usage: eyedropper.attachToImage(document.querySelector('img'))
    // Basic implementation will be provided in future versions
    throw new Error('Method not implemented. Coming soon!');
  }
}



const LTCodeEyeDropper = EyeDropper;

let activePickerCleanup = null;
const DEBUG_CATEGORY_ALIASES = {
  // Legacy alias kept so CANVA_DEBUG=drag still enables dnd instrumentation.
  drag: 'dnd',
};

function normalizeDebugCategory(category = 'app') {
  const raw = String(category || 'app').trim().toLowerCase();
  return DEBUG_CATEGORY_ALIASES[raw] || raw || 'app';
}

const DEBUG_SPEC = String(process?.env?.CANVA_DEBUG || '').trim();
const DEBUG_TOKENS = new Set(
  DEBUG_SPEC
    .split(',')
    .map((item) => normalizeDebugCategory(item))
    .filter(Boolean)
);

function debugEnabled(category = 'app') {
  const normalizedSpec = DEBUG_SPEC.toLowerCase();
  if (!normalizedSpec || normalizedSpec === '0' || normalizedSpec === 'false') {
    return false;
  }
  const normalized = normalizeDebugCategory(category);
  if (['1', 'true', 'all', '*'].includes(normalizedSpec)) {
    return true;
  }
  return DEBUG_TOKENS.has('all') || DEBUG_TOKENS.has('*') || DEBUG_TOKENS.has(normalized);
}

function createAbortError() {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function createOperationError(message) {
  return new DOMException(message || 'The operation failed.', 'OperationError');
}

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return match ? `#${match[1].toLowerCase()}` : null;
}

function routeDebug(category, ...args) {
  const normalized = normalizeDebugCategory(category);
  try {
    ipcRenderer.send('wrapper:debug-log', { category: normalized, args });
  } catch {
    try {
      console.log(`[canva:${normalized}]`, ...args);
    } catch {}
  }
}

function log(...args) {
  if (!debugEnabled('eyedropper')) return;
  try {
    ipcRenderer.send('wrapper:eyedropper-log', ...args);
  } catch {}
}

function debugLog(category, ...args) {
  const normalized = normalizeDebugCategory(category);
  if (!debugEnabled(normalized)) return;
  routeDebug(normalized, ...args);
}

function describeDragTarget(target) {
  if (!target || typeof target !== 'object') return 'unknown';
  const tagName = target.tagName ? String(target.tagName).toLowerCase() : 'node';
  const id = target.id ? `#${target.id}` : '';
  const className = typeof target.className === 'string' && target.className.trim()
    ? `.${target.className.trim().split(/\s+/).slice(0, 3).join('.')}`
    : '';
  return `${tagName}${id}${className}`;
}

function describeFileInput(target) {
  if (!(target instanceof HTMLInputElement) || target.type !== 'file') {
    return null;
  }
  return {
    accept: target.accept || 'any',
    multiple: target.multiple ? 'true' : 'false',
    webkitdirectory: target.webkitdirectory ? 'true' : 'false',
    target: describeDragTarget(target),
  };
}

const UPLOAD_DEBUG_META = Symbol('canvaUploadDebugMeta');

function nextUploadIngressId() {
  const scope = globalThis || window;
  scope.__canvaUploadIngressCounter = (scope.__canvaUploadIngressCounter || 0) + 1;
  return scope.__canvaUploadIngressCounter;
}

function formatFileDescriptor(file) {
  if (!file) return 'unknown';
  const name = typeof file.name === 'string' && file.name ? file.name : 'blob';
  const type = typeof file.type === 'string' && file.type ? file.type : 'unknown';
  const size = Number.isFinite(file.size) ? file.size : 0;
  return `${name}:${type}:${size}`;
}

function summarizeFiles(files, limit = 3) {
  if (!files || typeof files.length !== 'number' || files.length < 1) return 'none';
  return Array.from(files)
    .slice(0, limit)
    .map((file) => formatFileDescriptor(file))
    .join(',');
}

function summarizeClipboardKinds(dataTransfer) {
  const kinds = new Set();
  const types = dataTransfer?.types ? Array.from(dataTransfer.types) : [];
  const items = dataTransfer?.items ? Array.from(dataTransfer.items) : [];
  if (dataTransfer?.files?.length) kinds.add('files');
  for (const item of items) {
    if (item.kind === 'file') {
      kinds.add('files');
      if ((item.type || '').startsWith('image/')) {
        kinds.add('image');
      }
    }
    if (item.kind === 'string') {
      if (item.type === 'text/html') kinds.add('html');
      if (item.type === 'text/plain') kinds.add('text');
      if (item.type === 'text/uri-list') kinds.add('url');
    }
  }
  for (const type of types) {
    if (type === 'text/html') kinds.add('html');
    if (type === 'text/plain') kinds.add('text');
    if (type === 'text/uri-list') kinds.add('url');
    if (type.startsWith('image/')) kinds.add('image');
  }
  return kinds.size ? Array.from(kinds).join(',') : 'none';
}

function describeBodyUpload(body) {
  if (!body) return null;
  if (body instanceof File) {
    return {
      kind: 'file',
      files: 1,
      fileSummary: summarizeFiles([body]),
      fieldSummary: 'direct-file',
    };
  }
  if (body instanceof Blob) {
    return {
      kind: 'blob',
      files: 1,
      fileSummary: `blob:${body.type || 'unknown'}:${Number.isFinite(body.size) ? body.size : 0}`,
      fieldSummary: 'direct-blob',
    };
  }
  if (body instanceof FormData) {
    const meta = body[UPLOAD_DEBUG_META];
    if (meta?.files > 0) {
      return {
        kind: 'formdata',
        files: meta.files,
        fileSummary: meta.fileSummary || 'none',
        fieldSummary: meta.fieldSummary || 'none',
      };
    }
  }
  return null;
}

function rememberUploadIngress(source, info = {}) {
  const scope = globalThis || window;
  // Persist the last ingress source so network logs can be correlated later.
  const ingress = {
    id: nextUploadIngressId(),
    source,
    timestamp: Date.now(),
    ...info,
  };
  scope.__canvaLastUploadIngress = ingress;
  return ingress;
}

function recentUploadIngressSummary() {
  const scope = globalThis || window;
  const ingress = scope.__canvaLastUploadIngress;
  if (!ingress || !ingress.timestamp) return 'id=none source=none';
  const ageMs = Math.max(0, Date.now() - ingress.timestamp);
  return [
    `id=${ingress.id || 'none'}`,
    `source=${ingress.source || 'unknown'}`,
    `ageMs=${ageMs}`,
    `files=${ingress.files ?? 0}`,
    `types=${ingress.types || 'none'}`,
    ingress.target || 'unknown',
  ].join(' ');
}

function installDragAndUploadDiagnostics() {
  const scope = globalThis || window;
  if (scope.__canvaDragDiagnosticsInstalled) return;
  scope.__canvaDragDiagnosticsInstalled = true;

  const summarizeDataTransfer = (dataTransfer, target) => {
    const files = dataTransfer?.files ? Array.from(dataTransfer.files) : [];
    const items = dataTransfer?.items ? Array.from(dataTransfer.items) : [];
    const types = dataTransfer?.types ? Array.from(dataTransfer.types) : [];
    return {
      files: files.length,
      fileSummary: summarizeFiles(files),
      items: items.map((item) => `${item.kind}:${item.type || 'unknown'}`).join(','),
      kinds: summarizeClipboardKinds(dataTransfer),
      types: types.join(','),
      dropEffect: dataTransfer?.dropEffect || 'none',
      effectAllowed: dataTransfer?.effectAllowed || 'none',
      target: describeDragTarget(target),
    };
  };

  const recordIngressFromDataTransfer = (source, info) => {
    if (!info || (info.files < 1 && (!info.items || info.items === 'none') && (!info.types || info.types === 'none'))) return null;
    return rememberUploadIngress(source, {
      files: info.files,
      types: info.types,
      target: info.target,
      fileSummary: info.fileSummary,
      kinds: info.kinds,
    });
  };

  const logDrag = (label, event) => {
    if (!debugEnabled('dnd')) return;
    const info = summarizeDataTransfer(event.dataTransfer, event.target);
    let ingress = null;
    if (label === 'drop') {
      // Drop is the strongest signal that a host file import started.
      ingress = recordIngressFromDataTransfer('drop', info);
    }
    debugLog(
      'dnd',
      label,
      ingress ? `id=${ingress.id}` : 'id=none',
      `files=${info.files}`,
      `fileSummary=${info.fileSummary || 'none'}`,
      `items=${info.items || 'none'}`,
      `kinds=${info.kinds || 'none'}`,
      `types=${info.types || 'none'}`,
      `dropEffect=${info.dropEffect}`,
      `effectAllowed=${info.effectAllowed}`,
      info.target
    );
  };

  const logUploadInput = (label, target, { remember = true } = {}) => {
    const info = describeFileInput(target);
    if (!info) return;
    let ingress = null;
    if (remember) {
      ingress = rememberUploadIngress(label, {
        files: 0,
        types: 'file-input',
        target: info.target,
      });
    }
    debugLog(
      'upload',
      label,
      ingress ? `id=${ingress.id}` : 'id=none',
      `accept=${info.accept}`,
      `multiple=${info.multiple}`,
      `webkitdirectory=${info.webkitdirectory}`,
      info.target
    );
  };

  window.addEventListener('dragenter', (event) => logDrag('enter', event), true);
  window.addEventListener('dragover', (event) => logDrag('over', event), true);
  window.addEventListener('dragleave', (event) => logDrag('leave', event), true);
  window.addEventListener('dragstart', (event) => logDrag('start', event), true);
  window.addEventListener('dragend', (event) => {
    logDrag('end', event);
    queueMicrotask(() => {
      try {
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, buttons: 0 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, buttons: 0 }));
      } catch {}
    });
  }, true);
  window.addEventListener('drop', (event) => {
    logDrag('drop', event);
    debugLog('upload', 'drop-ingress', recentUploadIngressSummary());
    queueMicrotask(() => {
      try {
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, buttons: 0 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, buttons: 0 }));
      } catch {}
    });
  }, true);
  window.addEventListener('paste', (event) => {
    const info = summarizeDataTransfer(event.clipboardData, event.target);
    if (info.files < 1 && !info.items) return;
    recordIngressFromDataTransfer('paste', info);
    debugLog('upload', 'paste', `files=${info.files}`, `items=${info.items || 'none'}`, `types=${info.types || 'none'}`, info.target);
  }, true);

  document.addEventListener('click', (event) => {
    logUploadInput('input-click', event.target);
  }, true);

  document.addEventListener('change', (event) => {
    debugLog('upload', 'document-change', describeDragTarget(event.target));
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'file') return;
    logUploadInput('input-change-meta', target);
    debugLog('upload', 'input-change', `files=${target.files ? target.files.length : 0}`, describeDragTarget(target));
  }, true);
}

function installFilePickerDiagnostics() {
  const scope = globalThis || window;
  if (typeof scope.showOpenFilePicker !== 'function' || scope.showOpenFilePicker.__canvaDebugWrapped) {
    return;
  }

  // Wrap picker API only for observability; keep original behavior untouched.
  const original = scope.showOpenFilePicker.bind(scope);
  const wrapped = async (...args) => {
    debugLog('upload', 'show-open-file-picker', `args=${args.length}`);
    try {
      const handles = await original(...args);
      debugLog('upload', 'show-open-file-picker-result', `handles=${Array.isArray(handles) ? handles.length : 0}`);
      return handles;
    } catch (error) {
      debugLog('upload', 'show-open-file-picker-error', error?.name || 'Error', error?.message || '');
      throw error;
    }
  };

  wrapped.__canvaDebugWrapped = true;
  scope.showOpenFilePicker = wrapped;
}

debugLog('startup', 'preload-loaded', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
log('preload-loaded', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
installDragAndUploadDiagnostics();
installFilePickerDiagnostics();

function removeLtcodeUi() {
  const overlay = document.getElementById('eyedropper-overlay');
  if (overlay?.parentNode) overlay.parentNode.removeChild(overlay);
}

function getScaledCanvasPosition(instance, event) {
  if (!instance?._canvas) return { x: 0, y: 0, rect: null };
  const rect = instance._canvas.getBoundingClientRect();
  const width = instance._canvas.width || 1;
  const height = instance._canvas.height || 1;
  const scaleX = (instance._canvasCache?.scaleX) || (width / Math.max(1, rect.width));
  const scaleY = (instance._canvasCache?.scaleY) || (height / Math.max(1, rect.height));
  const x = Math.max(0, Math.min(width - 1, Math.floor((event.clientX - rect.left) * scaleX)));
  const y = Math.max(0, Math.min(height - 1, Math.floor((event.clientY - rect.top) * scaleY)));
  return { x, y, rect };
}

function installLtcodeScalingPatch() {
  if (LTCodeEyeDropper.__canvaScalingPatchInstalled) return;
  LTCodeEyeDropper.__canvaScalingPatchInstalled = true;

  const proto = LTCodeEyeDropper.prototype;

  proto._onMouseMove = function onMouseMovePatched(event) {
    if (!this?._canvas || !this?._canvasCache?.ctx || !this?._previewColor || !this?._colorDisplay || !this?._preview) {
      return;
    }

    const { x, y } = getScaledCanvasPosition(this, event);
    const imageData = this._canvasCache.ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;
    const hexColor = this._rgbToHex(r, g, b).toLowerCase();

    this._previewColor.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    this._colorDisplay.textContent = hexColor;
    this._preview.style.display = 'flex';
    this._currentPosition = { x, y };
    this._lastPixel = { x, y, clientX: event.clientX, clientY: event.clientY, hex: hexColor, rgb: [r, g, b] };
    this._updateMagnifier(x, y, event, [r, g, b], hexColor);
  };

  proto._onClick = function onClickPatched(event) {
    if (!this?._canvas || !this?._canvasCache?.ctx) {
      return;
    }

    let picked = this._lastPixel;
    if (!picked || !Array.isArray(picked.rgb)) {
      const { x, y } = getScaledCanvasPosition(this, event);
      const imageData = this._canvasCache.ctx.getImageData(x, y, 1, 1);
      const [r, g, b] = imageData.data;
      picked = {
        hex: this._rgbToHex(r, g, b).toLowerCase(),
        rgb: [r, g, b],
        x,
        y,
      };
    }

    this._currentPosition = { x: picked.x, y: picked.y };
    if (typeof this.options?.onPick === 'function') {
      this.options.onPick({ ...picked, event });
    }
    log('picked', picked.hex, picked.x, picked.y, JSON.stringify(picked.rgb));
    if (typeof this._resolve === 'function') {
      this._resolve({ hex: picked.hex, rgb: picked.rgb });
    }
    if (typeof this._removeUI === 'function') {
      this._removeUI();
    } else {
      removeLtcodeUi();
    }
  };
}

function createSnapshotCanvas(snapshot) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const cssWidth = Math.max(1, Number(snapshot?.cssWidth) || window.innerWidth || image.naturalWidth || 1);
      const cssHeight = Math.max(1, Number(snapshot?.cssHeight) || window.innerHeight || image.naturalHeight || 1);
      const nativeWidth = Math.max(1, Number(snapshot?.width) || image.naturalWidth || cssWidth);
      const nativeHeight = Math.max(1, Number(snapshot?.height) || image.naturalHeight || cssHeight);

      const host = document.createElement('div');
      host.setAttribute('data-canva-eyedropper-host', 'true');
      Object.assign(host.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483646',
        background: 'transparent',
        cursor: 'crosshair',
        pointerEvents: 'auto',
        overflow: 'hidden',
      });

      const canvas = document.createElement('canvas');
      canvas.width = nativeWidth;
      canvas.height = nativeHeight;
      Object.assign(canvas.style, {
        position: 'absolute',
        inset: '0',
        width: `${cssWidth}px`,
        height: `${cssHeight}px`,
        display: 'block',
        cursor: 'crosshair',
        pointerEvents: 'auto',
      });

      const context = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
      if (!context) {
        reject(new Error('Failed to create the color picker canvas.'));
        return;
      }

      log('canvas', `${nativeWidth}x${nativeHeight}`, 'css', `${cssWidth}x${cssHeight}`, 'image', `${image.naturalWidth}x${image.naturalHeight}`);

      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, nativeWidth, nativeHeight);
      context.drawImage(image, 0, 0, nativeWidth, nativeHeight);

      host.appendChild(canvas);
      (document.body || document.documentElement).appendChild(host);
      resolve({ host, canvas });
    };
    image.onerror = () => reject(new Error('Failed to load the Canva window snapshot.'));
    image.src = snapshot.dataUrl;
  });
}

async function openLtcodeEyeDropper() {
  if (activePickerCleanup) {
    throw createOperationError('A color picker is already active.');
  }

  installLtcodeScalingPatch();
  debugLog('eyedropper', 'open-request', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
  log('open-request', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);

  // Main process snapshot keeps eyedropper capture consistent inside sandboxed pages.
  const snapshot = await ipcRenderer.invoke('wrapper:eyedropper-snapshot');
  if (!snapshot || typeof snapshot.dataUrl !== 'string') {
    throw createOperationError('The Canva window snapshot failed.');
  }

  const { host, canvas } = await createSnapshotCanvas(snapshot);
  const eyedropper = new LTCodeEyeDropper({
    overlay: {
      background: 'rgba(0,0,0,0)',
      zIndex: 2147483647,
    },
    magnifier: {
      width: '96px',
      height: '96px',
      size: 18,
      zoom: 6,
      border: '2px solid rgba(17,24,39,0.92)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.28)',
      background: '#fff',
    },
    preview: {
      background: 'rgba(17,24,39,0.96)',
      color: '#fff',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.28)',
      padding: '8px 12px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      minWidth: '96px',
      zIndex: 2147483647,
    },
  });

  return await new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (activePickerCleanup === cleanup) {
        activePickerCleanup = null;
      }
      removeLtcodeUi();
      host.remove();
      window.removeEventListener('keydown', onKeyDown, true);
    };

    const finishResolve = (payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    };

    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finishReject(createAbortError());
      }
    };

    activePickerCleanup = cleanup;
    window.addEventListener('keydown', onKeyDown, true);

    requestAnimationFrame(() => {
      Promise.resolve(eyedropper.open(canvas)).then((result) => {
        debugLog('eyedropper', 'open-resolved');
        const hex = normalizeHex(result?.hex || result?.sRGBHex);
        if (!hex) {
          finishReject(createOperationError('The color picker library did not return a valid color.'));
          return;
        }
        finishResolve({ sRGBHex: hex });
      }).catch((error) => {
        debugLog('eyedropper', 'open-rejected', error && error.message ? error.message : 'unknown-error');
        if (error && (error.name === 'AbortError' || /abort/i.test(String(error.message || '')))) {
          finishReject(createAbortError());
          return;
        }
        finishReject(createOperationError(error && error.message ? error.message : 'The color picker failed.'));
      });
    });
  });
}

function wrapOpenCall(options = {}) {
  const signal = options?.signal;
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  let abortHandler;
  const pickPromise = openLtcodeEyeDropper().then((result) => {
    if (!result || typeof result.sRGBHex !== 'string') {
      throw createOperationError('The wrapper eye dropper did not return a valid color.');
    }
    return { sRGBHex: result.sRGBHex };
  }).catch((error) => {
    if (error && error.name === 'AbortError') {
      throw createAbortError();
    }
    throw createOperationError(error && error.message ? error.message : 'The wrapper eye dropper failed.');
  });

  if (!signal) {
    return pickPromise;
  }

  const abortPromise = new Promise((_, reject) => {
    abortHandler = () => reject(createAbortError());
    signal.addEventListener('abort', abortHandler, { once: true });
  });

  return Promise.race([pickPromise, abortPromise]).finally(() => {
    if (abortHandler) signal.removeEventListener('abort', abortHandler);
  });
}

function patchNativeEyeDropperPrototype(scope) {
  if (!scope) return false;
  const nativeCtor = scope.__canvaNativeEyeDropper || scope.EyeDropper;
  if (typeof nativeCtor !== 'function') return false;
  const proto = nativeCtor && nativeCtor.prototype;
  if (!proto || typeof proto.open !== 'function') return false;
  if (proto.__canvaNativeOpenPatched) return true;

  const originalOpen = proto.open;
  Object.defineProperty(proto, '__canvaOriginalOpen', {
    configurable: true,
    enumerable: false,
    value: originalOpen,
    writable: false,
  });

  Object.defineProperty(proto, 'open', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function patchedNativeOpen(options = {}) {
      log('native open intercepted', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
      return wrapOpenCall(options);
    },
  });

  Object.defineProperty(proto, '__canvaNativeOpenPatched', {
    configurable: true,
    enumerable: false,
    value: true,
    writable: false,
  });

  log('patched native prototype', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, nativeCtor.name || 'EyeDropper');
  return true;
}

function installWrappedEyeDropper() {
  const scope = globalThis || window;
  if (scope.__canvaWrappedEyeDropperInstalled && scope.__canvaWrappedEyeDropper) {
    patchNativeEyeDropperPrototype(scope);
    return scope.__canvaWrappedEyeDropper;
  }

  const existingCtor = (() => {
    try {
      return scope.EyeDropper;
    } catch {
      return undefined;
    }
  })();
  if (!scope.__canvaNativeEyeDropper && typeof existingCtor === 'function') {
    scope.__canvaNativeEyeDropper = existingCtor;
  }

  const state = scope.__canvaEyeDropperState || {
    readCount: 0,
    setCount: 0,
  };
  scope.__canvaEyeDropperState = state;

  class WrappedEyeDropper {
    constructor() {
      log('new EyeDropper', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
    }

    async open(options = {}) {
      log('wrapper open-request', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
      return wrapOpenCall(options);
    }
  }

  const targets = [];
  const seen = new Set();
  const addTarget = (target, label) => {
    if (!target || seen.has(target)) return;
    seen.add(target);
    targets.push([target, label]);
  };
  addTarget(window, 'window');
  try { addTarget(globalThis, 'globalThis'); } catch {}
  try { if (typeof self !== 'undefined') addTarget(self, 'self'); } catch {}

  const descriptor = {
    configurable: true,
    enumerable: false,
    get() {
      state.readCount += 1;
      if (state.readCount <= 8) {
        log('get EyeDropper', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, `count=${state.readCount}`);
      }
      return WrappedEyeDropper;
    },
    set(value) {
      state.setCount += 1;
      if (state.setCount <= 8) {
        const valueName = value && value.name ? value.name : typeof value;
        log('set EyeDropper', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, `count=${state.setCount}`, valueName);
      }
      return true;
    },
  };

  let installedAny = false;
  for (const [target, label] of targets) {
    try {
      Object.defineProperty(target, 'EyeDropper', descriptor);
      installedAny = true;
    } catch (error) {
      log('install-failed', label, process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, error && error.message ? error.message : String(error));
    }
  }

  patchNativeEyeDropperPrototype(scope);

  scope.__canvaWrappedEyeDropper = WrappedEyeDropper;
  scope.__canvaWrappedEyeDropperInstalled = installedAny;
  if (installedAny) {
    log('installed', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
  }
  return WrappedEyeDropper;
}

function ensureWrappedEyeDropperInstalled() {
  const scope = globalThis || window;
  const wrapped = installWrappedEyeDropper();
  try {
    patchNativeEyeDropperPrototype(scope);
    if (scope.EyeDropper !== wrapped) {
      log('reinstall EyeDropper', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
      scope.__canvaWrappedEyeDropperInstalled = false;
      installWrappedEyeDropper();
    }
  } catch (error) {
    log('ensure-failed', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, error && error.message ? error.message : String(error));
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', ensureWrappedEyeDropperInstalled, { once: true });
} else {
  ensureWrappedEyeDropperInstalled();
}

window.addEventListener('pageshow', ensureWrappedEyeDropperInstalled, { passive: true });
window.addEventListener('focus', ensureWrappedEyeDropperInstalled, { passive: true });

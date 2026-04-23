/**
 * Enhanced Stream Manager - VLC-like open network stream functionality
 * Supports multiple formats: RTSP, HTTP/MJPEG, HLS, WebRTC
 * Provides automatic fallback and error recovery
 */

export interface StreamOptions {
  url: string
  format?: 'rtsp' | 'http' | 'hls' | 'mjpeg' | 'webrtc' | 'auto'
  username?: string
  password?: string
  transport?: 'tcp' | 'udp' | 'auto'
  timeout?: number
  quality?: 'low' | 'medium' | 'high'
  latency?: 'low' | 'normal' | 'high'
  retries?: number
}

export interface StreamStatus {
  isConnected: boolean
  format: string
  error?: string
  retryCount: number
  latency?: number
}

export class StreamManager {
  private videoElement: HTMLVideoElement | null = null
  private streamSource: any = null // HLS.js instance or other stream handler
  private statusCallback: ((status: StreamStatus) => void) | null = null
  private retryTimeout: NodeJS.Timeout | null = null
  private latencyTimer: NodeJS.Timeout | null = null
  private currentOptions: StreamOptions | null = null

  constructor() {}

  /**
   * Attach to video element and start streaming
   */
  async attach(videoElement: HTMLVideoElement, options: StreamOptions): Promise<void> {
    this.videoElement = videoElement
    this.currentOptions = { ...options, retries: options.retries || 3 }
    
    // Clean up any existing stream
    await this.detach()
    
    // Detect format if auto
    if (options.format === 'auto') {
      options.format = this.detectFormat(options.url)
    }

    // Start streaming based on format
    await this.startStream(options)
  }

  /**
   * Detach and cleanup current stream
   */
  async detach(): Promise<void> {
    this.clearRetryTimeout()
    this.clearLatencyTimer()
    
    if (this.streamSource) {
      if (this.streamSource.destroy) {
        this.streamSource.destroy()
      }
      this.streamSource = null
    }
    
    if (this.videoElement) {
      this.videoElement.src = ''
      this.videoElement.srcObject = null
      this.videoElement.load()
    }
  }

  /**
   * Set status callback
   */
  onStatusChange(callback: (status: StreamStatus) => void): void {
    this.statusCallback = callback
  }

  /**
   * Detect stream format from URL
   */
  private detectFormat(url: string): 'rtsp' | 'http' | 'hls' | 'mjpeg' | 'webrtc' {
    if (url.startsWith('rtsp://')) return 'rtsp'
    if (url.includes('.m3u8') || url.includes('m3u8')) return 'hls'
    if (url.includes('.mjpg') || url.includes('mjpeg') || url.includes('/video')) return 'mjpeg'
    if (url.startsWith('http://') || url.startsWith('https://')) return 'http'
    return 'http' // default fallback
  }

  /**
   * Start streaming based on format
   */
  private async startStream(options: StreamOptions): Promise<void> {
    if (!this.videoElement || !this.currentOptions) return

    this.updateStatus({ 
      isConnected: false, 
      format: options.format || 'unknown', 
      retryCount: 0 
    })

    try {
      switch (options.format) {
        case 'rtsp':
          await this.startRTSPStream(options)
          break
        case 'hls':
          await this.startHLSStream(options)
          break
        case 'mjpeg':
          await this.startMJPEGStream(options)
          break
        case 'http':
          await this.startHTTPStream(options)
          break
        case 'webrtc':
          await this.startWebRTCStream(options)
          break
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }
    } catch (error) {
      this.handleError(error as Error, options)
    }
  }

  /**
   * Start RTSP stream via backend proxy
   */
  private async startRTSPStream(options: StreamOptions): Promise<void> {
    if (!this.videoElement) return

    this.updateStatus({ 
      isConnected: false, 
      format: 'rtsp', 
      retryCount: 0 
    })

    // Build stream URL with authentication
    let streamUrl = options.url
    if (options.username && options.password) {
      const url = new URL(options.url)
      url.username = options.username
      url.password = options.password
      streamUrl = url.toString()
    }

    // Start backend stream conversion
    const response = await fetch('/api/stream/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Camera ${Date.now()}`,
        url: streamUrl,
        transport: options.transport || 'auto',
        timeout: options.timeout || 10000,
        quality: options.quality || 'medium'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Failed to start RTSP stream')
    }

    const streamData = await response.json()
    
    // Use HLS for RTSP streams
    await this.startHLSStream({
      ...options,
      url: `/api${streamData.streamUrl}`,
      format: 'hls'
    })
  }

  /**
   * Start HLS stream
   */
  private async startHLSStream(options: StreamOptions): Promise<void> {
    if (!this.videoElement) return

    // Dynamic import to avoid SSR issues
    try {
      const HlsModule = await import('hls.js')
      const HlsConstructor = HlsModule.default || HlsModule
      
      if (HlsConstructor.isSupported()) {
        const hls = new HlsConstructor({
          enableWorker: true,
          lowLatencyMode: options.latency === 'low',
          backBufferLength: 90,
          maxBufferLength: options.latency === 'low' ? 6 : 30,
          maxMaxBufferLength: options.latency === 'low' ? 12 : 600,
          startLevel: -1,
          autoStartLoad: true,
          debug: false
        })

        hls.loadSource(options.url)
        hls.attachMedia(this.videoElement)
        
        hls.on(HlsConstructor.Events.MANIFEST_PARSED, () => {
          this.videoElement!.play().catch(err => {
            console.warn('Autoplay failed:', err)
          })
          this.updateStatus({ 
            isConnected: true, 
            format: 'hls', 
            retryCount: 0 
          })
          this.startLatencyMeasurement()
        })

        hls.on(HlsConstructor.Events.ERROR, (_event: any, data: any) => {
          console.error('HLS error:', data)
          if (data.fatal) {
            this.handleError(new Error(data.details || 'HLS streaming error'), options)
          }
        })

        this.streamSource = hls
      } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        this.videoElement.src = options.url
        
        this.videoElement.onloadedmetadata = async () => {
          await this.videoElement!.play().catch(err => {
            console.warn('Autoplay failed:', err)
          })
          this.updateStatus({ 
            isConnected: true, 
            format: 'hls', 
            retryCount: 0 
          })
          this.startLatencyMeasurement()
        }
      } else {
        throw new Error('HLS not supported in this browser')
      }
    } catch (error) {
      console.error('HLS.js import error:', error)
      throw new Error('HLS.js library not available')
    }
  }

  /**
   * Start MJPEG stream
   */
  private async startMJPEGStream(options: StreamOptions): Promise<void> {
    if (!this.videoElement) return

    // MJPEG streams are typically served as single images that refresh
    // We'll use a canvas-based approach for better performance
    await this.startHTTPImageStream(options)
  }

  /**
   * Start HTTP stream (direct video or image)
   */
  private async startHTTPStream(options: StreamOptions): Promise<void> {
    if (!this.videoElement) return

    // Check if it's an image stream (MJPEG) or video stream
    if (options.url.includes('.mjpg') || options.url.includes('mjpeg') || options.url.includes('/video')) {
      await this.startHTTPImageStream(options)
    } else {
      await this.startHTTPVideoStream(options)
    }
  }

  /**
   * Start HTTP video stream
   */
  private async startHTTPVideoStream(options: StreamOptions): Promise<void> {
    if (!this.videoElement) return

    this.videoElement.src = options.url
    this.videoElement.crossOrigin = 'anonymous'
    
    this.videoElement.onloadedmetadata = async () => {
      await this.videoElement!.play().catch(err => {
        console.warn('Autoplay failed:', err)
      })
      this.updateStatus({ 
        isConnected: true, 
        format: 'http', 
        retryCount: 0 
      })
      this.startLatencyMeasurement()
    }

    this.videoElement.onerror = (e) => {
      this.handleError(new Error('Failed to load HTTP video stream'), options)
    }
  }

  /**
   * Start HTTP image stream (MJPEG)
   */
  private async startHTTPImageStream(options: StreamOptions): Promise<void> {
    if (!this.videoElement) return

    // For MJPEG streams, we'll use a canvas-based approach
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    const updateFrame = async () => {
      try {
        const response = await fetch(options.url, {
          headers: options.username && options.password ? {
            'Authorization': 'Basic ' + btoa(`${options.username}:${options.password}`)
          } : {}
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)
        
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = imageUrl
        })

        // Set canvas size to match video element
        canvas.width = this.videoElement!.videoWidth || 640
        canvas.height = this.videoElement!.videoHeight || 480

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Convert canvas to video frame
        const stream = canvas.captureStream(30) // 30 FPS
        this.videoElement!.srcObject = stream
        
        await this.videoElement!.play().catch(err => {
          console.warn('Autoplay failed:', err)
        })

        this.updateStatus({ 
          isConnected: true, 
          format: 'mjpeg', 
          retryCount: 0 
        })

        URL.revokeObjectURL(imageUrl)
        
        // Schedule next frame update
        setTimeout(updateFrame, 100) // 10 FPS for MJPEG
        
      } catch (error) {
        this.handleError(error as Error, options)
      }
    }

    updateFrame()
  }

  /**
   * Start WebRTC stream
   */
  private async startWebRTCStream(options: StreamOptions): Promise<void> {
    if (!this.videoElement) return

    // WebRTC implementation would require a signaling server
    // For now, we'll throw an error as it's not implemented
    throw new Error('WebRTC streaming not yet implemented')
  }

  /**
   * Handle streaming errors with retry logic
   */
  private handleError(error: Error, options: StreamOptions): void {
    console.error('Stream error:', error)
    
    const retryCount = (this.currentOptions?.retries || 3) - (options.retries || 3)
    
    this.updateStatus({ 
      isConnected: false, 
      format: options.format || 'unknown', 
      error: error.message,
      retryCount 
    })

    if (retryCount < (this.currentOptions?.retries || 3)) {
      // Retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
      this.retryTimeout = setTimeout(() => {
        console.log(`Retrying stream (attempt ${retryCount + 1})`)
        this.startStream({
          ...options,
          retries: (options.retries || 3) - 1
        })
      }, delay)
    }
  }

  /**
   * Update status and notify callback
   */
  private updateStatus(status: Partial<StreamStatus>): void {
    const currentStatus: StreamStatus = {
      isConnected: false,
      format: 'unknown',
      retryCount: 0,
      ...status
    }
    
    if (this.statusCallback) {
      this.statusCallback(currentStatus)
    }
  }

  /**
   * Start latency measurement
   */
  private startLatencyMeasurement(): void {
    if (!this.videoElement) return

    const startTime = Date.now()
    
    this.latencyTimer = setInterval(() => {
      if (this.videoElement && this.videoElement.readyState >= 2) {
        const latency = Date.now() - startTime
        this.updateStatus({ latency })
        this.clearLatencyTimer()
      }
    }, 100)
  }

  /**
   * Clear retry timeout
   */
  private clearRetryTimeout(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
  }

  /**
   * Clear latency timer
   */
  private clearLatencyTimer(): void {
    if (this.latencyTimer) {
      clearInterval(this.latencyTimer)
      this.latencyTimer = null
    }
  }

  /**
   * Get current stream status
   */
  getStatus(): StreamStatus {
    return {
      isConnected: !!this.streamSource,
      format: 'unknown',
      retryCount: 0
    }
  }

  /**
   * Test connection to stream URL
   */
  async testConnection(url: string, options: Partial<StreamOptions> = {}): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), options.timeout || 5000)

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: options.username && options.password ? {
          'Authorization': 'Basic ' + btoa(`${options.username}:${options.password}`)
        } : {}
      })

      clearTimeout(timeout)
      return response.ok
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const streamManager = new StreamManager()

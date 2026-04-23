/**
 * Stream Testing Utility - Test enhanced streaming with problematic URLs
 */

import { streamManager, StreamOptions } from './stream-manager'

export interface TestResult {
  url: string
  format: string
  success: boolean
  error?: string
  latency?: number
  retryCount: number
}

export class StreamTester {
  private testVideo: HTMLVideoElement | null = null

  constructor() {
    // Create hidden video element for testing
    this.testVideo = document.createElement('video')
    this.testVideo.style.display = 'none'
    this.testVideo.muted = true
    this.testVideo.playsInline = true
    document.body.appendChild(this.testVideo)
  }

  /**
   * Test the problematic camera URLs from the original error
   */
  async testProblematicURLs(): Promise<TestResult[]> {
    const testCases = [
      {
        url: 'rtsp://admin:admin@10.141.38.247:554/cam/realmonitor?channel=1&subtype=0',
        format: 'rtsp' as const,
        description: 'Original failing URL with admin:admin'
      },
      {
        url: 'rtsp://admin:Anand123@10.141.38.247:554/cam/realmonitor?channel=1&subtype=0',
        format: 'rtsp' as const,
        description: 'Original failing URL with admin:Anand123'
      },
      {
        url: 'rtsp://admin:admin@10.141.38.247:554/cam/realmonitor?channel=1&subtype=0',
        format: 'rtsp' as const,
        description: 'TCP transport test',
        transport: 'tcp' as const
      },
      {
        url: 'rtsp://admin:admin@10.141.38.247:554/cam/realmonitor?channel=1&subtype=0',
        format: 'rtsp' as const,
        description: 'UDP transport test',
        transport: 'udp' as const
      },
      {
        url: 'test://mock-stream',
        format: 'rtsp' as const,
        description: 'Mock stream test'
      }
    ]

    const results: TestResult[] = []

    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.description}`)
      
      const result = await this.testSingleURL({
        url: testCase.url,
        format: testCase.format,
        transport: testCase.transport,
        timeout: 15000,
        retries: 2,
        quality: 'medium',
        latency: 'normal'
      })

      results.push({
        ...result,
        url: testCase.url,
        format: testCase.format
      })

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return results
  }

  /**
   * Test a single URL configuration
   */
  async testSingleURL(options: StreamOptions): Promise<Omit<TestResult, 'url' | 'format'>> {
    if (!this.testVideo) {
      throw new Error('Test video element not available')
    }

    return new Promise((resolve) => {
      let resolved = false
      const startTime = Date.now()

      const cleanup = () => {
        if (!resolved) {
          resolved = true
          streamManager.detach()
        }
      }

      // Set up status monitoring
      streamManager.onStatusChange((status) => {
        if (resolved) return

        if (status.isConnected) {
          const latency = Date.now() - startTime
          cleanup()
          resolve({
            success: true,
            latency,
            retryCount: status.retryCount
          })
        } else if (status.error) {
          cleanup()
          resolve({
            success: false,
            error: status.error,
            retryCount: status.retryCount
          })
        }
      })

      // Set timeout for test
      const timeout = setTimeout(() => {
        if (!resolved) {
          cleanup()
          resolve({
            success: false,
            error: 'Test timeout',
            retryCount: 0
          })
        }
      }, options.timeout || 10000)

      // Start the test
      if (this.testVideo) {
        streamManager.attach(this.testVideo, options).then(() => {
          // Test started successfully
        }).catch((error) => {
          clearTimeout(timeout)
          if (!resolved) {
            cleanup()
            resolve({
              success: false,
              error: error.message,
              retryCount: 0
            })
          }
        })
      } else {
        clearTimeout(timeout)
        if (!resolved) {
          cleanup()
          resolve({
            success: false,
            error: 'Test video element not available',
            retryCount: 0
          })
        }
      }
    })
  }

  /**
   * Test connection without starting stream
   */
  async testConnection(url: string, options: Partial<StreamOptions> = {}): Promise<boolean> {
    try {
      return await streamManager.testConnection(url, options)
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  /**
   * Cleanup test resources
   */
  destroy(): void {
    if (this.testVideo) {
      streamManager.detach()
      this.testVideo.remove()
      this.testVideo = null
    }
  }
}

// Export singleton instance
export const streamTester = new StreamTester()

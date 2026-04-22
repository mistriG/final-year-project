'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { Camera, CameraOff, Loader2, CheckCircle, AlertCircle, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiUrl } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
  studentId: string
}

interface FaceRegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student
  onSuccess: () => void
  selectedDeviceId?: string
  networkCameras?: Array<{ id: string; name: string; url: string }>
}

// Desired face size as percentage of frame height (45% of frame for registration)
const DESIRED_FACE_HEIGHT_RATIO = 0.45
// Minimum and maximum zoom levels
const MIN_ZOOM = 1.0
const MAX_ZOOM = 4.0
// Smoothing factor for zoom/pan transitions
const SMOOTHING_FACTOR = 0.12

export function FaceRegistrationDialog({ 
  open, 
  onOpenChange, 
  student, 
  onSuccess,
  selectedDeviceId,
  networkCameras = []
}: FaceRegistrationDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Auto-zoom and centering state
  const [currentZoom, setCurrentZoom] = useState(1.0)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const targetZoomRef = useRef(1.0)
  const targetPanRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number | null>(null)

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model'
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        
        setIsModelLoaded(true)
      } catch (err) {
        console.error('Failed to load face-api models:', err)
      }
    }
    
    if (open && !isModelLoaded) {
      loadModels()
    }
  }, [open, isModelLoaded])

  // Smooth animation loop for zoom/pan
  useEffect(() => {
    if (!open) return
    
    const animate = () => {
      setCurrentZoom(prev => {
        const diff = targetZoomRef.current - prev
        if (Math.abs(diff) < 0.01) return targetZoomRef.current
        return prev + diff * SMOOTHING_FACTOR
      })
      
      setPanOffset(prev => {
        const diffX = targetPanRef.current.x - prev.x
        const diffY = targetPanRef.current.y - prev.y
        if (Math.abs(diffX) < 1 && Math.abs(diffY) < 1) {
          return targetPanRef.current
        }
        return {
          x: prev.x + diffX * SMOOTHING_FACTOR,
          y: prev.y + diffY * SMOOTHING_FACTOR,
        }
      })
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [open])

  // Calculate zoom and pan based on face detection
  const updateZoomAndPan = useCallback((faceBox: { x: number; y: number; width: number; height: number } | null, videoWidth: number, videoHeight: number) => {
    if (!faceBox) {
      targetZoomRef.current = 1.0
      targetPanRef.current = { x: 0, y: 0 }
      return
    }

    const faceCenterX = faceBox.x + faceBox.width / 2
    const faceCenterY = faceBox.y + faceBox.height / 2

    const currentFaceRatio = faceBox.height / videoHeight
    let desiredZoom = DESIRED_FACE_HEIGHT_RATIO / currentFaceRatio
    desiredZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, desiredZoom))
    
    const zoomedWidth = videoWidth / desiredZoom
    const zoomedHeight = videoHeight / desiredZoom
    
    let panX = faceCenterX - videoWidth / 2
    let panY = faceCenterY - videoHeight / 2
    
    const maxPanX = (videoWidth - zoomedWidth) / 2 * desiredZoom
    const maxPanY = (videoHeight - zoomedHeight) / 2 * desiredZoom
    
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX))
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY))

    targetZoomRef.current = desiredZoom
    targetPanRef.current = { x: panX, y: panY }
  }, [])

  // Start webcam or network camera when dialog opens
  const startCamera = useCallback(async () => {
    try {
      // Check if it's a network camera
      const networkCam = networkCameras.find(cam => cam.id === selectedDeviceId)
      
      if (networkCam) {
        // Handle network camera stream
        if (videoRef.current) {
          // Clear any existing webcam stream first
          videoRef.current.srcObject = null
          
          videoRef.current.src = networkCam.url
          videoRef.current.onloadedmetadata = async () => {
            await videoRef.current!.play()
            setIsVideoReady(true)
          }
          
          videoRef.current.onerror = () => {
            console.error('Failed to load network camera stream')
            toast.error('Failed to load network camera')
          }
        }
      } else {
        // Handle local USB/webcam device
        let constraints: MediaStreamConstraints = {
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        }
        
        // Try with specific device ID first if provided
        if (selectedDeviceId && !selectedDeviceId.startsWith('network_')) {
          constraints.video = {
            ...constraints.video,
            deviceId: { exact: selectedDeviceId }
          }
        }
        
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          
          if (videoRef.current) {
            // Clear any existing network camera src
            videoRef.current.src = ''
            videoRef.current.srcObject = stream
            await videoRef.current.play()
            setIsVideoReady(true)
          }
        } catch (err: any) {
          // If OverconstrainedError or device not found, try without exact device ID
          if (err.name === 'OverconstrainedError' || err.name === 'NotFoundError') {
            console.warn('Device constraint failed, trying without device ID:', err)
            
            // Retry with relaxed constraints
            const fallbackConstraints: MediaStreamConstraints = {
              video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            }
            
            const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
            
            if (videoRef.current) {
              // Clear any existing network camera src
              videoRef.current.src = ''
              videoRef.current.srcObject = stream
              await videoRef.current.play()
              setIsVideoReady(true)
            }
          } else {
            throw err
          }
        }
      }
    } catch (err) {
      console.error('Failed to start camera:', err)
      toast.error('Camera access denied')
    }
  }, [selectedDeviceId, networkCameras])

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsVideoReady(false)
    setFaceDetected(false)
    setCapturedDescriptor(null)
    setCurrentZoom(1.0)
    setPanOffset({ x: 0, y: 0 })
    targetZoomRef.current = 1.0
    targetPanRef.current = { x: 0, y: 0 }
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  // Handle dialog open/close
  useEffect(() => {
    if (open && isModelLoaded) {
      startCamera()
    } else {
      stopCamera()
    }
  }, [open, isModelLoaded, startCamera, stopCamera])

  // Detect faces continuously
  useEffect(() => {
    if (!isVideoReady || !isModelLoaded || capturedDescriptor) {
      return
    }

    const detectFace = async () => {
      if (!videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const displaySize = { width: video.videoWidth, height: video.videoHeight }
      
      faceapi.matchDimensions(canvas, displaySize)

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }

        if (detection) {
          setFaceDetected(true)
          const resized = faceapi.resizeResults(detection, displaySize)
          const box = resized.detection.box
          
          // Update zoom and pan
          updateZoomAndPan({
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
          }, video.videoWidth, video.videoHeight)
          
          if (ctx) {
            ctx.strokeStyle = '#22c55e'
            ctx.lineWidth = 3
            ctx.strokeRect(box.x, box.y, box.width, box.height)
          }
        } else {
          setFaceDetected(false)
          updateZoomAndPan(null, video.videoWidth, video.videoHeight)
        }
      } catch (err) {
        console.error('Detection error:', err)
      }
    }

    detectionIntervalRef.current = setInterval(detectFace, 200)

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [isVideoReady, isModelLoaded, capturedDescriptor, updateZoomAndPan])

  // Capture face
  const captureFace = async () => {
    if (!videoRef.current || !isModelLoaded) return

    setIsCapturing(true)

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        toast.error('No face detected. Please look at the camera.')
        setIsCapturing(false)
        return
      }

      setCapturedDescriptor(detection.descriptor)
      
      // Draw green checkmark on canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          const resized = faceapi.resizeResults(detection, {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight
          })
          ctx.strokeStyle = '#22c55e'
          ctx.lineWidth = 4
          const box = resized.detection.box
          ctx.strokeRect(box.x, box.y, box.width, box.height)
        }
      }

      toast.success('Face captured successfully!')
    } catch (err) {
      console.error('Capture error:', err)
      toast.error('Failed to capture face')
    } finally {
      setIsCapturing(false)
    }
  }

  // Register face
  const registerFace = async () => {
    if (!capturedDescriptor) return

    setIsRegistering(true)

    try {
      const response = await fetch(apiUrl(`/students/${student.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceDescriptor: Array.from(capturedDescriptor)
        })
      })

      if (response.ok) {
        toast.success(`Face registered for ${student.name}`)
        onSuccess()
      } else {
        toast.error('Failed to register face')
      }
    } catch (err) {
      console.error('Registration error:', err)
      toast.error('Failed to register face')
    } finally {
      setIsRegistering(false)
    }
  }

  // Reset capture
  const resetCapture = () => {
    setCapturedDescriptor(null)
    setFaceDetected(false)
  }

  // Transform style for zoom and pan
  const transformStyle = {
    transform: `scale(${currentZoom}) translate(${-panOffset.x / currentZoom}px, ${-panOffset.y / currentZoom}px)`,
    transformOrigin: 'center center',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register Face</DialogTitle>
          <DialogDescription>
            Capture face data for {student.name} ({student.studentId})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Preview */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
            <video
              ref={videoRef}
              className="absolute inset-0 size-full object-cover"
              style={isVideoReady && !capturedDescriptor ? transformStyle : undefined}
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 size-full"
              style={isVideoReady && !capturedDescriptor ? transformStyle : undefined}
            />

            {/* Center guide frame */}
            {isVideoReady && !capturedDescriptor && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative size-[70%]">
                  {/* Oval face guide */}
                  <div className="absolute inset-[10%] rounded-[50%] border-2 border-dashed border-white/40" />
                  {/* Corner markers */}
                  <div className="absolute left-0 top-0 size-5 border-l-2 border-t-2 border-white/60" />
                  <div className="absolute right-0 top-0 size-5 border-r-2 border-t-2 border-white/60" />
                  <div className="absolute bottom-0 left-0 size-5 border-b-2 border-l-2 border-white/60" />
                  <div className="absolute bottom-0 right-0 size-5 border-b-2 border-r-2 border-white/60" />
                </div>
              </div>
            )}

            {!isVideoReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                {isModelLoaded ? (
                  <>
                    <CameraOff className="size-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Starting camera...</p>
                  </>
                ) : (
                  <>
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading face detection models...</p>
                  </>
                )}
              </div>
            )}

            {/* Zoom indicator */}
            {isVideoReady && !capturedDescriptor && currentZoom > 1.05 && (
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                <ZoomIn className="size-3" />
                {currentZoom.toFixed(1)}x
              </div>
            )}

            {/* Status indicator */}
            {isVideoReady && !capturedDescriptor && (
              <div className={`absolute bottom-3 left-3 flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                faceDetected 
                  ? 'bg-success text-success-foreground' 
                  : 'bg-destructive text-destructive-foreground'
              }`}>
                {faceDetected ? (
                  <>
                    <CheckCircle className="size-4" />
                    Face Detected
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-4" />
                    No Face
                  </>
                )}
              </div>
            )}

            {capturedDescriptor && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-success px-3 py-1 text-sm font-medium text-success-foreground">
                <CheckCircle className="size-4" />
                Face Captured
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-1">
              <li>Position your face clearly in the frame</li>
              <li>Camera will auto-zoom to center your face</li>
              <li>Ensure good lighting conditions</li>
              <li>Look directly at the camera</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          {!capturedDescriptor ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={captureFace} 
                disabled={!isVideoReady || !faceDetected || isCapturing}
                className="gap-2"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="size-4" />
                    Capture Face
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={resetCapture}>
                Retake
              </Button>
              <Button 
                onClick={registerFace} 
                disabled={isRegistering}
                className="gap-2 bg-success text-success-foreground hover:bg-success/90"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-4" />
                    Register Face
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

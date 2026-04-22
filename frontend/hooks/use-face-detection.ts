'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { apiUrl } from '@/lib/api'
import Hls from 'hls.js'

interface DetectedFace {
  id: string
  name: string
  confidence: number
  box: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface Student {
  id: string
  name: string
  studentId: string
  department: string
  faceDescriptor: number[] | null
}

interface NetworkCamera {
  id: string
  name: string
  url: string
}

// Desired face size as percentage of frame height (40% of frame)
const DESIRED_FACE_HEIGHT_RATIO = 0.4
// Minimum and maximum zoom levels
const MIN_ZOOM = 1.0
const MAX_ZOOM = 4.0
// Smoothing factor for zoom/pan transitions (lower = smoother)
const SMOOTHING_FACTOR = 0.15

export function useFaceDetection(networkCameras: NetworkCamera[] = []) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([])
  const [error, setError] = useState<string | null>(null)
  const [registeredStudents, setRegisteredStudents] = useState<Student[]>([])
  const [labeledDescriptors, setLabeledDescriptors] = useState<faceapi.LabeledFaceDescriptors[] | null>(null)
  
  // Camera device selection
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  
  // Network cameras (RTSP, HTTP, etc.)
  const networkCameraRef = useRef<NetworkCamera | null>(null)
  
  // Auto-zoom and centering state
  const [currentZoom, setCurrentZoom] = useState(1.0)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const targetZoomRef = useRef(1.0)
  const targetPanRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number | null>(null)
  
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
        setError('Failed to load face detection models')
      }
    }
    
    loadModels()
  }, [])

  // Enumerate available video devices
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        setVideoDevices(videoDevices)
        
        // Set default device (prefer back camera if available, otherwise first device)
        if (videoDevices.length > 0) {
          const defaultDevice = videoDevices.find(d => d.label.toLowerCase().includes('back')) || videoDevices[0]
          if (defaultDevice.deviceId && defaultDevice.deviceId !== '') {
            setSelectedDeviceId(defaultDevice.deviceId)
          }
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err)
      }
    }

    enumerateDevices()

    // Re-enumerate devices when devices change
    navigator.mediaDevices.ondevicechange = () => {
      enumerateDevices()
    }

    return () => {
      navigator.mediaDevices.ondevicechange = null
    }
  }, [])

  // Smooth animation loop for zoom/pan
  useEffect(() => {
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
  }, [])

  // Calculate zoom and pan based on face detection
  const updateZoomAndPan = useCallback((faceBox: { x: number; y: number; width: number; height: number } | null, videoWidth: number, videoHeight: number) => {
    if (!faceBox) {
      // No face detected - smoothly reset to default
      targetZoomRef.current = 1.0
      targetPanRef.current = { x: 0, y: 0 }
      return
    }

    // Calculate face center
    const faceCenterX = faceBox.x + faceBox.width / 2
    const faceCenterY = faceBox.y + faceBox.height / 2

    // Calculate desired zoom based on face size
    // We want the face to occupy DESIRED_FACE_HEIGHT_RATIO of the frame
    const currentFaceRatio = faceBox.height / videoHeight
    let desiredZoom = DESIRED_FACE_HEIGHT_RATIO / currentFaceRatio
    
    // Clamp zoom to reasonable bounds
    desiredZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, desiredZoom))
    
    // Calculate pan offset to center the face
    // The offset needed to center the face in the zoomed view
    const zoomedWidth = videoWidth / desiredZoom
    const zoomedHeight = videoHeight / desiredZoom
    
    // Calculate where the face center should be relative to the visible area
    let panX = faceCenterX - videoWidth / 2
    let panY = faceCenterY - videoHeight / 2
    
    // Clamp pan to keep within bounds
    const maxPanX = (videoWidth - zoomedWidth) / 2 * desiredZoom
    const maxPanY = (videoHeight - zoomedHeight) / 2 * desiredZoom
    
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX))
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY))

    targetZoomRef.current = desiredZoom
    targetPanRef.current = { x: panX, y: panY }
  }, [])

  // Fetch registered students with face descriptors
  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/students'))
      const data = await response.json()
      setRegisteredStudents(data.students || [])
      
      // Create labeled descriptors for students with face data
      const studentsWithDescriptors = data.students.filter(
        (s: Student) => s.faceDescriptor && s.faceDescriptor.length > 0
      )
      
      if (studentsWithDescriptors.length > 0) {
        const descriptors = studentsWithDescriptors.map((student: Student) => {
          const descriptor = new Float32Array(student.faceDescriptor!)
          return new faceapi.LabeledFaceDescriptors(
            `${student.id}|${student.name}`,
            [descriptor]
          )
        })
        setLabeledDescriptors(descriptors)
      }
    } catch (err) {
      console.error('Failed to fetch students:', err)
    }
  }, [])

  useEffect(() => {
    if (isModelLoaded) {
      fetchStudents()
    }
  }, [isModelLoaded, fetchStudents])

  // Start webcam or network camera
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      // Check if it's a network camera
      const networkCam = networkCameras.find(cam => cam.id === deviceId)
      
      if (networkCam) {
        // Handle network camera stream using backend streaming service
        if (videoRef.current) {
          // Clear any existing webcam stream first
          videoRef.current.srcObject = null
          
          try {
            // Start stream via backend
            const response = await fetch(apiUrl('/stream/start'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: networkCam.name,
                url: networkCam.url
              })
            })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              const errorMsg = errorData.detail || 'Failed to start stream'
              throw new Error(errorMsg)
            }
            
            const streamData = await response.json()
            const streamUrl = apiUrl(streamData.streamUrl)
            
            // Use HLS.js for HLS streaming
            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
              })
              
              hls.loadSource(streamUrl)
              hls.attachMedia(videoRef.current)
              
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('Network camera loaded successfully:', networkCam.name)
                videoRef.current!.play()
                setIsVideoReady(true)
                setError(null)
                networkCameraRef.current = networkCam
              })
              
              hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data)
                const errorMsg = data.details || 'Unknown HLS error'
                setError(`Failed to load ${networkCam.name}: ${errorMsg}. Check camera connection and RTSP URL.`)
              })
              
              // Store HLS instance for cleanup
              ;(videoRef.current as any).hlsInstance = hls
              
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
              // Native HLS support (Safari)
              videoRef.current.src = streamUrl
              
              videoRef.current.onloadedmetadata = async () => {
                console.log('Network camera loaded successfully:', networkCam.name)
                await videoRef.current!.play()
                setIsVideoReady(true)
                setError(null)
                networkCameraRef.current = networkCam
              }
            } else {
              throw new Error('HLS not supported in this browser')
            }
            
            videoRef.current.onerror = (e) => {
              console.error('Failed to load network camera stream:', streamUrl, e)
              setError(`Failed to load ${networkCam.name}. Please check your camera connection and URL.`)
            }
            
          } catch (error) {
            console.error('Failed to start network stream:', error)
            setError(`Failed to start stream for ${networkCam.name}. Please check the camera URL and connection.`)
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
        if (deviceId && typeof deviceId === 'string' && !deviceId.startsWith('network_')) {
          constraints.video = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            deviceId: { exact: deviceId }
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
            setError(null)
            networkCameraRef.current = null
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
              setError(null)
              networkCameraRef.current = null
            }
          } else {
            throw err
          }
        }
      }
    } catch (err) {
      console.error('Failed to start camera:', err)
      setError('Camera access denied or no camera available. Please enable camera permissions.')
    }
  }, [networkCameras])

  // Stop webcam
  const stopCamera = useCallback(() => {
    // Clean up HLS instance if exists
    if (videoRef.current && (videoRef.current as any).hlsInstance) {
      const hls = (videoRef.current as any).hlsInstance
      hls.destroy()
      ;(videoRef.current as any).hlsInstance = null
    }
    
    // Clean up webcam stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    
    // Clear video source
    if (videoRef.current?.src) {
      videoRef.current.src = ''
      videoRef.current.load() // Reset the video element
    }
    
    setIsVideoReady(false)
    setIsDetecting(false)
    setDetectedFaces([])
    setCurrentZoom(1.0)
    setPanOffset({ x: 0, y: 0 })
    targetZoomRef.current = 1.0
    targetPanRef.current = { x: 0, y: 0 }
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }, [])

  // Detect faces
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded || !isVideoReady) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState !== 4) {
      return
    }
    
    const displaySize = { width: video.videoWidth, height: video.videoHeight }
    
    faceapi.matchDimensions(canvas, displaySize)

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors()

      const resizedDetections = faceapi.resizeResults(detections, displaySize)
      
      // Clear canvas
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }

      const faces: DetectedFace[] = []
      let primaryFaceBox: { x: number; y: number; width: number; height: number } | null = null
      let largestFaceArea = 0

      for (const detection of resizedDetections) {
        let name = 'Unknown'
        let matchId = ''
        let confidence = detection.detection.score

        // Try to match with registered students
        if (labeledDescriptors && labeledDescriptors.length > 0) {
          const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6)
          const match = faceMatcher.findBestMatch(detection.descriptor)
          
          if (match.label !== 'unknown') {
            const [id, studentName] = match.label.split('|')
            matchId = id
            name = studentName
            confidence = 1 - match.distance
          }
        }

        const box = detection.detection.box
        
        // Track the largest face for auto-zoom/centering
        const faceArea = box.width * box.height
        if (faceArea > largestFaceArea) {
          largestFaceArea = faceArea
          primaryFaceBox = {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
          }
        }
        
        faces.push({
          id: matchId || `unknown-${Math.random()}`,
          name,
          confidence,
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
          }
        })

        // Draw detection box (adjusted for zoom/pan will be handled in component)
        if (ctx) {
          const isRecognized = name !== 'Unknown'
          ctx.strokeStyle = isRecognized ? '#22c55e' : '#ef4444'
          ctx.lineWidth = 3
          ctx.strokeRect(box.x, box.y, box.width, box.height)
          
          // Draw label background
          ctx.fillStyle = isRecognized ? '#22c55e' : '#ef4444'
          const textHeight = 24
          ctx.fillRect(box.x, box.y - textHeight - 4, box.width, textHeight + 4)
          
          // Draw label text
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 14px sans-serif'
          ctx.fillText(
            `${name} (${Math.round(confidence * 100)}%)`,
            box.x + 4,
            box.y - 8
          )
        }
      }

      // Update zoom and pan based on primary face
      updateZoomAndPan(primaryFaceBox, video.videoWidth, video.videoHeight)

      setDetectedFaces(faces)
    } catch (err) {
      console.error('Face detection error:', err)
    }
  }, [isModelLoaded, isVideoReady, labeledDescriptors, updateZoomAndPan])

  // Start/stop detection loop
  const startDetection = useCallback(() => {
    if (!isModelLoaded || !isVideoReady) return
    
    setIsDetecting(true)
    
    // Run detection every 200ms
    detectionIntervalRef.current = setInterval(() => {
      detectFaces()
    }, 200)
  }, [isModelLoaded, isVideoReady, detectFaces])

  const stopDetection = useCallback(() => {
    setIsDetecting(false)
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    // Reset zoom and pan
    targetZoomRef.current = 1.0
    targetPanRef.current = { x: 0, y: 0 }
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
    setDetectedFaces([])
  }, [])

  // Register face for a student
  const registerFace = useCallback(async (studentId: string): Promise<boolean> => {
    if (!videoRef.current || !isModelLoaded) {
      return false
    }

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setError('No face detected. Please look at the camera.')
        return false
      }

      // Save descriptor to backend
      const response = await fetch(apiUrl(`/students/${studentId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceDescriptor: Array.from(detection.descriptor)
        })
      })

      if (response.ok) {
        // Refresh students list
        await fetchStudents()
        return true
      }
      
      return false
    } catch (err) {
      console.error('Failed to register face:', err)
      setError('Failed to register face')
      return false
    }
  }, [isModelLoaded, fetchStudents])

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    videoRef,
    canvasRef,
    isModelLoaded,
    isVideoReady,
    isDetecting,
    detectedFaces,
    error,
    registeredStudents,
    currentZoom,
    panOffset,
    videoDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    networkCameras,
    startCamera,
    stopCamera,
    startDetection,
    stopDetection,
    registerFace,
    refreshStudents: fetchStudents,
  }
}

'use client'

import { useEffect, useState } from 'react'
import { apiUrl } from '@/lib/api'
import { Camera, CameraOff, Scan, Square, Loader2, ZoomIn, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFaceDetection, NetworkCamera } from '@/hooks/use-face-detection'

interface CameraFeedProps {
  onFaceDetected?: (studentId: string, studentName: string) => void
}

export function CameraFeed({ onFaceDetected }: CameraFeedProps) {
  const [deviceChangeTriggered, setDeviceChangeTriggered] = useState(false)
  const [showAddCamera, setShowAddCamera] = useState(false)
  const [cameraName, setCameraName] = useState('')
  const [cameraUrl, setCameraUrl] = useState('')
  const [cameraUsername, setCameraUsername] = useState('')
  const [cameraPassword, setCameraPassword] = useState('')
  const [cameraTransport, setCameraTransport] = useState<'tcp' | 'udp' | 'auto'>('auto')
  const [cameraFormat, setCameraFormat] = useState<'auto' | 'rtsp' | 'http' | 'hls' | 'mjpeg'>('auto')
  const [networkCameras, setNetworkCameras] = useState<NetworkCamera[]>([])
  const {
    videoRef,
    canvasRef,
    isModelLoaded,
    isVideoReady,
    isDetecting,
    detectedFaces,
    error,
    currentZoom,
    panOffset,
    videoDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    startCamera,
    stopCamera,
    connectionStatus,
    streamStatus,
    startDetection,
    stopDetection,
  } = useFaceDetection(networkCameras)

  // Attendance time settings
  const [startTime, setStartTime] = useState('09:00')
  const [lateCutoff, setLateCutoff] = useState('09:00')
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(apiUrl('/settings'))
        if (res.ok) {
          const data = await res.json()
          if (data.startTime) setStartTime(data.startTime)
          if (data.lateCutoff) setLateCutoff(data.lateCutoff)
        }
      } catch (err) {
        // Backend may be temporarily unavailable during local startup.
        // Keep UI usable and avoid noisy runtime error overlays.
        console.warn('Could not load settings, using defaults')
      } finally {
        setSettingsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  const saveSettings = async () => {
    try {
      const res = await fetch(apiUrl('/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, lateCutoff })
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => 'error')
        alert('Failed to save settings: ' + txt)
        return
      }

      alert('Attendance times saved')
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings')
    }
  }

  // Load network cameras and selected device from localStorage
  useEffect(() => {
    const savedCameras = localStorage.getItem('networkCameras')
    if (savedCameras) {
      try {
        setNetworkCameras(JSON.parse(savedCameras))
      } catch (error) {
        console.error('Failed to parse saved network cameras:', error)
      }
    }

    const savedDeviceId = localStorage.getItem('selectedDeviceId')
    if (savedDeviceId) {
      setSelectedDeviceId(savedDeviceId)
    }
  }, [])

  // Handle device change
  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    localStorage.setItem('selectedDeviceId', deviceId)
    setDeviceChangeTriggered(true)
    
    // Stop current camera
    stopCamera()
    
    // Start camera with new device
    setTimeout(() => {
      startCamera(deviceId)
    }, 100)
  }

  // Handle add network camera
  const handleAddNetworkCamera = () => {
    if (cameraName.trim() && cameraUrl.trim()) {
      const newCamera: NetworkCamera = {
        id: `network_${Date.now()}`,
        name: cameraName,
        url: cameraUrl,
        username: cameraUsername.trim() || undefined,
        password: cameraPassword.trim() || undefined,
        transport: cameraTransport,
        format: cameraFormat === 'auto' ? undefined : cameraFormat,
        timeout: 10000,
        status: 'disconnected'
      }
      const updatedCameras = [...networkCameras, newCamera]
      setNetworkCameras(updatedCameras)
      localStorage.setItem('networkCameras', JSON.stringify(updatedCameras))
      setCameraName('')
      setCameraUrl('')
      setCameraUsername('')
      setCameraPassword('')
      setCameraTransport('auto')
      setCameraFormat('auto')
      setShowAddCamera(false)
      
      // Auto-select the new camera
      setTimeout(() => {
        handleDeviceChange(newCamera.id)
      }, 100)
    }
  }

  // Handle remove network camera
  const handleRemoveNetworkCamera = (id: string) => {
    const updatedCameras = networkCameras.filter(cam => cam.id !== id)
    setNetworkCameras(updatedCameras)
    localStorage.setItem('networkCameras', JSON.stringify(updatedCameras))
    if (selectedDeviceId === id) {
      const fallbackDevice = videoDevices.find(d => d.deviceId && d.deviceId !== '')
      setSelectedDeviceId(fallbackDevice?.deviceId || '')
    }
  }

  // Auto-mark attendance when a face is recognized
  useEffect(() => {
    const recognizedFaces = detectedFaces.filter(f => f.name !== 'Unknown')
    
    recognizedFaces.forEach(face => {
      if (onFaceDetected && face.confidence > 0.5) {
        onFaceDetected(face.id, face.name)
      }
    })
  }, [detectedFaces, onFaceDetected])

  const recognizedCount = detectedFaces.filter(f => f.name !== 'Unknown').length
  const unknownCount = detectedFaces.filter(f => f.name === 'Unknown').length

  // Transform style for zoom and pan
  const transformStyle = {
    transform: `scale(${currentZoom}) translate(${-panOffset.x / currentZoom}px, ${-panOffset.y / currentZoom}px)`,
    transformOrigin: 'center center',
    transition: 'none', // We handle smoothing in the hook
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-5 text-primary" />
              Live Camera Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              {!isModelLoaded && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading models...
                </span>
              )}
              {isDetecting && (
                <span className="flex items-center gap-2 text-sm">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  Detecting
                </span>
              )}
            </div>
          </div>
          
          {/* Camera Device Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Camera:</label>
            <Select value={selectedDeviceId} onValueChange={handleDeviceChange} disabled={isDetecting}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Local USB/Webcam cameras */}
                {videoDevices.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Local Cameras</div>
                    {videoDevices.filter(device => device.deviceId && device.deviceId !== '').map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                      </SelectItem>
                    ))}
                  </>
                )}
                
                {/* Network cameras */}
                {networkCameras.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Network Cameras</div>
                    {networkCameras.filter(cam => cam.id && cam.id !== '').map((cam) => (
                      <SelectItem key={cam.id} value={cam.id}>
                        {cam.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            
            {/* Add network camera button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAddCamera(true)}
              disabled={isDetecting}
              className="gap-1"
            >
              <Plus className="size-4" />
              CCTV
            </Button>

            {/* Remove network camera button */}
            {selectedDeviceId?.startsWith('network_') && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRemoveNetworkCamera(selectedDeviceId)}
                disabled={isDetecting}
                className="gap-1"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {/* Video element with zoom/pan transform */}
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            style={isDetecting ? transformStyle : undefined}
            playsInline
            muted
          />
          
          {/* Canvas overlay for drawings - also transformed */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 size-full"
            style={isDetecting ? transformStyle : undefined}
          />
          
          {/* Center guide frame - shows desired face position */}
          {isDetecting && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-[60%] max-h-[80%] max-w-[80%]">
                {/* Oval face guide */}
                <div className="absolute inset-[15%] rounded-[50%] border-2 border-dashed border-white/30" />
                {/* Corner markers */}
                <div className="absolute left-0 top-0 size-6 border-l-2 border-t-2 border-white/50" />
                <div className="absolute right-0 top-0 size-6 border-r-2 border-t-2 border-white/50" />
                <div className="absolute bottom-0 left-0 size-6 border-b-2 border-l-2 border-white/50" />
                <div className="absolute bottom-0 right-0 size-6 border-b-2 border-r-2 border-white/50" />
              </div>
            </div>
          )}
          
          {/* Placeholder when camera is off */}
          {!isVideoReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted">
              <CameraOff className="size-16 text-muted-foreground" />
              <p className="text-muted-foreground">Camera is off</p>
              {error && (
                <p className="max-w-xs text-center text-sm text-destructive">{error}</p>
              )}
            </div>
          )}

          {/* Zoom indicator */}
          {isDetecting && currentZoom > 1.05 && (
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white">
              <ZoomIn className="size-4" />
              {currentZoom.toFixed(1)}x
            </div>
          )}

          {/* Detection stats overlay */}
          {isDetecting && detectedFaces.length > 0 && (
            <div className="absolute bottom-4 left-4 flex gap-2">
              {recognizedCount > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-success px-3 py-1 text-sm font-medium text-success-foreground">
                  <span className="size-2 rounded-full bg-success-foreground" />
                  {recognizedCount} Recognized
                </div>
              )}
              {unknownCount > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground">
                  <span className="size-2 rounded-full bg-destructive-foreground" />
                  {unknownCount} Unknown
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 border-t p-4">
          <div className="flex items-center gap-2 mr-4">
            <label className="text-sm text-muted-foreground">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-8 rounded-md border px-2"
            />

            <label className="text-sm text-muted-foreground">Late</label>
            <input
              type="time"
              value={lateCutoff}
              onChange={(e) => setLateCutoff(e.target.value)}
              className="h-8 rounded-md border px-2"
            />

            <Button size="sm" variant="outline" onClick={saveSettings} className="ml-2">
              Save
            </Button>
          </div>

          {!isVideoReady ? (
            <Button 
              onClick={() => startCamera(selectedDeviceId)}
              disabled={!isModelLoaded}
              className="gap-2"
            >
              <Camera className="size-4" />
              Start Camera
            </Button>
          ) : (
            <>
              <Button 
                onClick={stopCamera} 
                variant="outline"
                className="gap-2"
              >
                <CameraOff className="size-4" />
                Stop Camera
              </Button>
              
              {!isDetecting ? (
                <Button 
                  onClick={startDetection}
                  className="gap-2 bg-success text-success-foreground hover:bg-success/90"
                >
                  <Scan className="size-4" />
                  Start Detection
                </Button>
              ) : (
                <Button 
                  onClick={stopDetection}
                  variant="destructive"
                  className="gap-2"
                >
                  <Square className="size-4" />
                  Stop Detection
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>

      {/* Add Network Camera Dialog */}
      <Dialog open={showAddCamera} onOpenChange={setShowAddCamera}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Network Camera</DialogTitle>
            <DialogDescription>
              Add an Imou CCTV or other network camera. The system supports direct streaming and automatic RTSP to HLS conversion for browser compatibility.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="camera-name">Camera Name</Label>
              <Input
                id="camera-name"
                placeholder="e.g., Imou CCTV Main"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="camera-format">Stream Format</Label>
              <Select value={cameraFormat} onValueChange={(value: 'auto' | 'rtsp' | 'http' | 'hls' | 'mjpeg') => setCameraFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="rtsp">RTSP (requires backend conversion)</SelectItem>
                  <SelectItem value="http">HTTP/MJPEG (direct)</SelectItem>
                  <SelectItem value="hls">HLS (direct)</SelectItem>
                  <SelectItem value="mjpeg">MJPEG (direct)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="camera-url">Stream URL</Label>
              <Input
                id="camera-url"
                placeholder={cameraFormat === 'rtsp' ? "rtsp://192.168.1.100:554/cam/realmonitor?channel=1&subtype=0" : 
                         cameraFormat === 'hls' ? "http://192.168.1.100/stream.m3u8" :
                         cameraFormat === 'mjpeg' ? "http://192.168.1.100/video.mjpg" :
                         "http://192.168.1.100/stream"}
                value={cameraUrl}
                onChange={(e) => setCameraUrl(e.target.value)}
              />
            </div>
            
            {(cameraFormat === 'rtsp' || cameraFormat === 'http') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="camera-username">Username (optional)</Label>
                  <Input
                    id="camera-username"
                    placeholder="admin"
                    value={cameraUsername}
                    onChange={(e) => setCameraUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="camera-password">Password (optional)</Label>
                  <Input
                    id="camera-password"
                    type="password"
                    placeholder="password"
                    value={cameraPassword}
                    onChange={(e) => setCameraPassword(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {cameraFormat === 'rtsp' && (
              <div>
                <Label htmlFor="camera-transport">Transport Protocol</Label>
                <Select value={cameraTransport} onValueChange={(value: 'tcp' | 'udp' | 'auto') => setCameraTransport(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (try TCP first, then UDP)</SelectItem>
                    <SelectItem value="tcp">TCP (more reliable)</SelectItem>
                    <SelectItem value="udp">UDP (lower latency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              <strong>Enhanced Streaming Features:</strong>
              <br />
              • <strong>Auto-retry:</strong> Automatically reconnects on connection failure
              <br />
              • <strong>Authentication:</strong> Built-in support for username/password
              <br />
              • <strong>Format detection:</strong> Automatically detects stream type
              <br />
              • <strong>Error recovery:</strong> VLC-like connection handling
              <br />
              <br />
              <strong>URL Examples:</strong>
              <br />
              • RTSP: rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0
              <br />
              • HTTP/MJPEG: http://192.168.1.100/video.mjpg
              <br />
              • HLS: http://192.168.1.100/stream.m3u8
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCamera(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNetworkCamera} disabled={!cameraName.trim() || !cameraUrl.trim()}>
              Add Camera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

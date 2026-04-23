const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const STREAMS_DIR = path.join(__dirname, 'streams')

function listSampleDirs() {
  try {
    return fs.readdirSync(STREAMS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(name => fs.existsSync(path.join(STREAMS_DIR, name, 'playlist.m3u8')))
  } catch (e) {
    return []
  }
}

const sampleDirs = listSampleDirs()
const streamConfigs = {} // streamId -> { name, url, sourceDir, playlistUrl, active }

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const parsed = new URL(req.url, `http://${req.headers.host}`)
  const pathname = parsed.pathname

  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ status: 'ok' }))
  }

  if (req.method === 'GET' && pathname === '/streams') {
    const arr = Object.keys(streamConfigs).map(id => {
      const c = streamConfigs[id]
      return { streamId: id, name: c.name, url: c.url, playlistUrl: c.playlistUrl, active: c.active }
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ streams: arr }))
  }

  if (req.method === 'POST' && pathname === '/stream/start') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}')
        const name = data.name || 'Camera'
        const url = data.url || ''
        const streamId = `stream_mock_${Date.now().toString(36)}`
        const sample = sampleDirs.length > 0 ? sampleDirs[Math.floor(Math.random() * sampleDirs.length)] : null
        const sourceDir = sample ? path.join(STREAMS_DIR, sample) : null
        const playlistUrl = `/streams/${streamId}/playlist.m3u8`
        streamConfigs[streamId] = { name, url, sourceDir, playlistUrl, active: !!sourceDir }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ streamId, streamUrl: playlistUrl, name }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ detail: 'invalid json' }))
      }
    })
    return
  }

  if (req.method === 'POST' && pathname.startsWith('/stream/stop/')) {
    const parts = pathname.split('/')
    const streamId = parts[3]
    if (!streamId || !streamConfigs[streamId]) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ detail: 'Stream not found' }))
      return
    }
    delete streamConfigs[streamId]
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'Stream stopped successfully' }))
    return
  }

  // Serve HLS files for configured streams
  const m = pathname.match(/^\/streams\/([^\/]+)\/(.+)$/)
  if (req.method === 'GET' && m) {
    const streamId = m[1]
    const fileName = decodeURIComponent(m[2])
    const cfg = streamConfigs[streamId]
    if (!cfg || !cfg.sourceDir) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ detail: 'Stream not found' }))
    }
    const filePath = path.join(cfg.sourceDir, fileName)
    if (!fs.existsSync(filePath)) {
      res.writeHead(404)
      return res.end('Not found')
    }
    const ext = path.extname(filePath)
    const contentType = ext === '.m3u8' ? 'application/vnd.apple.mpegurl' : ext === '.ts' ? 'video/MP2T' : 'application/octet-stream'
    const stat = fs.statSync(filePath)
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size })
    const rs = fs.createReadStream(filePath)
    rs.pipe(res)
    return
  }

  if (req.method === 'GET' && pathname === '/students') {
    const students = [
      { id: '1', name: 'Ahmed Hassan', studentId: 'STU001', department: 'Computer Science', email: 'ahmed.hassan@university.edu', enrolledAt: '2024-01-15', faceDescriptor: null },
      { id: '2', name: 'Sarah Johnson', studentId: 'STU002', department: 'Information Technology', email: 'sarah.johnson@university.edu', enrolledAt: '2024-01-16', faceDescriptor: null },
      { id: '3', name: 'Muhammad Ali', studentId: 'STU003', department: 'Computer Science', email: 'muhammad.ali@university.edu', enrolledAt: '2024-01-17', faceDescriptor: null },
      { id: '4', name: 'Emily Chen', studentId: 'STU004', department: 'Software Engineering', email: 'emily.chen@university.edu', enrolledAt: '2024-01-18', faceDescriptor: null },
      { id: '5', name: 'Omar Farooq', studentId: 'STU005', department: 'Computer Science', email: 'omar.farooq@university.edu', enrolledAt: '2024-01-19', faceDescriptor: null }
    ]
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ students }))
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ detail: 'Not found' }))
})

const port = process.env.PORT || 8000
server.listen(port, () => {
  console.log(`Mock backend listening on http://localhost:${port}`)
  console.log('Available sample stream dirs:', sampleDirs)
})

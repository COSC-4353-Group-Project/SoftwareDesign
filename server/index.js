import app from './app.js'

// The frontend (Vite, port 5173) forwards /api requests to this port. See vite.config.js.
// On Render, the host picks the port and passes it in as PORT.
const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`BribeSmart API running at http://localhost:${PORT}`)
})

import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import authRouter from './routes/auth.js'
import servicesRouter from './routes/services.js'
import queuesRouter from './routes/queues.js'
import historyRouter from './routes/history.js'
import notificationsRouter from './routes/notifications.js'
import userDashRouter from './routes/userDash.js'
import adminDashRouter from './routes/adminDash.js'

// Builds the Express app but does not start it. index.js starts it;
// the tests import it directly so Supertest can send it fake requests.
const app = express()

// Lets routes read JSON request bodies as req.body
app.use(express.json())

// Quick check that the server is up and not stalled :(
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// One line per module. when you add a new service, ADD IT HERE!!!
app.use('/api/auth', authRouter)
app.use('/api/services', servicesRouter)
app.use('/api/queues', queuesRouter)
//I honestly have no idea what I'm doing, kinda just copying whatcha got here Justin
app.use('/api/history', historyRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/userDash', userDashRouter)
app.use('/api/adminDash', adminDashRouter)

// Any /api path that didn't match a route above if they forgot to add it. 
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' })
})

// Hosting (Render): the same server also sends the built React pages from dist/
// (made by `npm run build`), so the site and the API share one URL.
// Locally and in tests dist/ usually doesn't exist, so this part is skipped.
const DIST = path.resolve('dist')
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  app.use(express.static(DIST))
  // page URLs like /dashboard aren't real files, so send index.html and let React Router show the page
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

// Anything else that didn't match
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' })
})

// Error handler. Express knows it is one because it takes 4 arguments. looked this up. 
app.use((err, req, res, _next) => {
  // The request body wasn't valid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' })
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

export default app

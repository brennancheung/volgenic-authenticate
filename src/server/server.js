const express = require('express')
const http = require('http')

const port = process.env.VG_AUTHENTICATION_PORT || 80

async function startServer () {
  const app = express()
  app.disable('x-powered-by')

  console.info('Starting server')
  const server = http.createServer(app)

  server.listen(port)
  console.info(`Server listening on port ${port}`)

  app.use((req, res, next) => {
    console.info(`${req.method} ${req.url}`)
    next()
  })

  app.get('/', (req, res) => {
    res.send('hello world')
  })

  return app
}

startServer()

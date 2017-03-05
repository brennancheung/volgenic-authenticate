const fs = require('fs')
const express = require('express')
const http = require('http')
const MongoClient = require('mongodb').MongoClient
const bodyParser = require('body-parser')

const mongoUrl = 'mongodb://mongo/authenticate'
const port = process.env.VG_AUTHENTICATION_PORT || 80

// This secret should be created before the microservice is started.
const secretPath = '/run/secrets/authenticate-secret-key'

console.log(`Loading secret from ${secretPath}`)
const secret = fs.readFileSync(secretPath, 'utf8');

if (!secret) {
  console.log('WARNING: Secret does not exist.')
  console.log('Usage:')
  console.log('  openssl rand -base64 20 | docker secret create authenticate-secret-key -')
  process.exit(1)
}

let server
let db

function dbConnect () {
  return new Promise((resolve, reject) => {
    MongoClient.connect(mongoUrl, (err, _db) => {
      if (err) {
        return reject(err)
      }
      db = _db
      console.info('Successfully connected to database')
      resolve(_db)
    })
  })
}

function truncate (collectionName) {
  return new Promise((resolve, reject) => {
    try {
      const collection = db.collection(collectionName)
      collection.drop((err, reply) => {
        // The mongodb client will throw an exception if the collection doesn't exist.
        // This is not really an error.  Just resolve normally.
        resolve()
      })
    } catch (err) {
      console.log(err)
    }
  })
}

function remove (collectionName, _id) {
  return new Promise((resolve, reject) => {
  })
}

function insert (collectionName, obj) {
  return new Promise((resolve, reject) => {
  })
}

function update (collectionName, _id) {
  return new Promise((resolve, reject) => {
  })
}

async function createIndexes () {
  // TODO: add indexes to make things faster
  return null
}

async function startServer () {
  try {
    const app = express()
    app.disable('x-powered-by')

    console.info('Starting server')
    server = http.createServer(app)

    server.listen(port)
    console.info(`Server listening on port ${port}`)

    console.info(`Connecting to database (${mongoUrl})`)
    await dbConnect()

    app.use(bodyParser.json())

    app.use((req, res, next) => {
      console.info(`${req.method} ${req.url}`)

      // perform the authentication
      const headerKey = req.headers && req.headers['x-authenticate-secret']
      if (headerKey) {
        next()
      } else {
        res.status(401).send('unauthorized')
      }
    })

    app.get('/tenants', (req, res) => {
      // TODO: send lists of tenants
      res.status(200).send({tenants: []})
    })

    app.post('/tenants', (req, res) => {
      // TODO: create the tenant
      if (false) {
        return res.status(409).send({error: 'tenant already exists'})
      }

      res.status(201).send({tenant: {_id: 123, name: 'foo'}})
    })

    app.put('/tenants/:id', (req, res) => {
      if (false) {
        return res.status(404).send({error: 'tenant not found'})
      }
      res.status(200).send({tenant: {_id: 123, name: 'foo'}})
    })

    app.put('/tenants/:id', (req, res) => {
      res.status(200).send({tenant: {_id: 123, name: 'foo'}})
    })

    return app
  } catch (err) {
    console.log(err)
  }
}

function stopServer () {
  try {
    console.info('Closing database connection')
    db.close()

    console.info('Stopping server')
    server.close()
  } catch (err) {
    console.log(err)
  }
}

async function cleanDb () {
  console.info('Cleaning database (dropping collections)')
  await truncate('users')
  await truncate('tenants')
}

module.exports = {
  startServer,
  stopServer,
  cleanDb
}

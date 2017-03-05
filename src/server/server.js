const fs = require('fs')
const express = require('express')
const http = require('http')
const MongoClient = require('mongodb').MongoClient

const mongoUrl = 'mongodb://mongo/authenticate'
const port = process.env.VG_AUTHENTICATION_PORT || 80

// This secret should be created before the microservice is started.
const secretPath = '/run/secrets/authenticate-root-password'

console.log(`Loading secret from ${secretPath}`)
const secret = fs.readFileSync(secretPath, 'utf8');

if (!secret) {
  console.log('WARNING: Secret does not exist.')
  console.log('Usage:')
  console.log('  openssl rand -base64 20 | docker secret create authenticate-root-password -')
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
    const collection = db.collection(collectionName)
    collection.drop((err, reply) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
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
    console.log('after')

    app.use((req, res, next) => {
      console.info(`${req.method} ${req.url}`)
      next()
    })

    app.get('/', (req, res) => {
      res.send('hello world')
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

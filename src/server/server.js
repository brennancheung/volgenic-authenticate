const fs = require('fs')
const express = require('express')
const http = require('http')
const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const jwt = require('jwt-simple')

const mongoUrl = 'mongodb://mongo/authenticate'
const port = process.env.VG_AUTHENTICATION_PORT || 80

// This secret should be created before the microservice is started.
const secretPath = '/run/secrets/authenticate-secret-key'

// console.log(`Loading secret from ${secretPath}`)
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

function insertOne (collectionName, obj) {
  return new Promise((resolve, reject) => {
    const collection = db.collection(collectionName)
    collection.insertOne(obj, (err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result.ops[0])
    })
  })
}

function find (collectionName, query) {
  return new Promise((resolve, reject) => {
    const collection = db.collection(collectionName)
    collection.find(query).toArray((err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result)
    })
  })
}

function findOne (collectionName, query) {
  return new Promise((resolve, reject) => {
    const collection = db.collection(collectionName)
    collection.findOne(query, (err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result)
    })
  })
}

function updateOne (collectionName, _id, updateParams) {
  return new Promise((resolve, reject) => {
    const collection = db.collection(collectionName)
    collection.updateOne({ _id: ObjectID(_id) }, { $set: updateParams }, (err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result)
    })
  })
}

function deleteOne(collectionName, filterQuery) {
  const collection = db.collection(collectionName)
  return new Promise((resolve, reject) => {
    collection.deleteOne(filterQuery, (err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result)
    })
  })
}

function sanitizeUser (params) {
  return objRemoveKeys(params, ['password', 'hashedPassword'])
}

async function createIndexes () {
  // TODO: add indexes to make things faster
  return null
}

function objOnly (obj, allowedKeys) {
  let newObj = {}

  allowedKeys.forEach(key => {
    newObj[key] = obj[key]
  })
  return newObj
}

function objRemoveKeys (obj, keys) {
  let newObj = {}

  Object.keys(obj)
    .filter(key => keys.indexOf(key) === -1)
    .forEach(key => {
      newObj[key] = obj[key]
    })
  return newObj
}

function hashPassword (password, bcryptRounds=8) {
  return new Promise( (resolve, reject) => {
    if (password === null || password === undefined) {
      return reject(new Error('password not specified'))
    }
    bcrypt.genSalt(bcryptRounds, (err, salt) => {
      if (err) throw err
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) throw err
        resolve(hash)
      })
    })
  })
}

function verifyPassword (password, hashedPassword) {
  return new Promise( async (resolve, reject) => {
    try {
      bcrypt.compare(password, hashedPassword, (err, res) => {
        if (err) { return reject(err) }
        if (!res) { return resolve(null) }
        return resolve(true)
      })
    } catch (err) {
      return resolve(false)
    }
  })
}

const objHasAllKeys = (obj, keys) => keys.every(key => obj[key] !== undefined)

async function createTenant (params) {
  const filteredParams = objOnly(params, ['name'])
  const response = await insertOne('tenants', filteredParams)
  return response
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
      // console.info(`${req.method} ${req.url}`)
      next()
    })


    // LIST TENANTS
    app.get('/tenants', async (req, res) => {
      // TODO: send lists of tenants
      const tenants = await find('tenants', {})
      res.status(200).send({ tenants })
    })


    // CREATE TENANT
    app.post('/tenants', async (req, res) => {
      const requiredParams = ['name']

      if (!objHasAllKeys(req.body, requiredParams)) {
        return res.status(400).send({ error: 'missing required params', requiredParams })
      }

      const findDuplicate = await findOne('tenants', { name: req.body.name })

      if (findDuplicate) {
        return res.status(409).send({error: 'tenant already exists'})
      }

      const newTenant = await createTenant({ name: req.body.name })

      if (newTenant) {
        res.status(201).send({tenant: newTenant})
      } else {
        res.status(500).send({ error: 'Unable to create tenant for unknown reason.' })
      }
    })


    // UPDATE TENANT
    app.put('/tenants/:id', async (req, res) => {
      const id = req.params.id
      if (!id || id.length !== 24) {
        return res.status(404).send({ error: 'invalid id' })
      }

      const tenant = await findOne('tenants', { _id: ObjectID(req.params.id) })

      if (!tenant) {
        return res.status(404).send({error: 'tenant not found'})
      }

      const updated = await updateOne('tenants', req.params.id, req.body)
      const updatedTenant = await findOne('tenants', { _id: ObjectID(req.params.id) })

      res.status(200).send({ tenant: updatedTenant })
    })


    // DELETE TENANT
    app.delete('/tenants/:id', async (req, res) => {
      const id = req.params.id
      if (!id || id.length !== 24) {
        return res.status(404).send({ error: 'invalid id' })
      }
      const tenant = await findOne('tenants', { _id: ObjectID(req.params.id) })
      if (!tenant) {
        return res.status(404).send({error: 'tenant not found'})
      }
      const deletedTenant = await deleteOne('tenants', { _id: ObjectID(req.params.id) })
      res.status(200).send({ status: 'success' })
    })


    // LIST USERS
    app.get('/users', async (req, res) => {
      const users = await find('users', {})
      const sanitizedUsers = users.map(sanitizeUser)
      res.status(200).send({ users: sanitizedUsers })
    })


    // CREATE USER
    app.post('/users', async (req, res) => {
      const requiredParams = ['tenantId', 'username', 'password']

      if (!objHasAllKeys(req.body, requiredParams)) {
        return res.status(400).send({ error: 'missing required params', requiredParams })
      }

      const tenantId = req.body.tenantId
      if (!tenantId || tenantId.length !== 24) {
        return res.status(404).send({ error: 'invalid tenantId' })
      }

      const params = {
        tenantId: ObjectID(tenantId),
        username: req.body.username,
        password: req.body.password
      }

      if (params.password.length < 6) {
        return res.status(400).send({ error: 'password must be at least 6 characters' })
      }

      const findDuplicate = await findOne('users', { tenantId: params.tenantId, username: params.username })
      if (findDuplicate) {
        return res.status(409).send({error: 'username already exists on that tenant'})
      }

      const userParams = {
        tenantId: params.tenantId,
        username: params.username,
        hashedPassword: await hashPassword(params.password)
      }

      const newUser = await insertOne('users', userParams)
      if (newUser) {
        res.status(201).send({ user: sanitizeUser(newUser) })
      } else {
        res.status(500).send({ error: 'Unable to create user for unknown reason.' })
      }
    })


    // UPDATE USER
    app.put('/users/:id', async (req, res) => {
      const id = req.params.id
      if (!id || id.length !== 24) {
        return res.status(404).send({ error: 'invalid id' })
      }

      const user = await findOne('users', { _id: ObjectID(req.params.id) })

      if (!user) {
        return res.status(404).send({error: 'user not found'})
      }

      let params = {
        username: req.body.username
      }

      if (req.body.password) {
        if (req.body.password.length < 6) {
          return res.status(400).send({ error: 'password must be at least 6 characters' })
        }
        params.hashedPassword = await hashPassword(req.body.password)
      }

      const updated = await updateOne('users', req.params.id, params)
      const updatedUser = await findOne('users', { _id: ObjectID(req.params.id) })

      res.status(200).send({ user: sanitizeUser(updatedUser) })
    })


    // DELETE USER
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id
      if (!id || id.length !== 24) {
        return res.status(404).send({ error: 'invalid id' })
      }
      const user = await findOne('users', { _id: ObjectID(req.params.id) })
      if (!user) {
        return res.status(404).send({error: 'user not found'})
      }
      const deletedUser = await deleteOne('users', { _id: ObjectID(req.params.id) })
      res.status(200).send({ status: 'success' })
    })

    app.post('/authenticate', async (req, res) => {
      const requiredParams = ['tenantId', 'username', 'password']

      if (!objHasAllKeys(req.body, requiredParams)) {
        return res.status(400).send({ error: 'missing required params', requiredParams })
      }

      const tenantId = req.body.tenantId
      if (!tenantId || tenantId.length !== 24) {
        return res.status(404).send({ error: 'invalid tenantId' })
      }

      const params = {
        tenantId: ObjectID(req.body.tenantId),
        username: req.body.username
      }

      const fetchedUser = await findOne('users', params)

      if (!fetchedUser) {
        return res.status(401).send({ error: 'unauthorized' })
      }

      const validPassword = await verifyPassword(req.body.password, fetchedUser.hashedPassword)
      if (!validPassword) {
        return res.status(401).send({ error: 'unauthorized' })
      }

      const payload = {
        tenantId: fetchedUser.tenantId,
        username: fetchedUser.username
      }

      const token = jwt.encode(payload, secret)

      res.status(200).send({ status: 'success', token })
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

function decodeToken (token) {
  return jwt.decode(token, secret)
}

async function cleanDb () {
  // console.info('Cleaning database (dropping collections)')
  await truncate('users')
  await truncate('tenants')
}

module.exports = {
  startServer,
  stopServer,
  cleanDb,
  findOne,
  decodeToken
}

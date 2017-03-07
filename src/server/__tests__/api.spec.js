const fs = require('fs')
const server = require('../server')
const request = require('superagent')
const ObjectID = require('mongodb').ObjectID

const secretPath = '/run/secrets/authenticate-secret-key'

console.log(`Loading secret from ${secretPath}`)
const secret = fs.readFileSync(secretPath, 'utf8').trim()

function get (url) {
  return new Promise((resolve, reject) => {
    request
      .get(`http://localhost${url}`)
      .end((err, res) => {
        resolve(res)
      })
  })
}

function post (url, data) {
  return new Promise((resolve, reject) => {
    request
      .post(`http://localhost${url}`)
      .send(data)
      .end((err, res) => {
        resolve(res)
      })
  })
}

function put (url, data) {
  return new Promise((resolve, reject) => {
    request
      .put(`http://localhost${url}`)
      .send(data)
      .end((err, res) => {
        resolve(res)
      })
  })
}

function _delete (url, data) {
  return new Promise((resolve, reject) => {
    request
      .delete(`http://localhost${url}`)
      .end((err, res) => {
        resolve(res)
      })
  })
}

describe('api', () => {
  beforeAll(async () => {
    await server.startServer()
  })

  beforeEach(async () => {
    await server.cleanDb()
  })

  describe('tenant', () => {
    describe('create tenant', () => {
      it('requires a name', async () => {
        const response = await (post('/tenants', {}))
        expect(response.status).toBe(400)
      })

      it('successfully creates a new tenant', async () => {
        const response = await post('/tenants', {name: 'A Tenant'})
        expect(response.status).toBe(201)
        expect(response.body.tenant._id).toBeDefined()
      })

      it('does not allow duplicate tenants', async () => {
        await (post('/tenants', { name: 'existing' }))
        const response = await (post('/tenants', { name: 'existing' }))
        expect(response.status).toBe(409)
      })
    })

    it('list tenants', async () => {
      await post('/tenants', { name: 'Tenant 1' })
      await post('/tenants', { name: 'Tenant 2' })
      const response = await get('/tenants')
      expect(response.status).toBe(200)
      expect(response.body.tenants.length).toBe(2)
      expect(response.body.tenants[1].name).toBe('Tenant 2')
      expect(response.body.tenants[1]._id).toBeDefined()
    })


    describe('update tenant', () => {
      it('fails when renaming a tenant that does not exist', async () => {
        await post('/tenants', { name: 'Existing Tenant' })
        const response = await put('/tenants/12345', { name: 'changed name' })
        expect(response.status).toBe(404)
      })

      it('rename a tenant', async () => {
        const existingTenant = (await post('/tenants', { name: 'Existing Tenant' })).body.tenant
        const response = await put(`/tenants/${existingTenant._id}`, { name: 'changed name' })
        expect(response.status).toBe(200)
        const fetchedTenants = (await get('/tenants')).body.tenants
        expect(fetchedTenants[0].name).toBe('changed name')
      })
    })

    describe('delete a tenant', async () => {
      it('fail when deleting non-existant tenant', async () => {
        const response = await _delete('/tenants/1234')
        expect(response.status).toBe(404)
      })

      it('delete a tenant', async () => {
        const existingTenant = (await post('/tenants', { name: 'Existing Tenant' })).body.tenant
        const response = await _delete(`/tenants/${existingTenant._id}`)
        expect(response.status).toBe(200)
        const fetchedTenants = (await get('/tenants')).body.tenants
        expect(fetchedTenants.length).toBe(0)
      })
    })
  })

  describe('user', () => {
    let tenant

    beforeEach(async () => {
      tenant = (await post('/tenants', { name: 'a tenant' })).body.tenant
    })

    describe('create user', () => {
      it('fails when there is not a valid tenant, username, and password', async () => {
        const noTenantResponse = await post('/users', { username: 'asdf@asdf.com', password: 'foobar123!' })
        expect(noTenantResponse.status).toBe(400)

        const noUsernameResponse = await post('/users', { tenant: tenant._id, password: 'foobar123!' })
        expect(noUsernameResponse.status).toBe(400)

        const noPasswordResponse = await post('/users', { tenant: tenant._id, username: 'asdf@asdf.com' })
        expect(noPasswordResponse.status).toBe(400)
      })

      it('creates a user', async () => {
        const response = await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })
        expect(response.status).toBe(201)
        expect(response.body.user).toBeDefined()
        expect(response.body.user.username).toBe('user@domain.com')
      })

      it('does not allow a duplicate username on the same tenant', async () => {
        await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })
        const response = await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })
        expect(response.status).toBe(409)
        const fetchedUsers = (await get('/users')).body.users
        expect(fetchedUsers.length).toBe(1)
      })

      it('allows the same username on a different tenant', async () => {
        const tenant2 = (await post('/tenants', { name: 'another tenant' })).body.tenant
        await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })
        const response = await post('/users', { tenantId: tenant2._id, username: 'user@domain.com', password: 'foobar123!' })
        expect(response.status).toBe(201)
        const fetchedUsers = (await get('/users')).body.users
        expect(fetchedUsers.length).toBe(2)
      })
    })

    describe('update user', () => {
      it('fails when updating a user that does not exist', async () => {
        const response = await put('/users/12345', { password: 'changedPassword' })
        expect(response.status).toBe(404)
      })

      it('updates a user', async () => {
        const existingUser = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
        const response = await put(`/users/${existingUser._id}`, { username: 'changedUsername', password:' changedPassword' })
        expect(response.status).toBe(200)
        const fetchedUsers = (await get('/users')).body.users
        expect(fetchedUsers.length).toBe(1)
        expect(fetchedUsers[0].username).toBe('changedUsername')
      })
    })

    describe('delete user', () => {
      it('fails when trying to delete a user that does not exist', async () => {
        const response = await _delete('/users/1234')
        expect(response.status).toBe(404)
      })

      it('delete a user', async () => {
        const existingUser = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
        const response = await _delete(`/users/${existingUser._id}`)
        expect(response.status).toBe(200)
        const fetchedUsers = (await get('/users')).body.users
        expect(fetchedUsers.length).toBe(0)
      })
    })

    describe('user passwords', () => {
      it('only allows legitimate and secure passwords to be set', async () => {
        const response = await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: '123' })
        expect(response.status).toBe(400)
        expect(response.body.error).toEqual('password must be at least 6 characters')
      })

      it('should not return the hashedPassword when requesting users', async () => {
        const user = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
        expect(user._id).toBeDefined()
        expect(user.password).not.toBeDefined()
        expect(user.hashedPassword).not.toBeDefined()
      })

      it('hashes the password', async () => {
        const user = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
        const fetchedUser = await server.findOne('users', { _id: ObjectID(user._id) })
        expect(fetchedUser).toBeDefined()
        expect(fetchedUser.password).not.toBeDefined()
        expect(fetchedUser.hashedPassword).toBeDefined()
        expect(fetchedUser.hashedPassword.length).toBeGreaterThan(10)
      })

      it('change password on a user', async () => {
        const user = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
        const fetchedUser = await server.findOne('users', { _id: ObjectID(user._id) })
        const oldHashedPassword = fetchedUser.hashedPassword
        expect(oldHashedPassword.length).toBeGreaterThan(10)
        const response = await put(`/users/${user._id}`, { username: 'changedUsername', password:' changedPassword' })
        const fetchedUser2 = await server.findOne('users', { _id: ObjectID(user._id) })
        expect(fetchedUser2.username).toBe('changedUsername')
        expect(fetchedUser2.hashedPassword.length).toBeGreaterThan(10)
        expect(fetchedUser2.hashedPassword).not.toEqual(oldHashedPassword)
      })

      it('changed password must follow same validation rules', async () => {
        const user = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
        const response = await put(`/users/${user._id}`, { username: 'changedUsername', password: '123' })
        expect(response.status).toBe(400)
        expect(response.body.error).toBe('password must be at least 6 characters')
      })

      it('updates do not require a password', async () => {
        const user = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
        const fetchedUser = await server.findOne('users', { _id: ObjectID(user._id) })
        const oldHashedPassword = fetchedUser.hashedPassword
        expect(oldHashedPassword.length).toBeGreaterThan(10)
        const response = await put(`/users/${user._id}`, { username: 'changedUsername' })
        const fetchedUser2 = await server.findOne('users', { _id: ObjectID(user._id) })
        expect(fetchedUser2.username).toBe('changedUsername')
        expect(fetchedUser2.hashedPassword.length).toBeGreaterThan(10)
        expect(fetchedUser2.hashedPassword).toEqual(oldHashedPassword)
      })
    })

  })

  describe('authentication', () => {
    let tenant

    beforeEach(async () => {
      tenant = (await post('/tenants', { name: 'a tenant' })).body.tenant
    })

    it('fails authentication when a user does not exist', async () => {
      const response = await post('/authenticate', { tenantId: tenant._id, username: 'doesNotExist@domain.com', password: 'foobar123!' })
      expect(response.status).toBe(401)
    })

    it('fails authentication when a user exists but the password is invalid', async () => {
      const user = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
      const response = await post('/authenticate', { tenantId: tenant._id, username: 'user@domain.com', password: 'badPassword' })
      expect(response.status).toBe(401)
    })

    it('authenticates when a user exists and the password is valid', async () => {
      const user = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
      const response = await post('/authenticate', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })
      expect(response.status).toBe(200)
    })

    it('generates a JWT when authentication is successful', async () => {
      const user = (await post('/users', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })).body.user
      const response = await post('/authenticate', { tenantId: tenant._id, username: 'user@domain.com', password: 'foobar123!' })
      const token = response.body.token
      expect(token.length).toBeGreaterThan(10)
      const decoded = server.decodeToken(token)
      expect(decoded.tenantId).toBe(user.tenantId)
      expect(decoded.username).toBe(user.username)
    })
  })
})

afterAll(() => {
  server.stopServer()
})

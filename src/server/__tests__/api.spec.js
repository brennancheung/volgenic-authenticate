const fs = require('fs')
const server = require('../server')
const request = require('superagent')

const secretPath = '/run/secrets/authenticate-secret-key'

console.log(`Loading secret from ${secretPath}`)
const secret = fs.readFileSync(secretPath, 'utf8').trim()

function noAuthGet (url) {
  return new Promise((resolve, reject) => {
    request.get(`http://localhost${url}`).end((err, res) => {
      resolve(res)
    })
  })
}

function get (url) {
  return new Promise((resolve, reject) => {
    request
      .get(`http://localhost${url}`)
      .set('x-authenticate-secret', secret)
      .end((err, res) => {
      resolve(res)
    })
  })
}

describe('api', () => {
  beforeAll(async () => {
    await server.startServer()
    await server.cleanDb()
  })

  describe.skip('tenant', () => {
    it('create a tenant', () => {
      expect(false).toBe(true)
    })

    it('fails when creating a duplicate tenant', () => {
      expect(false).toBe(true)
    })

    it('rename a tenant', () => {
      expect(false).toBe(true)
    })

    if('fails when renaming a tenant that does not exist', () => {
      expect(false).toBe(true)
    })

    it('delete a tenant', () => {
      expect(false).toBe(true)
    })

    it('fails when deleting a tenant that does not exist', () => {
      expect(false).toBe(true)
    })
  })

  describe.skip('user', () => {
    it('create a user', () => {
      expect(false).toBe(true)
    })

    it('fails when creating a duplicate user', () => {
      expect(false).toBe(true)
    })

    it('allows creating a user with the same username on a different tenant', () => {
      expect(false).toBe(true)
    })

    it('fail when trying to add a user to a tenant that does not exist', () => {
      expect(false).toBe(true)
    })

    it('delete a user', () => {
      expect(false).toBe(true)
    })

    it('change password on a user', () => {
      expect(false).toBe(true)
    })

    it('users are scoped to a tenant', () => {
      expect(false).toBe(true)
    })

    it('only allows legitimate and secure passwords to be set', () => {
      expect(false).toBe(true)
    })
  })

  describe('authentication', () => {
    it.only('all APIs fail without a valid secret key', async () => {
      const response1 = await noAuthGet('/tenants')
      expect(response1.status).toBe(401)

      const response2 = await get('/tenants')
      expect(response2.status).toBe(200)
    })

    it('fails authentication when a user does not exist', () => {
      expect(false).toBe(true)
    })

    it('fails authentication when a user exists but the password is invalid', () => {
      expect(false).toBe(true)
    })

    it('generates a JWT when authentication is successful', () => {
      expect(false).toBe(true)
    })
  })
})

afterAll(() => {
  server.stopServer()
})

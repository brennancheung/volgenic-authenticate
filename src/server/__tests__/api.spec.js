const server = require('../server')

let secret

beforeAll(async () => {
  await server.startServer()
  await server.cleanDb()
})

afterAll(() => {
  server.stopServer()
})


describe('startup', () => {
  it('create the initial user with password from a docker secret', () => {
    expect(false).toBe(true)
  })
})

describe('api', () => {
  describe('tenant', () => {
    it('create a tenant', () => {
      expect(false).toBe(true)
    })

    it('rename a tenant', () => {
      expect(false).toBe(true)
    })

    it('delete a tenant', () => {
      expect(false).toBe(true)
    })
  })

  describe('user', () => {
    it('create a user', () => {
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
    it('all APIs fail without a valid password', () => {
      expect(false).toBe(true)
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

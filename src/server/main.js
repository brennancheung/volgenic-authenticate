const server = require('./server')

async function init (params) {
  await server.startServer() 
}

init()

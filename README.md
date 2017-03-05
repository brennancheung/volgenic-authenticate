# volgenic-authenticate

An authentication service for Docker.

# Requirements

This microservice expects a service called "mongo" to exist.

Create a secret called `authenticate-secret-key`:

`openssl rand -base64 20 | docker secret create authenticate-secret-key -`

# Useful commands

Create the service:

```
openssl rand -base64 20 | docker secret create authenticate-secret-key -

docker service create --name authenticate \
  --network private \
  --mount type=bind,source=$HOME/docker/common,target=/mnt/common \
  --secret authenticate-secret-key
  volgenic/authenticate
```

# API commands

TODO

# Initial setup

TODO: Use a Docker secret for the initial user.

# volgenic-authenticate

An authentication service for Docker.

# Requirements

This microservice expects a service called "mongo" to exist.

# Useful commands

Create the service:

```
docker service create --name authenticate \
  --network private \
  --mount type=bind,source=$HOME/docker/common,target=/mnt/common \
  volgenic/authenticate
```

# API commands

TODO

# Initial setup

TODO: Use a Docker secret for the initial user.

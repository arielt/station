# Station

## Local deployment
```
tool/build_local

# or

docker compose -f deployment/local/docker-compose.yml stop
docker compose -f deployment/local/docker-compose.yml pull
docker compose -f deployment/local/docker-compose.yml build
docker compose -f deployment/local/docker-compose.yml up --detach
```

#!/bin/bash

# 실행할 docker-compose.yml 경로
DOCKER_COMPOSE_PATH="/var/lib/postgresql/data/service_templates/Docker/yaml/docker-compose.yml"

# 로그 출력
echo "🚀 Docker Compose 배포 시작: $DOCKER_COMPOSE_PATH"

# docker-compose 실행
if [ -f "$DOCKER_COMPOSE_PATH" ]; then
    docker-compose -f "$DOCKER_COMPOSE_PATH" up -d
    echo "✅ 배포 완료!"
else
    echo "❌ docker-compose.yml 파일이 존재하지 않습니다: $DOCKER_COMPOSE_PATH"
    exit 1
fi


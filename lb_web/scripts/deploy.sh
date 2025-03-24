#!/bin/bash

echo "Deploying web applications..."

# 현재 디렉토리 기준으로 YAML 적용
kubectl apply -f /tmp/lb-web/deployment.yaml

echo "Deployment completed!"
kubectl get pods
kubectl get svc                 

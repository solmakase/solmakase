#!/bin/bash

NAMESPACE="monitoring"

if [[ "$1" == "reset" ]]; then
  echo "🧹 monitoring=true 리소스 삭제 중..."
  kubectl delete all,cm,sa,cr,crb -l monitoring=true -n $NAMESPACE
  echo "✅ 삭제 완료!"
  exit 0
fi

echo "📆 Creating namespace: $NAMESPACE"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

echo "🚀 Deploying Monitoring Stack..."

kubectl apply -n $NAMESPACE -f ../yaml/prometheus-config.yaml --selector monitoring=true
kubectl apply -n $NAMESPACE -f ../yaml/prometheus-deployment.yaml --selector monitoring=true
kubectl apply -n $NAMESPACE -f ../yaml/grafana-deployment.yaml --selector monitoring=true
kubectl apply -n $NAMESPACE -f ../yaml/node-exporter.yaml --selector monitoring=true
kubectl apply -n $NAMESPACE -f ../yaml/kube-state-metrics.yaml --selector monitoring=true

echo "✅ Deployment Completed!"

echo "🔍 Monitoring Pods:"
kubectl get pods -n $NAMESPACE

echo "🔍 Monitoring Services:"
kubectl get svc -n $NAMESPACE


#!/bin/sh

SERVICE_NAME="foxtailapi"
SERVICE_TAG="latest"
ECR_REPO_URL="815971482560.dkr.ecr.us-east-1.amazonaws.com/${SERVICE_NAME}"

if [ "$1" = "build" ];then
    echo "Building the application..."
    cd ..
    npm run build
elif [ "$1" = "dockerize" ];then
    $(aws ecr get-login --no-include-email --region us-east-1)
    aws ecr create-repository --repository-name ${SERVICE_NAME:?} || true
    docker build -t ${SERVICE_NAME} .
    docker tag ${SERVICE_NAME}:${SERVICE_TAG} ${ECR_REPO_URL}:${SERVICE_TAG}
    docker push ${ECR_REPO_URL}:${SERVICE_TAG}
elif [ "$1" = "plan" ];then
    terraform init -backend-config="./infrastructure/app-prod.config"
    terraform plan -var-file="./production.tfvars" -var "docker_image_url=${ECR_REPO_URL}:${SERVICE_TAG}"
elif [ "$1" = "deploy" ];then
    terraform init -backend-config="/infrastructure/app-prod.config"
    terraform taint -allow-missing aws_ecs_task_definition.foxtailapi-task-definition
    terraform apply -var-file="/infrastructure/production.tfvars" -var "docker_image_url=${ECR_REPO_URL}:${SERVICE_TAG}" -auto-approve
elif [ "$1" = "destroy" ];then
    terraform init -backend-config="infrastructure/app-prod.config"
    terraform destroy -var-file="infrastructure/production.tfvars" -var "docker_image_url=${ECR_REPO_URL}:${SERVICE_TAG}" -auto-approve
fi

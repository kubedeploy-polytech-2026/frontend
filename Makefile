SHELL := /bin/bash
.DEFAULT_GOAL := help

IMAGE ?= kubedeploy-frontend:v0.1.0
BACKEND_IMAGE ?= kubedeploy-backend:v0.1.0
BACKEND_DIR ?= ../backend

.PHONY: help install test build dev image smoke

help:
	@printf '%s\n' \
		'Targets:' \
		'  install  Install locked dependencies' \
		'  test     Run unit tests' \
		'  build    Type-check and build the frontend' \
		'  dev      Start the local development server' \
		'  image    Build the local container image' \
		'  smoke    Build both images and check frontend/backend over HTTP'

install:
	@npm ci

test:
	@npm test

build:
	@npm run build

dev:
	@npm run dev

image:
	@docker build --tag '$(IMAGE)' .

smoke: image
	@IMAGE='$(IMAGE)' BACKEND_IMAGE='$(BACKEND_IMAGE)' BACKEND_DIR='$(BACKEND_DIR)' bash scripts/smoke.sh

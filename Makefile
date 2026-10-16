SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help install test build dev

help:
	@printf '%s\n' \
		'Targets:' \
		'  install  Install locked dependencies' \
		'  test     Run unit tests' \
		'  build    Type-check and build the frontend' \
		'  dev      Start the local development server'

install:
	@npm ci

test:
	@npm test

build:
	@npm run build

dev:
	@npm run dev

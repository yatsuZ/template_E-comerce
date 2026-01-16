# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: yzaoui <yzaoui@student.42.fr>              +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#                                                                              #
# **************************************************************************** #

.PHONY: all help local install build_local clean fclean exec redev \
		docker up stop clean_dock show_img show_container go_in re re_docker logs

SHELL := /bin/bash

GREEN   = \033[1;32m
BLUE    = \033[1;34m
YELLOW  = \033[1;33m
RED     = \033[1;31m
NC      = \033[0m

PROJECT_NAME     = e_comerce_template
CODE_DIR         = ./code
NODE_MODULE_PATH = $(CODE_DIR)/node_modules
DOCKER_COMPOSE   = docker compose
COMPOSE_FILE     = ./docker-compose.yml
DC               = $(DOCKER_COMPOSE) -f $(COMPOSE_FILE)
CONTAINER_NAME   = app_container
ENV_FILE = .env
-include $(ENV_FILE)
export

PORT ?= 3000

all: help

# ==================== LOCAL ====================

local: check_env  build_local exec

check_env:
	@if [ ! -f "$(ENV_FILE)" ]; then \
		echo -e "$(RED)Erreur : fichier .env manquant. Créé-le avant d'exécuter Makefile.$(NC)"; \
		exit 1; \
	fi

install: check_env 
	@npm install --prefix "$(CODE_DIR)"

build_local: install
	@npm --prefix "$(CODE_DIR)" run build

clean: check_env 
	@npm --prefix "$(CODE_DIR)" run clean

fclean: clean
	@rm -rf "$(NODE_MODULE_PATH)"

exec: build_local
	@npm --prefix "$(CODE_DIR)" start

redev: check_env 
	@npm --prefix "$(CODE_DIR)" run redev

re: fclean local

# ==================== DOCKER ====================

docker: check_env  build up

build: 
	@$(DC) build --no-cache

up: 
	@$(DC) up -d --remove-orphans
	@echo -e "$(GREEN)http://localhost:$(PORT)$(NC)"

stop:
	@$(DC) down

clean_dock: stop
	@$(DC) down -v --rmi all

re_docker: clean_dock docker

logs:
	@docker logs -f $(CONTAINER_NAME)

show_img:
	@docker images

show_container:
	@docker ps -a

go_in:
	@docker exec -it $(CONTAINER_NAME) /bin/sh

# ==================== HELP ====================

help: check_env 
	@echo -e "Makefile - $(PROJECT_NAME)"
	@echo ""
	@echo -e "$(BLUE)Local:$(NC)"
	@echo "  make local       - Build + run locally"
	@echo "  make install     - Install dependencies"
	@echo "  make build_local - Build project"
	@echo "  make exec        - Run application"
	@echo "  make clean       - Clean build files"
	@echo "  make fclean      - Clean all (+ node_modules)"
	@echo "  make redev       - Clean + rebuild + run"
	@echo "  make re          - Rebuild local"
	@echo ""
	@echo -e "$(BLUE)Docker:$(NC)"
	@echo "  make docker      - Build + start containers"
	@echo "  make up          - Start containers"
	@echo "  make stop        - Stop containers"
	@echo "  make clean_dock  - Clean Docker resources"
	@echo "  make re_docker   - Rebuild Docker"
	@echo "  make logs        - Show container logs"
	@echo "  make show_img    - List Docker images"
	@echo "  make show_container - List containers"
	@echo "  make go_in       - Enter container shell"

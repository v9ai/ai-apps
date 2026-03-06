.PHONY: up down eval eval-precision eval-all logs

up:
	docker compose up --build

down:
	docker compose down

eval:
	docker compose run --rm evals

eval-precision:
	docker compose run --rm evals-promptfoo

eval-all: eval eval-precision

logs:
	docker compose logs -f

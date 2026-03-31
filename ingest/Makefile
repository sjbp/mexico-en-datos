.PHONY: sync-all sync-prices sync-recent install dry-run

install:
	uv sync

sync-all:
	python -m ingest.pipelines.indicators --full

sync-recent:
	python -m ingest.pipelines.indicators

sync-prices:
	python -m ingest.pipelines.indicators --full --topic prices

dry-run:
	python -m ingest.pipelines.indicators --dry-run

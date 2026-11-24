V ?= patch

.PHONY: build test check release

build:
	npm run build

test:
	npm test

check:
	npm run check

release: check test
	npm version $(V) -m "chore: release %s"
	git push --follow-tags

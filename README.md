# WebRPG.org

Static catalog site for WebRPG.org.

The site fetches the public index from:

```text
https://raw.githubusercontent.com/WebRPG-org/index/main/list.json
```

Project pages are expected at:

```text
https://webrpg.org/<repository-name>/
```

Entries marked `invalid_structure`, `deleted_invalid_structure`, or `duplicate_name` in `list.json` are hidden from the catalog.

# git-remote-sync

Sync git remotes across devices

# todo

- [ ] implement storage drivers
    - [x] File backend
    - [x] Firebase backend
    - [x] Bun Single Binary server Backend
    - [ ] Nodejs Backend
    - [ ] PHP script backend
    - [x] Pocketbase backend
- [ ] Command Implementation
    - [x] register
    - [x] login
    - [x] push
    - [x] pull
    - [x] status
    - [x] list
    - [x] remove

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## To run using pocketbase
Import schema using Admin > Setting > Import collections and use pb_schema.json
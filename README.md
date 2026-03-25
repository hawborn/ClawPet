# ClawPet

[中文](README-zh.md) | **English**

ClawPet is a macOS pixel-pet desktop shell for OpenClaw.

It turns OpenClaw from "an agent living in a console" into something that can be seen, felt, and handled directly on the desktop:

- pixel pets stay on the screen edge as a companion layer
- a panel handles real-time conversation, session switching, image sending, and transcript review
- an approval popup handles fast operator decisions
- a soul bridge fallback keeps basic status feedback alive when Gateway is unavailable

> Public Markdown policy: only `README.md` and `README-zh.md` remain in the repository.

## Product Position

ClawPet is not trying to be a full IDE shell.

Its goal is narrower and more useful:

**make OpenClaw feel like a desktop companion shell with visibility, lightweight handoff, and quick interaction.**

That means three things:

- **companion presence** on the desktop
- **state visibility** for runs, waiting, approvals, failure, and completion
- **lightweight interaction** without constantly going back to the terminal

## What It Does Today

### Pet Layer

- transparent frameless Electron pet windows
- multiple pets with automatic layout
- drag, click interaction, double-click to open panel
- 6 built-in variants: Peach, Mint, Midnight, Butter, Sakura, Cocoa
- click-through, pause, and mute controls

### State Expression Layer

- lifecycle-oriented task expression: `task-received`, `thinking`, `executing`, `waiting`, `needs-human`, `done`, `failed`
- OpenClaw activity mapping for `read / write / edit / exec / tool / job`
- per-session pet binding and priority information
- desktop utterance cards for approvals, progress, failure, completion, waiting, and summaries
- throttling and mute controls to avoid noisy notifications

### Panel Layer

The panel is now a work handoff surface rather than a stats dashboard. It includes:

- **Current Most Important Task**
- **Catch Ball / Needs My Action**
- **Real-Time Conversation**
- **Session Switching**
- **Pixel Wardrobe**

Real-time conversation currently supports:

- text message sending
- image attachments
- image picker dialog
- direct image paste into the composer
- image previews in transcript
- transcript text copy
- right-click copy / paste
- clearing composer state after successful send

### Approval Layer

- standalone approval popup when operator action is needed
- lightweight risk classification for commands
- deny / allow once / allow always
- fast jump back to the main panel

### OpenClaw Integration Layer

- auto-detects `~/.openclaw/openclaw.json`
- connects to local Gateway WebSocket
- syncs sessions, presence, nodes, approvals, active runs, and transcript
- sends text and image attachments to the active session
- aborts the current run
- wraps Gateway failures into readable UI errors

### Fallback and Local State

- file-based soul bridge fallback when Gateway is not available
- persisted settings: `clickThrough`, `paused`, `soulMode`, `muted`, `lastActiveSessionKey`
- persisted pet lineup and positions
- local OpenClaw device identity storage

## Latest Architecture

ClawPet now follows a fairly clear split:

**main process owns the desktop shell and system integration, Gateway client owns state ingestion, renderer owns expression and interaction, shared owns the protocol.**

### Structure

```text
src/
├── main/
│   ├── index.ts              # app entry, windows, tray, IPC, system integration
│   ├── openclaw-client.ts    # Gateway WebSocket client and state normalization
│   ├── pet-manager.ts        # multi-pet windows, layout, session mapping
│   ├── app-config.ts         # runtime config and env parsing
│   ├── app-persistence.ts    # app settings persistence
│   ├── pet-lineup-store.ts   # pet lineup persistence
│   └── soul-bridge.ts        # fallback file bridge
├── preload/
│   └── index.ts              # secure IPC bridge
├── renderer/
│   ├── index.html
│   └── src/
│       ├── pet-app.ts        # pet window
│       ├── panel-app.ts      # panel UI
│       ├── approval-app.ts   # approval popup
│       ├── pet-engine.ts     # pixel renderer and animation
│       └── styles.css        # shared visual system
└── shared/
    └── ipc.ts                # shared types and IPC protocol
```

### Main Process Responsibilities

`src/main/index.ts` acts as the shell orchestrator:

- creates pet windows, panel window, and approval window
- owns tray menu and system-facing behavior
- handles clipboard, file dialog, right-click menus, and IPC
- aggregates and broadcasts Gateway snapshot updates
- dispatches desktop utterances
- keeps error guards and window diagnostics in one place

### Gateway Client Responsibilities

`src/main/openclaw-client.ts` converts raw Gateway protocol into stable app state:

- connection and reconnect lifecycle
- `chat`, `agent`, and approval event handling
- transcript and recent-message normalization
- message sending, image attachments, session switching, abort, approval resolve
- readable Gateway error wrapping

### Renderer Responsibilities

- `pet-app.ts`: desktop pet, controls, utterance card
- `panel-app.ts`: task cards, approvals handoff, real-time conversation, images, copy actions
- `approval-app.ts`: focused approval decision UI
- `pet-manager.ts`: layout, broadcasts, session-to-pet mapping

### Shared Protocol Responsibilities

`src/shared/ipc.ts` is the single protocol source for:

- `AppSettings`
- `OpenClawSnapshot`
- `GatewaySendMessagePayload`
- `GatewayTranscriptEntry`
- `GatewayApprovalSummary`
- `PetSessionBinding`
- `PetPriorityInfo`
- desktop utterance payloads and IPC channels

## Design Direction

The current design direction is intentionally opinionated:

### 1. Companion First

The pet should feel like a work companion, not just a status light.

### 2. Important Things Surface In Place

Short and important information should surface on the desktop, in the popup, or at the top of the panel before the user has to dig into logs.

### 3. Keep Lightweight Actions On Desktop

Session switch, quick reply, image send, approval decision, run abort: these frequent actions should stay close to the desktop surface.

### 4. One Shared State Language

Pet windows, panel, and approval popup all derive from the same normalized snapshot so the expression stays consistent.

## Run Locally

### Requirements

- macOS
- Node.js + npm
- local OpenClaw Gateway if you want the full experience

### Development

```bash
npm install
npm run dev
```

### Type Check

```bash
npm run check
```

### Build

```bash
npm run build
npm run preview
```

## Local Data and Config

Default local data is stored in Electron `userData`. On macOS that is typically:

```bash
~/Library/Application Support/ClawPet/
```

Typical files:

```text
app-state.json       # app settings
pet-lineup.json      # pet lineup and positions
openclaw/device.json # Gateway device identity
```

### Common Environment Variables

- `CLAWPET_ENABLE_GATEWAY`
- `CLAWPET_ENABLE_PETS`
- `CLAWPET_ENABLE_SOUL_BRIDGE`
- `CLAWPET_STARTUP_LOG`
- `CLAWPET_MAX_PETS`
- `CLAWPET_DEFAULT_PETS`
- `CLAWPET_DATA_DIR`
- `CLAWPET_LINEUP_FILE`
- `CLAWPET_SOUL_STATE_FILE`

## Current Plan and Progress

This section is written so it can also be reused as a status update.

### Current Assessment

**ClawPet has finished the core Companion Shell baseline and is now moving from feature completion into stabilization, repo cleanup, and deliverability.**

### Completed

- **desktop shell**: Electron multi-window structure, tray, window control, error guards
- **state ingestion**: Gateway connection, reconnect, snapshot aggregation, soul bridge fallback
- **pet expression**: multi-pet presence, session mapping, lifecycle expression, priority feedback, desktop utterance
- **approval loop**: popup, risk cues, fast operator decisions
- **panel loop**: current task, needs-my-action area, real-time conversation, session switch, wardrobe
- **real-time conversation v1**: text send, abort run, image send, image paste, preview, transcript copy, right-click copy/paste
- **persistence v2**: app settings and last active session recovery
- **repo cleanup direction**: public docs reduced to the two README files

### In Progress

- **interaction stabilization** around panel and real-time conversation edge cases
- **open-source repo cleanup** for a clearer public-facing structure
- **handoff readiness** so the project is easier to share and adopt

### Next

1. continue smoothing interaction edge cases
2. improve packaging and delivery ergonomics
3. externalize companion schema, copy, and behavior parameters over time
4. add richer behaviors only after the shell remains stable

### One-Line Status Update

> ClawPet is no longer just an animated status light; it is now a usable OpenClaw desktop companion shell that can show state, catch approvals, send messages and images, and switch sessions, with the current focus shifting to stabilization, repo cleanup, and delivery readiness.

## License

ClawPet is licensed under `AGPL-3.0-only`. See `LICENSE` for details.

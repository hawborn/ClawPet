# ClawPet

[中文](README-zh.md) | **English**

A lightweight pixel desktop pet for macOS, and a light-weight desktop interaction layer for OpenClaw.

ClawPet displays one or more transparent pixel cats on the desktop edge to do three things:

- Serve as a lightweight desktop companion
- Visualize OpenClaw's running status
- Bridge session switching, message sending, and approval operations

> For a quick guide on how to use it, check out [PLAYBOOK.md](PLAYBOOK.md).

## Current State

- **Platform**: macOS
- **Tech Stack**: Electron + Vite + TypeScript
- **Rendering**: Native Canvas
- **Integration**: Connects to OpenClaw Gateway by default, falls back to soul bridge file mode if unavailable
- **Phase**: Desktop pet prototype, focused on "companionship + state awareness + lightweight interaction"

## Core Features

### Pet Mechanics

- Each pet runs in its own transparent, frameless, always-on-top Electron window
- Multiple pets can exist simultaneously as independent windows
- State machine-driven pixel animation system
- Click pet to trigger greeting action and chat bubble
- 3 built-in color variants

**P1 New Features**:
- Each pet displays session info and priority indicator
- Task lifecycle phase transition animations (task-received / thinking / executing / waiting / done / failed)
- 7 emotion states mapped (excited / focused / concerned / completed / failed, etc.)
- Pet behavior synchronized with task stages

### Desktop Interaction

- Menu bar tray with controls: add pet, remove last pet, pause, click-through, show window, quit
- Double-click pet to open OpenClaw control panel
- Auto pop-up approval window for pending approvals
- Feedback for completion, failure, and long waits

**P1 New Features**:
- Click pet to quickly switch to corresponding work session
- Pet display order auto-adjusts with priority changes

### OpenClaw

- Auto-detects `~/.openclaw/openclaw.json`
- Direct local Gateway WebSocket connection
- Reads sessions, recent messages, presence, nodes, pending approvals, and running activities
- Sends messages to current session
- Aborts current run
- Handles `exec.approval.requested`
- Maps `read / write / edit / exec / tool / job` activities to pet visual feedback

## Built-in Pets

- Peach Cat
- Mint Cat
- Midnight Cat

## Getting Started

### Requirements

- macOS
- Node.js + npm
- (Optional) Local OpenClaw / QClaw environment for state sync and approval interaction

### Development

```bash
npm install
npm run dev
```

### Type Checking

```bash
npm run check
```

### Build

```bash
npm run build
npm run preview
```

Build output:
- `out/main`
- `out/preload`
- `out/renderer`

## How It Works

ClawPet is an Electron desktop app that translates OpenClaw's running status into pet behavior and desktop interactions.

### Architecture

- `src/main`: Electron main process, handles windows, tray, IPC, persistence, and Gateway connection
- `src/preload`: Security bridge layer
- `src/renderer`: Canvas pet rendering, panel UI, approval window
- `src/shared`: Shared types between main and renderer

### State Flow

1. ClawPet starts
2. Detects OpenClaw / QClaw config
3. Attempts local Gateway connection
4. Receives session, activity, and approval state updates
5. Translates states into pet behavior, panel content, and approval windows
6. User interactions send commands back to Gateway

### Connection States

ClawPet supports the following connection states:

- `unconfigured`: OpenClaw config not found
- `connecting`: Attempting connection
- `connected`: Connected
- `degraded`: Fallback mode (using soul bridge)
- `disconnected`: Disconnected
- `error`: Connection error

## Soul Mode & File Bridge

If Gateway is temporarily unavailable, ClawPet can fall back to file bridge mode using `soul-state.json` for state updates.

Supported state semantics:

- `idle`
- `thinking`
- `coding`
- `running`
- `waiting`
- `error`

### State Sync Script

The repo includes a helper script:

```bash
python3 scripts/set_state.py coding "Implementing login page refactor"
python3 scripts/set_state.py thinking "Analyzing data flow"
python3 scripts/set_state.py running "Running tests"
python3 scripts/set_state.py idle "Waiting"
```

It writes state to `clawpet/soul-state.json` in your OpenClaw / QClaw workspace.

To customize the state file location, set environment variable:

```bash
export CLAWPET_SOUL_STATE_FILE=/your/path/soul-state.json
```

## Interaction Guide

- **Single click pet**: Trigger greeting action and chat bubble
- **Double-click pet**: Open OpenClaw panel
- **Approval arrives**: Auto pop-up approval window
- **Menu bar tray**: Main control hub
- **Soul mode**: Behavior and atmosphere based on OpenClaw / QClaw state
- **Click-through**: Window doesn't intercept mouse, good for companion-only display
- **Pause action**: Good for meetings, screen recording, presentations

## Local Data

ClawPet stores local state in Electron's `userData` directory. On macOS, typically:

```bash
~/Library/Application Support/ClawPet/
```

Typical file structure:

```bash
~/Library/Application Support/ClawPet/
├── pet-lineup.json         # Pet layout, skin, position
├── app-state.json          # App settings (click-through, pause, soul mode)
└── openclaw/
    └── device.json         # Device authentication (auto-generated)
```

You can override defaults with environment variables:

- `CLAWPET_DATA_DIR`
- `CLAWPET_LINEUP_FILE`

## Current Version

**P1 Companion Credibility ✅ Completed (2026-03-23)**

ClawPet is now a true "desktop companion", not just a status light.

### P1 Core Upgrades

| Feature | Status | Description |
|---------|--------|-------------|
| **CP-006 Lifecycle Ceremony** | ✅ Complete | 7 lifecycle stages + transition animations + emotion mapping |
| **CP-007 Multi-Session Mapping** | ✅ Complete | Pets represent sessions + priority expression + spatial awareness |
| **CP-008 Panel Architecture** | ✅ Complete | Task-card-centric + clear information hierarchy |
| **CP-009 Unified State Language** | ✅ Complete | 6 emotion states + color system + action mapping |

### New Capabilities

- **Rhythmic tasks**: Coherent progression from receive → think → execute → complete, not hard state switches
- **Multi-session spatial awareness**: Different pets represent different sessions, clear priority, see at a glance which is active
- **Panel as decision hub**: Open panel, immediately see most important tasks and pending decisions, not statistics
- **Unified design language**: Colors, actions, copy, and feedback form a consistent story; new features have patterns to reference

### P0 Product Foundation

| Feature | Status | Description |
|---------|--------|-------------|
| P0-1 Stable Connection & Recovery | ✅ Complete | 6-layer connection state machine + auto-reconnect + fallback support |
| P0-2 Local Persistence | ✅ Complete | `clickThrough` / `paused` / `soulMode` persistence |
| P0-3 Fine-grained State Feedback | ✅ Complete | 8 activity types mapped + pet behavior optimized |
| P0-4 Enhanced Approval Window | ✅ Complete | Risk level + command summary + context display |
| P0-5 Completion/Failure Feedback | ✅ Complete | 3 feedback types: completion / failure / long wait |

## Next Phase (P2)

If continuing forward, worthwhile priorities include:

1. **CP-010 Companion Schema Externalization**: Extract pet definitions, actions, text into configurable resources
2. **CP-011 Personality/Behavior Packs**: Support different pet styles with differentiated behavior and tone
3. **Sound System**: Sound feedback for each emotion state
4. **Richer Behaviors**: Follow cursor, scheduled reminders, pomodoro timer, etc.
5. **Drag & Physics**: Drag pet, bounce, dock to edge, etc.
6. **Packaging**: Generate installable `.dmg` to lower adoption friction

## Documentation

📚 **Complete Document Navigation** → [docs/INDEX.md](docs/INDEX.md)

### Quick Start
- [PLAYBOOK.md](PLAYBOOK.md): Current version playbook

### P1 Feature Docs
- [docs/P1-COMPLETION-SUMMARY.md](docs/P1-COMPLETION-SUMMARY.md): P1 completion summary
- [docs/CP-006-LIFECYCLE-CEREMONY-COMPLETE.md](docs/CP-006-LIFECYCLE-CEREMONY-COMPLETE.md): Lifecycle ceremony design
- [docs/CP-007-MULTI-SESSION-MAPPING.md](docs/CP-007-MULTI-SESSION-MAPPING.md): Multi-session pet mapping
- [docs/CP-008-PANEL-IA-COMPLETE.md](docs/CP-008-PANEL-IA-COMPLETE.md): Panel information architecture
- [docs/CP-009-STATE-LANGUAGE-SPEC.md](docs/CP-009-STATE-LANGUAGE-SPEC.md): Unified state language spec
- [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md): Project status report

### Planning Docs
- [docs/ROADMAP.md](docs/ROADMAP.md): Product roadmap
- [docs/CLAWPET-PRD.md](docs/CLAWPET-PRD.md): Product requirements document
- [docs/STATE-TAXONOMY.md](docs/STATE-TAXONOMY.md): State taxonomy

### Community
- [CONTRIBUTING.md](CONTRIBUTING.md): Contribution guide
- [CHANGELOG.md](CHANGELOG.md): Changelog
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): Code of conduct

## License

![AGPL v3](https://img.shields.io/badge/license-AGPL%20v3-blue.svg)

ClawPet uses the **AGPL-3.0-only** license.

This means you can freely learn, modify, and share the code under AGPL terms. If you distribute modifications or provide services through network distribution, you must also provide the corresponding source code.

For full terms, see [LICENSE](LICENSE).

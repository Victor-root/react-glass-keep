# Changelog

## v2.3.5 — 2026-05-14

### Added
- **One-click in-app update** from the admin panel. The "Update now" button on a native install runs `git fetch`, `npm install`, `npm run build` and restarts the service in the background; on Docker it pulls the new image and swaps the container via the Docker socket. A full-screen progress modal walks through the steps and reconnects automatically when the app comes back online.
- **Live system monitor during updates** — RAM, swap and CPU gauges polled every second so you can see what the host is doing while the build runs. Stale-data badge appears when the server is too busy to keep up.
- **Cancel button** for a running native update: SIGKILLs the build, restores the previous version from the snapshot taken before the update started (no rebuild — fast even on RAM-starved hosts), and restarts the app.
- **Auto-popping changelog modal** after a successful in-app update so users see what's new on the version they just installed. Also accessible on demand from the admin panel's "View changelog" button.
- **Smart Node heap sizing** during build: `--max-old-space-size` is computed from `RAM + swap` so small hosts (256 MB LXC, etc.) can spill into swap instead of OOM-ing. Applies to the in-app flow and to the `install.sh` install / update paths.
- **Snapshot-based rollback**: before every in-app update the script hard-links `dist/` + `node_modules/` into `/data/.update-backup`. On failure the rollback is a `mv` instead of a rebuild, so it survives the same OOM that triggered the failure.
- **Friendly failure hints**: the modal scans the update log for known patterns (out of memory, no network, permission denied, disk full) and shows a specific cause instead of the generic "exit 134".
- Optional `UPDATE_BRANCH` and `UPDATE_BUILD_HEAP_MB` env vars in `/opt/glass-keep/.env` for advanced operators who want to track a custom branch or override the heap cap.

### Changed
- `install.sh` now creates a second systemd unit (`glass-keep-updater.service`) alongside the main service, surfaced clearly in the install summary so the operator sees what was set up.
- `docker-compose.yml` ships with `/var/run/docker.sock` already mounted so the one-click update works out of the box on a fresh Docker install. Existing Docker users add the line once, never touch it again.

### Fixed
- Minor bug fixes

## v2.3.0 — 2026-05-13

### Added
- Android TV support: the existing APK detects leanback hardware and switches to a dedicated TV layout (Pinterest-style grid, D-pad spatial navigation, sidebar + detail viewer, profile picker login).
- Refreshed master logo applied across the favicon (`.ico` + 16/32 PNGs), the PWA icons (192 / 512 / maskable), the Apple touch icon, the Android launcher (5 densities + adaptive foreground), the Android TV banner, and the Compose first-launch setup screen.

### Fixed
- Minor bug fixes

## v2.2.0 — 2026-05-10

### Added
- Audio notes with MP3, WAV, and original format download options
- Visual storage gauge for audio tracks
- Scrubber bar with seek control for audio playback
- Icon-only "Add Recording" button on mobile, text pill on desktop

### Fixed
- Checklist item text alignment when entering edit mode
- iOS Safari search bar keyboard not opening on input focus

## v2.1.0 — 2026-05-09

### Added
- In-app version display.
- Admin-only update check against GitHub Releases.
- Update notification when a newer version is available.
- Update instructions in the admin panel.
- Direct Android APK download link in the README.

## v2.0.0 — 2026-05-08

First official stable release of **GlassKeep Enhanced**.

This release marks the fork as its own enhanced release line, based on the original Glass Keep project but with major additions and improvements.

### Added
- Local-first / offline support
- Trash / restore
- Native Android companion app
- Internationalization foundation
- Rich-text editor with live formatting
- Smarter Google Keep import
- Settings panel revamp
- Server-side encryption
- WebAuthn passkeys
- Easier self-hosting
- Drawing mode overhaul
- Provider-agnostic AI assistant
- Side-by-side note view
- Improved multi-select dock

### Improved
- Mobile and responsive usability
- Sync behavior and cross-device reliability
- Import / export and deduplication flows
- Note creation and editing flow
- Tags, filters, and note organization
- Checklists and content interactions
- Collaboration UX guardrails
- Authentication and account handling
- Repository structure and documentation

### Notes
This is the first official stable release line for **GlassKeep Enhanced**.

The original upstream project used the `1.x` version line. This fork starts its enhanced stable release line at `v2.0.0` to reflect the scale of changes introduced since the fork.

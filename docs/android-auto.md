# Android Auto (phase 1)

Phase 1 puts Chill in Android Auto as a control for whatever the phone is
already playing. The WebView stays the only player. See
[the plan](plans/2026-11-11-001-feat-android-auto-plan.md) for the design.

## How it fits together

- `ChillMediaService` is the media service Android Auto binds to. It is
  exported, and only accepts Android Auto, the system media controller, and
  Chill itself (`CallerAllowlist`).
- `MirrorPlayer` backs the service's media session. It plays nothing and takes
  no audio focus. It reports whatever the WebView last pushed.
- `MediaBridgePlugin` is the Capacitor plugin the WebView uses. It talks to the
  service through `MediaBridgeHub`, which outlives the Activity.
- On the client, `syncPlayerToNative` pushes state and `handleNativeCommands`
  runs car commands. Both do nothing outside the native shell.

## Build and install

```bash
pnpm cap:build
pnpm cap:run --target <device-id>
```

The app points at the server in `.env.native` (see `.env.native.example`).

## Let Android Auto show a sideloaded app

Android Auto hides apps that did not come from Google Play unless its developer
mode allows them:

1. On the phone open Settings, Connected devices, Connection preferences,
   Android Auto.
2. Tap the version line at the bottom about 10 times to enable developer mode.
3. Open the three-dot menu, then Developer settings, and turn on Unknown
   sources.

## Test without a car: the Desktop Head Unit

1. Install "Android Auto Desktop Head Unit Emulator" from the SDK Manager.
2. In Android Auto's developer settings menu, choose Start head unit server.
3. Forward the port and run the head unit from the SDK's `extras/google/auto`
   folder, following Google's testing guide:
   <https://developer.android.com/training/cars/testing/dhu>

## Manual checklist

Run this on the Desktop Head Unit first, then in the car (wired or wireless;
note which in the results). Each line names the requirement it checks.

**Before anything else (the plan's go/no-go check)**

- [ ] With the app in the background and the screen off, audio keeps playing.
- [ ] With the screen off, a track advances to the next one on its own.
- [ ] With the screen off, a pause from the car still pauses the phone.

If any of these fail, stop. The WebView is being throttled in the background
and phase 1 needs a foreground service that keeps it alive (see the plan's
risks).

**Phase 1 behavior**

- [ ] Chill appears in the Android Auto media app list (R1).
- [ ] Playing a track on the phone shows its title, artist, art, and a moving
      position in the car (R2).
- [ ] Pause, play, next, previous, and seek from the car screen change the
      phone's player, and the phone UI follows without any other action (R3,
      R4, AE2).
- [ ] The steering wheel buttons do the same (R3).
- [ ] With the app closed, the car shows "Open Chill on your phone to start
      playback (sign in if needed)" (R5).
- [ ] Remote-controlling another Chill device from the phone, with nothing
      playing locally, shows the same message in the car (R6, AE1).
- [ ] Signing out on the phone clears the track from the car (R15, sign-out
      half).
- [ ] Swiping the app away clears the track from the car.
- [ ] A seek bar shows in the car, and next and previous are greyed out for a
      one-track queue.
- [ ] The web build, the iPad, and the PWA behave exactly as before (R7).

**Side effects to look for**

- [ ] The lock screen and notification shade show one set of media controls,
      not two.
- [ ] Starting a track on the phone while connected does not interrupt the
      audio (the mirror player must not take audio focus).
- [ ] A stalled stream freezes the car's position instead of letting it run on.

## Known limits

- Phase 1 cannot tell "app closed" from "signed out", so one message covers
  both. The separate "sign in on phone" message arrives with phase 2.
- The app asks for the notification permission in its manifest but does not
  prompt for it. On Android 13 and newer the media notification stays hidden
  until you allow it in Settings.
- If Android Auto cannot connect, check `adb logcat` for a rejected controller.
  The allowed package names live in `CallerAllowlist` and may need adjusting if
  Android Auto's package differs on your phone.

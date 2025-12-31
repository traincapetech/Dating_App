# Responsive Test Checklist

Target devices:
- Small phone (e.g., 5.5" ~720p), large phone (6.5"+ ~1080p+)
- Gesture nav vs 3-button nav (Android), notch/safe-area (iOS)
- Portrait focus; spot-check landscape where supported

General:
- Verify safe-area insets on top/bottom; no UI under notches/home indicators.
- Check scrollability when content exceeds viewport; no clipped buttons.
- Validate tap targets and text legibility on small screens.
- Keyboard avoid behavior: fields stay visible; buttons remain reachable.

Onboarding:
- Name/email/OTP screens: keyboard dismiss, scroll, buttons enabled/disabled states.
- Notifications step: toggle on/off without layout jump; error alerts visible.
- Location step: "Get My Location" button accessible; info box not clipped.

Discovery (Home feed):
- Card swipe works on gesture and 3-button nav devices.
- Action buttons reachable; match popup fits vertically.
- Distance filter bar does not overlap cards on small screens; presets horizontally scroll if needed.
- Refresh/preset taps do not shift layout.

Chat:
- Input bar stays above keyboard; send/attach buttons reachable.
- Long message threads scroll smoothly; images render within bounds.

Profile/Preferences:
- Lists scroll; switches/toggles reachable on small screens.
- Image tiles or prompt inputs remain tappable; no overflow off-screen.

Notifications:
- Toggle and disable flows show alerts fully; no clipped text.

Edge checks:
- Very long names/bios wrap without pushing actions off-screen.
- Low connectivity: loading states and errors visible, not hidden off-view.


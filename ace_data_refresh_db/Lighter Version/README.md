# ACE Intelligence Platform — Light Variant

Same dashboard as `ace-dashboard/` but with a light theme.

Drop-in replacement: the only file that differs from the dark version is
`style.css`. The `index.html`, `app.js`, and `dashboard_data.js` are
identical to the dark version.

## When to use which

**Dark theme** is built for wall-mounted ops displays: high-contrast, glowing
status indicators, "mission control" feel. Best for screens in low-light
rooms where the dashboard is meant to be glanced at.

**Light theme** works better when:
- The dashboard is embedded inside a corporate portal that's otherwise light
- It's projected in a brightly-lit room (sunlight washes out neon-on-black)
- Operators want it as a browser tab alongside Excel/email
- Compliance/governance reviews look at dashboards (light feels more "office-formal")

## What changed

CSS only — all status logic, animations, and layout are identical. The
palette was rebuilt around white panels with deeper, desaturated status
colors (true green/cyan/red look anemic on white, so they're shifted toward
slate-tinted equivalents). All neon glow shadows are dropped since they
only work against dark backgrounds.

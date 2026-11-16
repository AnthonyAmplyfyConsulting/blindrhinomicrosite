# Rhino Mines — The Blind Rhino microsite

A mobile-first game microsite for The Blind Rhino. Guests tap **Let's Play**, uncover rhinos on a 5×5 board to win up to $10 off their next meal, fill in a short form, and get a coupon to show their server. Everyone wins: hitting an X still locks in what they've won (minimum $1).

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Files

```
index.html          page shell, meta tags, fonts
assets/styles.css   all styles, animations and mobile layout rules
assets/app.js       screens, game logic, form, coupon
assets/wordmark.svg The Blind Rhino wordmark (traced from theblindrhino.com)
assets/rhino.svg    rhino mark with gold X eye
assets/rhino-deco.svg  faint background rhino
```

## Run locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

It's a static site, so any static host works:

- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root.
- **Netlify / Vercel:** import the repo, no build command, publish directory `/`.

## Settings

Edit the `CONFIG` block at the top of `assets/app.js`:

| Setting | Default | What it does |
|---|---|---|
| `mineCount` | `5` | Number of Xs on the board (3–8) |
| `maxReward` | `10` | Max dollars off ($1 per rhino) |
| `minReward` | `1` | Reward when a guest hits an X before finding a rhino |
| `couponDays` | `30` | Days until the coupon expires |
| `webhookUrl` | `''` | POST each submission as JSON (e.g. a GoHighLevel inbound webhook) |

Webhook payload fields: `name`, `phone` (10 digits), `favorite_ipa`, `sports_request`, `sms_consent`, `reward_dollars`, `coupon_code`, `coupon_expires`, `source`, `submitted_at`.

## Testing shortcuts

- `?screen=game`, `?screen=form`, `?screen=coupon`: jump straight to a step
- `?x=8`: set the number of Xs from the URL

## Mobile notes

- Fits the full game above the fold down to iPhone SE (375×667)
- Respects notches and home-indicator safe areas (`viewport-fit=cover`)
- 16px inputs so iOS doesn't zoom on focus; tel keypad and autofill on the phone field
- Light haptic taps on Android (`navigator.vibrate`)
- Honors "Reduce Motion"

Built by Amplyfy.

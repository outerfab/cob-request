# Chip-on-board request form

A public multi-step form that leads from "I have a chip" to a complete chip-on-board (CoB) request for
[outerfab](https://outerfab.com). At the end it shows one JSON document in a code block, ready to copy and send.

**Live:** https://cob.outerfab.com/

## How it works

- One question per screen. Later questions depend on earlier answers, so nobody sees all of them.
- "Not sure" is offered almost everywhere. It never changes the path: the value becomes `"unspecified"` and
  the question is listed under `open_points`.
- A few answers produce an entry under `warnings`, because a wrong assumption there costs a board run
  (for example a HASL finish or copper pads).
- Everything runs in the browser. Answers are kept in `localStorage` so a reload does not lose them.
  Nothing is sent to a server, and an uploaded `open.cob.json` is only read locally.

## Files

| Path | Content |
|---|---|
| `site/index.html` | Page skeleton |
| `site/assets/questions.js` | All questions, answer options, conditions and warnings |
| `site/assets/app.js` | Form flow, storage and the JSON result |
| `site/assets/style.css` | Outerfab design |

There is no build step. To try it locally:

    python3 -m http.server 8080 --directory site

## Changing questions

Edit `site/assets/questions.js`. Each question has an `id`, a `key` (its path in the result), its options and an
optional `show(answers)` condition. Keep the ids stable, they are referenced in `open_points`.

## Result format

    {
      "format": "outerfab.cob-request",
      "version": "0.1",
      "created": "YYYY-MM-DD",
      "intro": {}, "chip": {}, "multi_die": {}, "board": {}, "bonding": {}, "order": {}, "contact": {},
      "open_cob_json": "none",
      "open_points": [],
      "warnings": []
    }

A question that was not asked is `"not applicable"` (or `"default padring"` where the padring answers it).
A question answered with "Not sure" is `"unspecified"`. No key is ever missing.

## License

Code: MIT, see `LICENSE`. Fonts (`site/assets/fonts`): derived from IBM Plex, SIL Open Font License 1.1.
Logo: Outerfab brand asset.

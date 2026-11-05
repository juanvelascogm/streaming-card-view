# Streaming Card View

A Chrome extension that turns the Rotten Tomatoes **Movies at Home** browse page into a full-width card view: big posters, scores, trailers, synopsis, genres, director and cast, a copy-title button, and a minimal header.

> Not affiliated with, endorsed by, or sponsored by Rotten Tomatoes or Fandango. It only restyles pages you are already viewing in your own browser.

## Install (unpacked)

1. Download or clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Visit `rottentomatoes.com/browse/movies_at_home/`.

## How it works

A content script runs only on `rottentomatoes.com/browse/movies_at_home/*`. It reads the page's existing movie tiles, rebuilds them as cards, and fetches each title's detail page in the background to add synopsis, genres, director and cast. No data is collected or sent anywhere else; there is no server and no analytics.

## Notes

Because it reads the site's current markup, a redesign on their side can break it. Issues and PRs welcome.

## License

MIT, see [LICENSE](LICENSE).

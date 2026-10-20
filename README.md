<p align="center">
  <img src="Folders%20and%20Files/docs/banner.svg" alt="Imagine if every repository showed its files collapsed like this. Arrow pointing up toward the Folders and Files directory." width="100%">
</p>

<h1 align="center">GitHub Collapse Repo</h1>

<p align="center">
  <strong>Your next great discovery is below the file list.</strong><br>
  Collapse GitHub’s folders and files into one tidy bar. Get straight to the README.
</p>

<p align="center">
  <img alt="Version 1.0.0" src="https://img.shields.io/badge/version-1.0.0-2f81f7?style=flat-square">
  <img alt="Chrome and Firefox · Manifest V3" src="https://img.shields.io/badge/Chrome_%26_Firefox-Manifest_V3-24292f?style=flat-square">
  <img alt="Vanilla JavaScript" src="https://img.shields.io/badge/JavaScript-zero_dependencies-f0db4f?style=flat-square">
  <img alt="No telemetry" src="https://img.shields.io/badge/telemetry-none-3fb950?style=flat-square">
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#see-it-in-action">Preview</a> ·
  <a href="#try-it-locally">Local demo</a> ·
  <a href="#privacy-by-design">Privacy</a> ·
  <a href="https://github.com/brunofunnie/github-collapse-repo/issues">Report a bug</a>
</p>

---

You open a repository to learn what it does. A wall of files gets there first.

**GitHub Collapse Repo** folds that list away by default, leaving a full-width toggle with folder and file counts. Need the code? Click once to bring everything back. Your choice carries across repositories, page reloads, and GitHub tabs in the same browser profile.

## See it in action

The [local demo](#try-it-locally) loads the actual extension code into a sample repository page. Switch between collapsed, expanded, and dark-mode views to explore the toggle.

## Small extension. Thoughtful details.

| Detail | What you get |
| :--- | :--- |
| **Collapsed by default** | The README moves up without removing access to the files. |
| **One bar, the full width** | A generous click target with folder counts, file counts, and an expand/collapse action. |
| **A remembered preference** | Expand once to keep lists open; collapse again whenever you prefer. |
| **Native-looking themes** | GitHub’s own Primer color tokens keep the toggle in step with light and dark mode. |
| **Keyboard access** | Tab to the button, then use **Enter** or **Space**. Includes a visible focus ring and ARIA state. |
| **Motion that respects you** | Animated transitions, with reduced-motion preferences respected. |
| **Built for GitHub navigation** | Reattaches after soft navigation and file-list re-renders. |
| **Six interface languages** | English, Portuguese, Spanish, French, German, and Japanese; English fallback for other languages. |

## Install

Build both browser packages with Node.js 22.2 or later. No third-party dependencies needed.

1. [Download the source ZIP](https://github.com/brunofunnie/github-collapse-repo/archive/HEAD.zip) and extract it, or clone the repository:

   ```bash
   git clone https://github.com/brunofunnie/github-collapse-repo.git
   ```

2. Open a terminal in the repository folder and run:

   ```bash
   cd "Folders and Files"
   node scripts/build.mjs
   ```

### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select **`dist/chrome/`**.
4. Open or refresh a repository on **github.com**.

### Firefox

Requires **Firefox 140 or later** for the generated package.

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select **`dist/firefox/manifest.json`**.
4. Open or refresh a repository on **github.com**.

Temporary add-ons are removed when Firefox restarts. Permanent distribution requires Mozilla signing; the build creates an unsigned ZIP for submission, not a signed installable XPI.

The file list starts collapsed. Click the **Folders and files** bar to expand it, or focus the bar and press **Enter** or **Space**.

After changing source files or pulling updates, rebuild, reload the extension in the browser’s extension management page, and refresh GitHub tabs.


## Privacy by design

**No analytics. No tracking. No network requests from the extension.**

Both browser manifests declare a content script for `https://github.com/*` and no additional extension permissions. That script reads and updates the page’s DOM and saves one preference in GitHub’s origin-scoped `localStorage`:

| Key | Value | Meaning |
| :--- | :--- | :--- |
| `ghcr:collapsed` | `1` | File lists collapsed |
| `ghcr:collapsed` | `0` | File lists expanded |
| Key absent | — | Collapsed by default |

The preference applies across repositories on github.com; it is not a per-repository setting or a browser-sync feature. If local storage is unavailable, toggling still works on the current page, but the choice cannot be saved.

## Try it locally

The included demo recreates a repository page and loads the actual extension script and stylesheet. Use it to explore the appearance without visiting GitHub.

From the repository root, enter the project folder:

```bash
cd "Folders and Files"
python3 -m http.server 8765
```

Then open one of these views:

| View | Local URL |
| :--- | :--- |
| Collapsed | [127.0.0.1:8765/demo/?collapsed=1](http://127.0.0.1:8765/demo/?collapsed=1) |
| Expanded | [127.0.0.1:8765/demo/?expanded=1](http://127.0.0.1:8765/demo/?expanded=1) |
| Dark mode | [127.0.0.1:8765/demo/?theme=dark&collapsed=1](http://127.0.0.1:8765/demo/?theme=dark&collapsed=1) |

The demo’s preference is separate from the one saved on github.com.

## Under the hood

Vanilla JavaScript, plain CSS, and a Manifest V3 content script. No runtime dependencies, bundler, background worker, or settings screen.

```text
github-collapse-repo/
├── README.md
└── Folders and Files/
    ├── manifest.json             Extension metadata and GitHub URL matching
    ├── content.js                Toggle, persistence, animation, and navigation handling
    ├── content.css               GitHub-themed styles and reduced-motion support
    ├── icons/                    Extension icons at 16, 48, and 128 px
    ├── demo/index.html           Standalone visual playground
    ├── docs/                     README artwork
    └── scripts/
        ├── build.mjs             Browser folders and ZIPs (Node.js built-ins)
        ├── build.test.mjs        Package-content and rebuild checks
        └── generate-icons.py     Icon generator (requires Pillow)
```

The script looks for GitHub’s React directory container, with a fallback for the classic file table. A mutation observer and navigation listeners restore the toggle when GitHub replaces the page content.

### Making changes

Edit the shared `content.js` or `content.css`, preview in the demo, then rebuild, reload the extension, and check a real GitHub repository in each browser. Check both toggle states, keyboard operation, light/dark themes, and navigation between directories. The demo is a visual fixture; live GitHub navigation needs a browser check.

### Browser builds

Run these commands from `Folders and Files/`:

```bash
node scripts/build.mjs          # Chrome + Firefox
node scripts/build.mjs chrome   # Chrome only
node scripts/build.mjs firefox  # Firefox only
```

| Browser | Loadable folder | Submission archive |
| :--- | :--- | :--- |
| Chrome | `dist/chrome/` | `dist/github-collapse-repo-chrome.zip` |
| Firefox | `dist/firefox/` | `dist/github-collapse-repo-firefox.zip` |

`manifest.json` is the shared source of truth. The builder copies only runtime files and adds Firefox’s `browser_specific_settings.gecko` metadata: the stable ID `github-collapse-repo@brunofunnie`, a minimum version of `140.0`, and `data_collection_permissions.required: ["none"]`. Keep this ID stable once published. See [Mozilla’s data collection declaration guide](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/).

Build output paths above are relative to `Folders and Files/`. Each build replaces the selected browser’s generated folder and ZIP. `dist/` is ignored by Git; edit source files rather than generated copies. Documentation, screenshots, demos, and development scripts stay out of the packages.

Run the build checks from `Folders and Files/`:

```bash
node --test scripts/build.test.mjs
```

## Compatibility & feedback

Build targets are Chrome with Manifest V3 and Firefox 140+ on **github.com**. Packaging is tested automatically; live Firefox behavior still needs browser verification. GitHub Enterprise hosts are outside the manifest’s URL match pattern. GitHub layout changes may require selector updates.

Found a page where the toggle is missing or behaves oddly? [Open an issue](https://github.com/brunofunnie/github-collapse-repo/issues) with the repository URL, browser name and version, and steps to reproduce. Attach any screenshots directly to the issue.

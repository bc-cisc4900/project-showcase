# CISC 4900 Showcase Website

An online exhibition of past CISC 4900 senior projects at Brooklyn College.

## Run it in VS Code

1. **File → Open Folder…** and choose `cisc4900-showcase`
2. Install the recommended **Live Server** extension (VS Code will prompt you)
3. Right-click `index.html` → **Open with Live Server**

The page reloads each time you save. You can also double-click `index.html`, since it works without a server.

## Project structure

```
cisc4900-showcase/
├── index.html          Page structure (sections, filters, nav)
├── css/styles.css      All styling: colors are in :root at the top, dark mode included
├── js/app.js           Renders stats, project cards, filters, cohorts, advice
├── data/
│   ├── projects.js     Project data the page loads (generated)
│   ├── advice.js       Advice quotes the page loads (generated)
│   ├── projects.json   Source data (edit this for hand fixes)
│   └── advice.json
└── scripts/            Python pipeline: spreadsheet → data files
    ├── clean_data.py   Merges semesters, applies consent, removes emails
    ├── enrich_github.py  Adds titles/descriptions/tech from GitHub READMEs
    └── build_data.py   Assigns categories, writes data/*.js
```

## Common edits

| Want to… | Edit |
|---|---|
| Change colors / fonts | `css/styles.css` → `:root` variables at the top |
| Change headline or section text | `index.html` |
| Change how a project card looks | `js/app.js` → `card()` function |
| Fix one project's title or description | `data/projects.json`, then run `python3 build_data.py` |
| Change project categories | `scripts/build_data.py` → `CATEGORIES` |

## Rebuild the data from the spreadsheet

Put the survey spreadsheet in the project root as `surveys.xlsx` (it's git-ignored because it contains emails), then:

```bash
pip install pandas openpyxl
cd scripts
python3 clean_data.py        # spreadsheet → data/projects.json, advice.json, review_needed.csv
python3 enrich_github.py     # fills titles/descriptions from GitHub READMEs
python3 build_data.py        # → data/projects.js, data/advice.js
```

Note: `enrich_github.py` overwrites `projects.json`, so hand edits there get replaced. Put permanent title fixes in its `TITLE_FIX` dictionary instead.

## Deploy

It's a static site. Push to GitHub and enable **Settings → Pages**, or drag the folder onto Netlify.

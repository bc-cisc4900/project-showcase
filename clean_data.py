"""Clean CISC 4900 exit-survey spreadsheet into a showcase dataset.

- Drops emails and the alumni-mentor opt-in (internal-only fields)
- Applies each student's sharing consent
- Groups teammates into one project by shared GitHub repo / video link
Outputs data/projects.json, data/advice.json, data/review_needed.csv
"""
import json, re, sys
import pandas as pd

SRC = sys.argv[1] if len(sys.argv) > 1 else "../surveys.xlsx"
ADVICE = "What advice would you give to freshmen to prepare for seeking internships in their junior/senior year, or for employment upon graduation?"
SEM_LABEL = {"S2026": "Spring 2026", "F2025": "Fall 2025", "S2025": "Spring 2025",
             "F2024": "Fall 2024", "F2023": "Fall 2023"}

# S2026 asked "any reason NOT to share?" as free text. Rows reviewed by hand:
EXCLUDE = {"Jack Kaplan", "Anthony Jaramillo"}          # asked not to share
REVIEW = {                                               # needs professor's call
    "Yevgeniy": "Project still being polished (said ready June 2026)",
    "Jayme Escobar": "Recommends consulting involved parties (ISSO office) first",
    "Ivan Chiu": "Says the repo is unrelated to the actual project",
    "Uthman okunola": "Happy to share, but repo is private (sensitive data)",
}

def clean(v):
    if pd.isna(v): return None
    s = str(v).strip()
    return s or None

def name_case(n):
    if n.isupper(): n = n.lower()
    return " ".join(w if any(c.isupper() for c in w[1:]) else w.capitalize() for w in n.split())

def norm_repo(url):
    if not url: return None
    m = re.search(r"github\.com/([^/\s]+)/([^/\s#?]+)", url)
    if not m: return None                     # profile link only, not a repo
    repo = re.sub(r"\.git$", "", m.group(2))
    return f"https://github.com/{m.group(1)}/{repo}"

def norm_video(url):
    if not url or not url.startswith("http"): return None
    m = re.search(r"(?:youtu\.be/|v=)([\w-]{11})", url)
    if m: return f"https://www.youtube.com/watch?v={m.group(1)}"
    if "youtube.com/@" in url: return None    # channel, not a video
    return url.split("?si=")[0]               # Drive / OneDrive / Loom / itch.io

rows, review = [], []
xl = pd.ExcelFile(SRC)
for sem in xl.sheet_names:
    df = xl.parse(sem)
    cols = {c: c for c in df.columns}
    share_col = next((c for c in df.columns if c.startswith("May we show")), None)
    reason_col = next((c for c in df.columns if c.startswith("If there is a reason")), None)
    repo_col = next((c for c in df.columns if "GitHub" in c), None)
    vid_col = next((c for c in df.columns if "youtube" in c.lower()), None)
    seen = set()
    for _, r in df.iterrows():
        name = clean(r["First and Last Name"])
        if not name or (sem, name.lower()) in seen: continue
        seen.add((sem, name.lower()))
        consent, anon = "share", False
        if share_col:
            v = (clean(r[share_col]) or "").lower()
            if not v.startswith("yes"): consent = "exclude"
            anon = "anonymize" in v
        if name in EXCLUDE: consent = "exclude"
        if name in REVIEW:
            consent = "review"
            review.append({"semester": SEM_LABEL[sem], "name": name, "reason": REVIEW[name],
                           "their_words": clean(r[reason_col]) if reason_col else ""})
        rows.append({
            "semester": sem, "name": None if anon else name_case(name), "anonymous": anon,
            "major": clean(r["Major"]), "consent": consent,
            "repo": norm_repo(clean(r[repo_col])) if repo_col else None,
            "video": norm_video(clean(r[vid_col])) if vid_col else None,
            "advice": clean(r[ADVICE]),
        })

# Group teammates: same semester + same repo (or same video when no repo)
projects = {}
for s in rows:
    if s["consent"] != "share": continue
    key = (s["semester"], s["repo"] or s["video"] or f"solo:{s['name'] or id(s)}")
    p = projects.setdefault(key, {"semester": s["semester"], "semester_label": SEM_LABEL[s["semester"]],
                                  "repo": s["repo"], "video": None, "members": [], "majors": set()})
    p["members"].append(s["name"] or "Anonymous student")
    p["majors"].add(s["major"])
    p["video"] = p["video"] or s["video"]

out = []
for i, p in enumerate(projects.values(), 1):
    p["id"] = f"p{i:03d}"; p["majors"] = sorted(m for m in p["majors"] if m)
    p["title"] = None; p["description"] = None; p["languages"] = []
    out.append(p)

advice = [{"semester": SEM_LABEL[s["semester"]], "major": s["major"],
           "name": s["name"] if s["consent"] == "share" else None, "text": s["advice"]}
          for s in rows if s["advice"] and s["consent"] != "exclude" and len(s["advice"]) > 25]

json.dump(out, open("../data/projects.json", "w"), indent=1)
json.dump(advice, open("../data/advice.json", "w"), indent=1, ensure_ascii=False)
pd.DataFrame(review).to_csv("../data/review_needed.csv", index=False)
print(f"students {len(rows)} | shared {sum(r['consent']=='share' for r in rows)} | "
      f"projects {len(out)} (with repo {sum(bool(p['repo']) for p in out)}, "
      f"with video {sum(bool(p['video']) for p in out)}) | advice {len(advice)} | review {len(review)}")

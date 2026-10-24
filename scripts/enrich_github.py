"""Fill project titles/descriptions/tech tags from each repo's README."""
import json, re, urllib.request, concurrent.futures as cf

TECH = ["React","Next.js","Vue","Angular","Node","Express","Flask","Django","FastAPI",
        "Python","Java","JavaScript","TypeScript","C++","C#","Swift","Kotlin","Flutter","React Native",
        "MongoDB","PostgreSQL","MySQL","SQLite","Firebase","Supabase","AWS","Docker","Tailwind",
        "Unity","TensorFlow","PyTorch","OpenAI","scikit-learn","Pandas","Streamlit","PHP","Laravel","Three.js","Phaser","Android","Spring Boot"]

def fetch(repo):
    base = repo.replace("https://github.com/", "https://raw.githubusercontent.com/")
    for f in ["README.md", "readme.md", "Readme.md", "README.MD", "README"]:
        try:
            return urllib.request.urlopen(f"{base}/HEAD/{f}", timeout=15).read().decode("utf-8", "ignore")
        except Exception:
            pass
    return None

def strip_md(t):
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", t)            # images
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)         # links
    t = re.sub(r"<[^>]+>", "", t)                          # html
    return re.sub(r"[*_`>#]", "", t).strip()

def parse(md, repo):
    lines = md.splitlines()
    title = next((strip_md(l) for l in lines if re.match(r"^#\s+\S", l)), None)
    if not title:  # HTML-style heading or none
        m = re.search(r"<h1[^>]*>(.*?)</h1>", md, re.S)
        title = strip_md(m.group(1)) if m else None
    desc, buf = None, []
    for l in lines:
        s = l.strip()
        if s.startswith("#") or s.startswith("|") or s.startswith("```") or s.startswith("- ") or s.startswith("* "):
            if buf: break
            continue
        c = strip_md(s)
        if c: buf.append(c)
        elif buf: break
    if buf: desc = " ".join(buf)
    if desc and len(desc) < 40: desc = None
    if desc and len(desc) > 320: desc = desc[:317].rsplit(" ", 1)[0] + "…"
    md = re.sub(r"(?i)spring\s*20\d\d", "", md)
    tags = [t for t in TECH if re.search(r"(?<![\w.])" + re.escape(t) + r"(?![\w])", md, re.I)]
    return title, desc, tags[:6]

def pretty_repo_name(repo):
    n = repo.rstrip("/").split("/")[-1]
    n = re.sub(r"(?i)cisc[-_. ]?4900[-_. ]?|4900[-_. ]?", "", n)
    n = re.sub(r"[-_]+", " ", n).strip()
    n = re.sub(r"([a-z])([A-Z])", r"\1 \2", n)
    return n.title() if n else None

# Hand-curated titles where the README heading was a template or placeholder
TITLE_FIX = {
    "https://github.com/Gazwahi/CISC_4900FinalProject-Juan-John": None,  # keep repo-name fallback
    "https://github.com/Lunaris47/shopping-list-app": "Shopping List App (Android)",
    "https://github.com/annabelenko/CISC4900": "Accessibility Platformer (Phaser 3)",
    "https://github.com/rabia-rehmein/TALTI": "TALTI",
    "https://github.com/Jackindeng/CISC-4900-Project": "Campus Second-Hand Trading Platform",
    "https://github.com/EricG20/gurchin_game": "Zorbulon Pylon Defense Force",
    "https://github.com/VensanDrot/ECHO_FRONT": "ECHO",
    "https://github.com/SyedIAhsan/YANA": "YANA",
}
TEMPLATE_DESC = re.compile(r"(?i)this template provides|senior project for cisc 4900|supervisor:|-{5,}")
EMOJI = re.compile(r"^[^\w(]+", re.U)

projects = json.load(open("../data/projects.json"))
todo = [p for p in projects if p["repo"]]
with cf.ThreadPoolExecutor(8) as ex:
    mds = list(ex.map(lambda p: fetch(p["repo"]), todo))
found = 0
for p, md in zip(todo, mds):
    title = desc = None; tags = []
    if md:
        found += 1
        title, desc, tags = parse(md, p["repo"])
    fallback = pretty_repo_name(p["repo"]) or p["repo"].split("/")[-1]
    if not title or len(title) > 70 or re.fullmatch(r"(?i)(cisc\s*)?4900.*|readme|project", title or ""):
        title = fallback
    title = EMOJI.sub("", title or "").replace("\\", " ").strip() or fallback
    title = re.sub(r"\s*[—–-]+\s*CISC 4900.*$", "", title)
    if TITLE_FIX.get(p["repo"]): title = TITLE_FIX[p["repo"]]
    if desc and TEMPLATE_DESC.search(desc): desc = None
    if desc and desc.lower().startswith("link to group meeting"): desc = None
    p.update(title=title, description=desc, languages=tags, readme_found=bool(md))
json.dump(projects, open("../data/projects.json", "w"), indent=1, ensure_ascii=False)
print(f"repos {len(todo)} | READMEs found {found} | with description {sum(bool(p.get('description')) for p in todo)}")
for p in todo: print(" -", p["title"], "|", (p["description"] or "")[:70], "|", p["languages"])

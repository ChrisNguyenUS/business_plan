import json, os, sys, time, urllib.request

KEY = os.environ["KIE_KEY"]
OUT = sys.argv[1]
SPEC = json.load(open(sys.argv[2], encoding="utf-8"))  # {name: {prompt, aspect_ratio}}
os.makedirs(OUT, exist_ok=True)


def call(url, data=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data else None,
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        method="POST" if data else "GET",
    )
    return json.load(urllib.request.urlopen(req, timeout=60))


tasks = {}
for name, s in SPEC.items():
    r = call("https://api.kie.ai/api/v1/jobs/createTask", {
        "model": "gpt-image-2-text-to-image",
        "input": {"prompt": s["prompt"], "aspect_ratio": s["aspect_ratio"], "resolution": "1K"},
    })
    print(name, r.get("code"), r.get("msg"), flush=True)
    if r.get("code") == 200:
        tasks[name] = r["data"]["taskId"]

pending = dict(tasks)
for _ in range(90):
    for k, t in list(pending.items()):
        r = call(f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={t}")["data"]
        st = r.get("state")
        if st == "success":
            url = json.loads(r["resultJson"])["resultUrls"][0]
            ext = url.split("?")[0].rsplit(".", 1)[-1]
            urllib.request.urlretrieve(url, f"{OUT}/{k}.{ext}")
            print("done", k, flush=True)
            del pending[k]
        elif st == "fail":
            print("fail", k, r.get("failMsg"), flush=True)
            del pending[k]
    if not pending:
        break
    time.sleep(10)
print("left", list(pending))

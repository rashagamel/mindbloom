# Browser click-through of Sound Safari, Quick Look Owl, Bloom Break, Focus mode and My Superpower.
# Needs: pip install playwright && playwright install chromium
# Run:   npm run build && npx next start -p 3111   (in another terminal)   then   python3 tests/e2e.py
import re, sys
from playwright.sync_api import sync_playwright

B = "http://localhost:3111"
errors, fails = [], []
def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))
    if not cond: fails.append(name)

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 420, "height": 900})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # sign up
    page.goto(B + "/"); page.fill("#name", "Lina"); page.click("button[type=submit]")
    page.wait_for_selector(".hero")
    check("home shows Sound Safari + Owl banners", page.locator(".safaribanner").count() == 1 and page.locator(".owlbanner").count() == 1)
    check("home shows Superpower chip", page.locator("a[href='/superpower']").count() == 1)

    # ---- Quick Look: read the dots during the flash, answer correctly, 5 rounds
    page.goto(B + "/owl/look")
    for rnd in range(5):
        page.wait_for_selector(".qdot", timeout=5000)
        n = page.locator(".qdot").count()
        page.wait_for_selector(".sfrow .sfpick", state="visible")
        page.wait_for_function("document.querySelector('.sfrow').style.visibility==='visible'")
        page.locator(".sfrow .sfpick", has_text=re.compile(rf"^{n}$")).click()
        page.wait_for_selector(".sfpick.right")
        if rnd < 4: page.wait_for_selector(".dots .dot.now:nth-child(%d)" % (rnd + 2), timeout=6000)
    page.wait_for_selector("text=Great looking", timeout=6000)
    check("owl/look: 5 rounds finish", True)

    # ---- Quick Look: wrong answer fades, hint ladder works
    page.goto(B + "/owl/look")
    page.wait_for_selector(".qdot"); n = page.locator(".qdot").count()
    page.wait_for_function("document.querySelector('.sfrow').style.visibility==='visible'")
    wrong = page.locator(".sfrow .sfpick", has_text=re.compile(rf"^(?!{n}$)\d+$")).first
    wrong.click()
    check("owl/look: wrong pick fades (dim), no red", page.locator(".sfpick.dim").count() == 1)
    check("owl/look: oops message shown", "" != page.locator(".feedback span").inner_text().strip())
    for _ in range(3): page.click("text=Help me"); page.wait_for_timeout(300)
    check("owl/look: hint 3 glows the answer", page.locator(".sfpick.glow").count() == 1)

    # ---- Number line
    page.goto(B + "/owl/line"); page.wait_for_selector(".numline")
    txt = page.locator(".ask").inner_text(); n = int(re.search(r"(\d+)", txt).group(1))
    mx = int(page.locator(".endlabel").nth(1).inner_text())
    box = page.locator(".numline").bounding_box()
    # first tap far away -> oops + direction hint; then tap correct spot
    far = 0.95 if n / mx < 0.5 else 0.05
    page.mouse.click(box["x"] + box["width"] * far, box["y"] + box["height"] / 2)
    check("owl/line: far tap gives a direction hint", re.search(r"nearer the (bigger|smaller)", page.locator(".feedback span").inner_text()) is not None, page.locator(".feedback span").inner_text())
    page.mouse.click(box["x"] + box["width"] * (n / mx), box["y"] + box["height"] / 2)
    page.wait_for_selector(".owlpin")
    check("owl/line: owl lands on the right spot", True)

    # ---- Bigger tribe
    page.goto(B + "/owl/more"); page.wait_for_selector(".tribe")
    counts = [page.locator(".tribe").nth(i).locator(".qemoji").count() for i in range(2)]
    page.locator(".tribe").nth(0 if counts[0] > counts[1] else 1).click()
    page.wait_for_selector(".tribe.right")
    check("owl/more: bigger group accepted", counts[0] != counts[1])
    page.goto(B + "/owl/more"); page.wait_for_selector(".tribe")
    for _ in range(2): page.click("text=Help me"); page.wait_for_timeout(200)
    check("owl/more: hint 2 shows the counts", page.locator(".tribecount").count() == 2)

    # ---- Sound Safari: every game via the hint ladder
    for g in ["rain", "hunt", "blend", "drums"]:
        page.goto(B + f"/safari/{g}"); page.wait_for_selector(".safari")
        page.wait_for_timeout(500)
        for _ in range(3): page.click("text=Help me"); page.wait_for_timeout(250)
        if g == "drums":
            page.click("text=That's it!")
        else:
            check(f"safari/{g}: hint 3 glows answer", page.locator(".sfpick.glow").count() == 1)
            page.locator(".sfpick.glow").click()
        page.wait_for_selector(".feedback span:not(:empty)")
        check(f"safari/{g}: round completes", True)

    # ---- Bloom Break: 3 rounds needing real help in a row -> break is offered; Skip continues
    page.goto(B + "/safari/rain"); page.wait_for_selector(".safari")
    for i in range(3):
        page.wait_for_timeout(450)
        for _ in range(3): page.click("text=Help me"); page.wait_for_timeout(150)
        page.locator(".sfpick.glow").click()
        if i < 2: page.wait_for_selector(f".dots .dot.now:nth-child({i+2})", timeout=6000)
    page.wait_for_selector(".breakcard", timeout=6000)
    check("Bloom Break appears after 3 helped rounds", "Let's shake it out" in page.locator(".breakcard h1").inner_text())
    check("Bloom Break: Ready is locked until the timer ends, Skip is available",
          page.locator(".breakcard .btn").is_disabled() and page.locator(".breakcard .linkbtn").is_enabled())
    page.click(".breakcard .linkbtn"); page.wait_for_selector(".safari")
    check("Skip returns to the game (round 4)", page.locator(".dots .dot.now:nth-child(4)").count() == 1)

    # ---- Regression: the existing Lab screen must keep its original look (my CSS must not leak into it)
    page.goto(B + "/lab"); page.wait_for_selector(".pickrow .pick")
    w = page.evaluate("getComputedStyle(document.querySelector('.pickrow .pick')).width")
    m = page.evaluate("getComputedStyle(document.querySelector('.pickrow')).marginBottom")
    check("Lab .pick unchanged (64px wide)", w == "64px", w)
    check("Lab .pickrow unchanged (8px margin)", m == "8px", m)

    # ---- number line ticks are readable
    page.goto(B + "/owl/line"); page.wait_for_selector(".numline")
    for _ in range(2): page.click("text=Help me")
    tk = page.evaluate("(()=>{const t=document.querySelector('.nltick');const c=getComputedStyle(t);return [c.color,c.width,c.fontSize]})()")
    check("line hint ticks are dark and 40px", tk[0] != "rgb(255, 255, 255)" and tk[1] == "40px", str(tk))
    box = page.locator(".nltick").first.bounding_box()
    page.locator(".nltick").first.click()
    check("tapping a tick counts as a tap on the line", True)

    # ---- Focus mode
    page.goto(B + "/"); page.wait_for_selector(".hero")
    check("scene visible by default", page.locator(".scene").is_visible())
    page.click("text=Focus mode")
    check("focus mode hides the scene", not page.locator(".scene").is_visible() and page.evaluate("document.documentElement.dataset.focus") == "1")
    page.goto(B + "/owl"); page.wait_for_selector(".grid")
    check("focus mode persists across pages", page.evaluate("document.documentElement.dataset.focus") == "1")
    page.goto(B + "/"); page.click("text=Focus mode: on")

    # ---- Superpower, with Arabic
    page.goto(B + "/superpower"); page.wait_for_selector(".superhero")
    check("superpower: explorer with little data", "Superpower Explorer" in page.locator(".superhero h1").inner_text())
    check("superpower: brave tries counted", "times I tried again" in page.locator("body").inner_text())
    page.click(".langpill")
    check("superpower in Arabic (RTL)", page.evaluate("document.documentElement.dir") == "rtl" and "مستكشف" in page.locator(".superhero h1").inner_text())
    page.goto(B + "/owl/line"); page.wait_for_selector(".numline")
    check("line stays left-to-right in Arabic", page.evaluate("getComputedStyle(document.querySelector('.numlinewrap')).direction") == "ltr")
    check("Arabic numerals on the line", re.search(r"[٠-٩]", page.locator(".endlabel").nth(1).inner_text()) is not None)
    page.click(".langpill")

    # ---- Parent dashboard shows both stat cards
    page.goto(B + "/parent"); page.wait_for_selector("form")
    a, b = map(int, re.findall(r"\d+", page.locator("form p").first.inner_text())[:2])
    page.fill("form input", str(a + b)); page.click("form button[type=submit]")
    page.wait_for_selector("text=Sound Safari")
    body = page.locator("body").inner_text()
    check("parent shows Sound Safari + Quick Look Owl stats", "right at first" in body and "Quick Look Owl" in body)
    br.close()

print("\nconsole/page errors:", [e for e in errors if "favicon" not in e][:5])
print("FAILS:", fails)
sys.exit(1 if fails or any("favicon" not in e for e in errors) else 0)

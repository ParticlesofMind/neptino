
import asyncio
from playwright.async_api import async_playwright
import time

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:3000/src/pages/shared/canvas.html")
        time.sleep(10)
        print(await page.content())
        await page.wait_for_selector("#canvas-grid-container", timeout=120000)
        await page.screenshot(path="jules-scratch/verification/verification.png")
        await browser.close()

asyncio.run(main())

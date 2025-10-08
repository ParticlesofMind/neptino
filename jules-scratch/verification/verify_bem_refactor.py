import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_course_builder(page: Page):
    """
    This test verifies that the BEM refactoring has been applied correctly
    to the coursebuilder.html page.
    """
    # 1. Arrange: Go to the coursebuilder page.
    page.goto("http://localhost:3000/src/pages/teacher/coursebuilder.html", wait_until="networkidle")

    # 2. Act: Click on the classification section and wait for it to be visible.
    page.get_by_role("link", name="Classification").click()
    classification_section = page.locator("#classification")
    expect(classification_section).to_have_class(re.compile(r"content__section is-active"))
    expect(classification_section).to_be_visible()

    # 3. Act: Click on the page setup section and wait for it to be visible.
    page.get_by_role("link", name="Page Setup").click()
    page_setup_section = page.locator("#page-setup")
    expect(page_setup_section).to_have_class(re.compile(r"content__section is-active"))
    expect(page_setup_section).to_be_visible()

    # 4. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_course_builder(page)
        finally:
            browser.close()

if __name__ == "__main__":
    main()
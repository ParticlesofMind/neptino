from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000/src/pages/teacher/coursebuilder.html")

    # 1. Fill in the course essentials form
    page.get_by_label("Course Name").fill("My Test Course with Spaces")
    page.get_by_label("Course Description").fill("This is a test course description with spaces.")
    page.get_by_label("Course Language").select_option("en")

    # 2. Upload an image
    page.get_by_label("Course Image").set_input_files("src/assets/logo/octopus-logo.png")

    # 3. Take a screenshot of the form with the image preview
    page.screenshot(path="jules-scratch/verification/course-essentials-form.png")

    # 4. Click the "Create Course" button
    page.get_by_role("button", name="Create Course").click()

    # 5. Wait for the button to be disabled and the text to change
    expect(page.get_by_role("button", name="Created Course")).to_be_disabled()

    # 6. Take a screenshot of the disabled button
    page.screenshot(path="jules-scratch/verification/created-course-button.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
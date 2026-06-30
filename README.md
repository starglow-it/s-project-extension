# Task Zip + Rubric Grabber v1.2.8

## New automation flow (Snorkel + ChatGPT)

The extension now supports a 2-part workflow:

1. Snorkel part
- Sub-1: Get data from review page (existing)
- Sub-2: Fill snorkel form fields from ChatGPT JSON

2. ChatGPT part
- Send extracted data to ChatGPT S-Project-Review page
- Read latest assistant response and parse JSON

### Added controls

- `Run ChatGPT (active tab)`
  - Use this when active tab is ChatGPT S-Project-Review page.
- `Fill Snorkel (active tab)`
  - Use this when active tab is snorkel review page.
- `Auto Run (Snorkel -> ChatGPT -> Fill)`
  - One-click flow:
    - Extract snorkel data
    - Click snorkel source download button
    - Open ChatGPT URL
    - Submit prompt and parse JSON
    - Return to snorkel tab and fill form

### File API support

Downloaded zip is mapped to file API URL:

`http://localhost:3334/files/<zip_file_name>`

The generated URL is included in the payload sent to ChatGPT and shown in the side panel.

## Current workflow

- **Get Data** extracts:
  - Zipfile name
  - Difficulty
  - Reviewer Feedback
  - Summary text
  - Rubric text, if available
- **Download Source** downloads the source zip after data is extracted.
- **Copy Text for Reviewer** now copies:
  1. The reviewer prompt/instruction text uploaded by the user.
  2. A header:

```text
---------------------
```

  3. The difficulty/rubric formatted block.

## Empty rubric format

```text
Difficulty: HARD

There is no rubric for this task.
```

## Rubric exists format

```text
Difficulty: HARD

This is the rubric for task.
...
```

## Change in v1.2.0

Renamed the copy button from **Copy Formatted Text** to **Copy Text for Reviewer**.


## Change in v1.2.1

Added **Download Checking files** button under **Download Source**.

When clicked, it finds and clicks the page button with visible text:

```text
Download File
```

It prefers the button that also contains the `lucide-download` icon.


## Change in v1.2.2

Reviewer Feedback cleanup now removes this UI-only line:

```text
Do you disagree with the reviewer feedback?
```

Only the actual reviewer feedback message is displayed/copied.


## Change in v1.2.3

Changed sidebar textarea height to `110px`.


## Change in v1.2.4

Added **Summary text** extraction from the Summary Monaco editor. The Summary editor is expanded to `4000px` during DOM fallback extraction, a **Copy Summary** button was added, and the task page scroll is reset to the top after **Get Data** finishes.


## 1.2.6

- After Get Data finishes extraction, the task page is forced back to the top, including custom scroll containers.


## 1.2.8

- Updated **Formatted Text** to use the latest reviewer prompt text from the uploaded prompt file.
- Kept the existing Difficulty and Rubric block under the prompt.

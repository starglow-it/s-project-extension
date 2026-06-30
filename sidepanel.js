const startBtn = document.getElementById("startBtn");
const downloadSourceBtn = document.getElementById("downloadSourceBtn");
const downloadCheckingFilesBtn = document.getElementById("downloadCheckingFilesBtn");
const loadTestModeBtn = document.getElementById("loadTestModeBtn");
const runChatGptBtn = document.getElementById("runChatGptBtn");
const fillSnorkelBtn = document.getElementById("fillSnorkelBtn");
const autoRunBtn = document.getElementById("autoRunBtn");
const statusBox = document.querySelector(".status");
const statusText = document.getElementById("statusText");
const reviewTabBtn = document.getElementById("reviewTabBtn");
const revisionTabBtn = document.getElementById("revisionTabBtn");
const reviewTabContent = document.getElementById("reviewTabContent");
const revisionTabContent = document.getElementById("revisionTabContent");

const zipNameInput = document.getElementById("zipName");
const reviewerFeedbackTextarea = document.getElementById("reviewerFeedback");
const summaryTextarea = document.getElementById("summary");
const rubricTextarea = document.getElementById("rubric");
const difficultyExplanationTextarea = document.getElementById("difficultyExplanation");
const solutionExplanationTextarea = document.getElementById("solutionExplanation");
const verificationExplanationTextarea = document.getElementById("verificationExplanation");
const formattedTextarea = document.getElementById("formattedText");
const chatgptUrlInput = document.getElementById("chatgptUrl");
const fileApiUrlInput = document.getElementById("fileApiUrl");
const reviewAhtMinInput = document.getElementById("reviewAhtMin");
const reviewAhtMaxInput = document.getElementById("reviewAhtMax");
const chatgptJsonTextarea = document.getElementById("chatgptJson");
const revisionZipNameInput = document.getElementById("revisionZipName");
const revisionReviewerFeedbackTextarea = document.getElementById("revisionReviewerFeedback");
const revisionSummaryTextarea = document.getElementById("revisionSummary");
const revisionRubricTextarea = document.getElementById("revisionRubric");
const revisionDifficultyExplanationTextarea = document.getElementById("revisionDifficultyExplanation");
const revisionSolutionExplanationTextarea = document.getElementById("revisionSolutionExplanation");
const revisionVerificationExplanationTextarea = document.getElementById("revisionVerificationExplanation");
const revisionChatgptUrlInput = document.getElementById("revisionChatgptUrl");
const revisionBatchSizeInput = document.getElementById("revisionBatchSize");
const scanRevisionListBtn = document.getElementById("scanRevisionListBtn");
const startRevisionBatchBtn = document.getElementById("startRevisionBatchBtn");
const addCurrentRevisionPageBtn = document.getElementById("addCurrentRevisionPageBtn");
const pauseRevisionQueueBtn = document.getElementById("pauseRevisionQueueBtn");
const resumeRevisionQueueBtn = document.getElementById("resumeRevisionQueueBtn");
const manualCheckFeedbackBtn = document.getElementById("manualCheckFeedbackBtn");
const clearFinishedRevisionJobsBtn = document.getElementById("clearFinishedRevisionJobsBtn");
const autoSendNoFixRevisionsInput = document.getElementById("autoSendNoFixRevisions");
const enableGenerateRubricAfterUploadInput = document.getElementById("enableGenerateRubricAfterUpload");
const autoCheckSendReviewerAfterFixedUploadInput = document.getElementById("autoCheckSendReviewerAfterFixedUpload");
const forceFullResendInput = document.getElementById("forceFullResend");
const revisionQueueStatsEl = document.getElementById("revisionQueueStats");
const revisionJobsListEl = document.getElementById("revisionJobsList");

const copyZipBtn = document.getElementById("copyZipBtn");
const copyReviewerFeedbackBtn = document.getElementById("copyReviewerFeedbackBtn");
const copySummaryBtn = document.getElementById("copySummaryBtn");
const copyRubricBtn = document.getElementById("copyRubricBtn");
const copyDifficultyExplanationBtn = document.getElementById("copyDifficultyExplanationBtn");
const copySolutionExplanationBtn = document.getElementById("copySolutionExplanationBtn");
const copyVerificationExplanationBtn = document.getElementById("copyVerificationExplanationBtn");
const copyFormattedBtn = document.getElementById("copyFormattedBtn");
const copyFileApiUrlBtn = document.getElementById("copyFileApiUrlBtn");
const copyChatgptJsonBtn = document.getElementById("copyChatgptJsonBtn");

let currentZipFileName = "";
let currentDifficulty = "";
let currentExtractedData = null;
let snorkelExtractionCache = {
  byTabId: {},
  byUrl: {}
};

const DEFAULT_CHATGPT_URL = "https://chatgpt.com/";
const DEFAULT_REVISION_CHATGPT_URL = "https://chatgpt.com/s-project";
const FILE_API_BASE_URL = "http://localhost:3334/files";
const DEFAULT_REVIEW_AHT_MIN = 10;
const DEFAULT_REVIEW_AHT_MAX = 20;
const DEFAULT_REVISION_BATCH_SIZE = 5;
const DEFAULT_SIDEBAR_TAB = "review";
const REVISION_FORM_LOAD_TIMEOUT_MS = 60000;
const REVISION_FORM_LOAD_POLL_MS = 1500;
const REVISION_FORM_REFRESH_RETRIES = 1;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FIX_FEEDBACK_PREFIX = "Fix this task based on this feedback:";

function buildFixFeedbackText(text) {
  const clean = String(text || "").trim();

  if (!clean) return "";

  if (clean.toLowerCase().startsWith(FIX_FEEDBACK_PREFIX.toLowerCase())) {
    return clean;
  }

  return `${FIX_FEEDBACK_PREFIX}
${clean}`;
}

function setStatus(message, type = "") {
  statusText.textContent = message;
  statusBox.className = "status";
  if (type) statusBox.classList.add(type);
}

function logExtension(event, details = {}) {
  try {
    console.log("[s-project-extension]", event, {
      at: new Date().toISOString(),
      ...details
    });
  } catch {}
}

function logRevision(event, jobOrDetails = {}, extraDetails = {}) {
  try {
    const isJob = jobOrDetails && typeof jobOrDetails === "object" && (jobOrDetails.id || jobOrDetails.type === "revision");
    const details = isJob
      ? {
          jobId: jobOrDetails.id || "",
          taskUuid: jobOrDetails.taskUuid || jobOrDetails.listUuid || "",
          status: jobOrDetails.status || "",
          classification: jobOrDetails.classification || "",
          snorkelTabId: jobOrDetails.snorkelTabId || null,
          chatGptTabId: jobOrDetails.chatGptTabId || null,
          ...extraDetails
        }
      : { ...jobOrDetails, ...extraDetails };

    console.log("[s-project-extension][revision]", event, {
      at: new Date().toISOString(),
      ...details
    });
  } catch {}
}

function setBusy(isBusy) {
  startBtn.disabled = isBusy;
  startBtn.textContent = isBusy ? "Running..." : "Get Data";
}

function updateDownloadSourceState() {
  downloadSourceBtn.disabled = !currentZipFileName.trim();
  fileApiUrlInput.value = buildFileApiUrl(currentZipFileName);
}

function buildFileApiUrl(filename) {
  const clean = String(filename || "").trim();
  if (!clean) return "";
  return `${FILE_API_BASE_URL}/${encodeURIComponent(clean)}`;
}

function buildUniqueZipFilename(filename) {
  const clean = String(filename || "").trim();
  if (!clean) return "";

  const hasZip = /\.zip$/i.test(clean);
  const baseName = hasZip ? clean.replace(/\.zip$/i, "") : clean;

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const shortId = Math.random().toString(36).slice(2, 8);

  return `${baseName}_${yyyy}${mm}${dd}_${hh}${min}${ss}_${shortId}.zip`;
}

function buildRevisionResultZipFilename(sourceName, fallbackBase = "task") {
  const clean = String(sourceName || "").trim();
  const baseName = (clean ? clean.replace(/\.zip$/i, "") : fallbackBase).trim() || fallbackBase;
  const versionMatch = baseName.match(/^(.*?)-v(\d+)$/i);

  if (versionMatch) {
    const nextVersion = Number(versionMatch[2]) + 1;
    return `${versionMatch[1]}-v${nextVersion}.zip`;
  }

  return `${baseName}-v2.zip`;
}

function getChatGptUrl() {
  const raw = String(chatgptUrlInput.value || "").trim() || DEFAULT_CHATGPT_URL;
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error("ChatGPT URL must start with http:// or https://");
  }
  return raw;
}

function setAllBusy(isBusy) {
  setBusy(isBusy);
  downloadSourceBtn.disabled = isBusy || !currentZipFileName.trim();
  downloadCheckingFilesBtn.disabled = isBusy;
  loadTestModeBtn.disabled = isBusy;
  runChatGptBtn.disabled = isBusy;
  fillSnorkelBtn.disabled = isBusy;
  autoRunBtn.disabled = isBusy;
}

function setSidebarTab(tabName) {
  const isRevision = tabName === "revision";
  if (reviewTabContent) reviewTabContent.hidden = isRevision;
  if (revisionTabContent) revisionTabContent.hidden = !isRevision;

  if (reviewTabBtn) {
    reviewTabBtn.classList.toggle("is-active", !isRevision);
    reviewTabBtn.setAttribute("aria-selected", String(!isRevision));
  }

  if (revisionTabBtn) {
    revisionTabBtn.classList.toggle("is-active", isRevision);
    revisionTabBtn.setAttribute("aria-selected", String(isRevision));
  }
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function normalizeReviewAhtRange(minValue, maxValue) {
  const min = parsePositiveInt(minValue, DEFAULT_REVIEW_AHT_MIN);
  const max = parsePositiveInt(maxValue, DEFAULT_REVIEW_AHT_MAX);

  if (min <= max) {
    return { min, max };
  }

  return { min: max, max: min };
}

function inferDifficultyFromSummaryText(summaryText) {
  const match = String(summaryText || "").match(/Difficulty:\s*(?:✅\s*)?(EASY|MEDIUM|HARD|TRIVIAL)\b/i);
  return match ? String(match[1] || "").toUpperCase() : "";
}

function normalizePageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return raw;
  }
}

function toCachedPanelData(extracted, pageUrl = "") {
  const source = extracted && typeof extracted === "object" ? extracted : {};
  const zipFileName = String(
    source.zipFileName ||
    source.sourceZipFileName ||
    ""
  ).trim();
  const difficulty = String(source.difficulty || inferDifficultyFromSummaryText(source.summaryText || "")).trim().toUpperCase();

  return {
    zipFileName,
    difficulty,
    reviewerFeedbackText: String(source.reviewerFeedbackText || source.testReviewText || ""),
    summaryText: String(source.summaryText || ""),
    rubricText: String(source.rubricText || ""),
    difficultyExplanation: String(source.difficultyExplanation || ""),
    solutionExplanation: String(source.solutionExplanation || ""),
    verificationExplanation: String(source.verificationExplanation || ""),
    currentPageUrl: normalizePageUrl(pageUrl || source.currentPageUrl || ""),
    extractedAt: source.extractedAt || nowIso()
  };
}

function pruneExtractionCacheIfNeeded() {
  const byTabIdEntries = Object.entries(snorkelExtractionCache.byTabId || {});
  if (byTabIdEntries.length <= 120) return;

  byTabIdEntries
    .sort((a, b) => String(a[1]?.updatedAt || "").localeCompare(String(b[1]?.updatedAt || "")))
    .slice(0, byTabIdEntries.length - 120)
    .forEach(([key]) => {
      delete snorkelExtractionCache.byTabId[key];
    });
}

async function persistSnorkelExtractionCache() {
  await chrome.storage.local.set({ snorkelExtractionCache });
}

async function cacheSnorkelExtractionForTab(tabId, pageUrl, extractedData, source = "") {
  const normalizedUrl = normalizePageUrl(pageUrl);
  const panelData = toCachedPanelData(extractedData, normalizedUrl);
  const entry = {
    tabId: Number.isFinite(Number(tabId)) ? Number(tabId) : null,
    url: normalizedUrl,
    panelData,
    source,
    updatedAt: nowIso()
  };

  if (entry.tabId) {
    snorkelExtractionCache.byTabId[String(entry.tabId)] = entry;
  }
  if (normalizedUrl) {
    snorkelExtractionCache.byUrl[normalizedUrl] = entry;
  }

  pruneExtractionCacheIfNeeded();
  await persistSnorkelExtractionCache();
  logRevision("snorkel-cache-saved", {
    tabId: entry.tabId,
    url: entry.url,
    source,
    zipFileName: panelData.zipFileName || "",
    extractedAt: panelData.extractedAt || ""
  });
}

function getCachedSnorkelExtraction(tabId, pageUrl) {
  const tabKey = Number.isFinite(Number(tabId)) ? String(Number(tabId)) : "";
  if (tabKey && snorkelExtractionCache.byTabId?.[tabKey]) {
    return snorkelExtractionCache.byTabId[tabKey];
  }

  const normalizedUrl = normalizePageUrl(pageUrl);
  if (normalizedUrl && snorkelExtractionCache.byUrl?.[normalizedUrl]) {
    return snorkelExtractionCache.byUrl[normalizedUrl];
  }

  return null;
}

function applyCachedSnorkelExtractionToPanel(entry) {
  if (!entry?.panelData) return false;
  applyPanelData(entry.panelData);
  logRevision("snorkel-cache-applied", {
    tabId: entry.tabId || null,
    url: entry.url || "",
    source: entry.source || "",
    updatedAt: entry.updatedAt || ""
  });
  return true;
}

async function restoreCachedSnorkelExtractionForActiveTab() {
  try {
    const tab = await getActiveTab();
    const cached = getCachedSnorkelExtraction(tab.id, tab.url || "");
    if (!cached) return false;
    return applyCachedSnorkelExtractionToPanel(cached);
  } catch {
    return false;
  }
}

function getReviewAhtRange() {
  return normalizeReviewAhtRange(reviewAhtMinInput.value, reviewAhtMaxInput.value);
}

async function persistReviewAhtRange() {
  const range = getReviewAhtRange();
  reviewAhtMinInput.value = String(range.min);
  reviewAhtMaxInput.value = String(range.max);
  await chrome.storage.local.set({
    reviewAhtMin: range.min,
    reviewAhtMax: range.max
  });
}

function applyPanelData(data) {
  currentZipFileName = String(data?.zipFileName || "").trim();
  currentDifficulty = String(data?.difficulty || "").trim().toUpperCase();
  currentExtractedData = {
    zipFileName: currentZipFileName,
    difficulty: currentDifficulty,
    reviewerFeedbackText: String(data?.reviewerFeedbackText || ""),
    summaryText: String(data?.summaryText || ""),
    rubricText: String(data?.rubricText || ""),
    difficultyExplanation: String(data?.difficultyExplanation || ""),
    solutionExplanation: String(data?.solutionExplanation || ""),
    verificationExplanation: String(data?.verificationExplanation || ""),
    extractedAt: new Date().toISOString(),
    testMode: Boolean(data?.testMode)
  };

  zipNameInput.value = currentZipFileName;
  reviewerFeedbackTextarea.value = currentExtractedData.reviewerFeedbackText;
  summaryTextarea.value = currentExtractedData.summaryText;
  rubricTextarea.value = currentExtractedData.rubricText;
  difficultyExplanationTextarea.value = currentExtractedData.difficultyExplanation;
  solutionExplanationTextarea.value = currentExtractedData.solutionExplanation;
  verificationExplanationTextarea.value = currentExtractedData.verificationExplanation;

  if (data?.chatgptUrl) {
    chatgptUrlInput.value = String(data.chatgptUrl).trim();
  }

  updateFormattedCopyState();
  updateDownloadSourceState();
  syncRevisionSnapshotFields();
}

function syncRevisionSnapshotFields() {
  if (revisionZipNameInput) revisionZipNameInput.value = zipNameInput.value || "";
  if (revisionReviewerFeedbackTextarea) revisionReviewerFeedbackTextarea.value = reviewerFeedbackTextarea.value || "";
  if (revisionSummaryTextarea) revisionSummaryTextarea.value = summaryTextarea.value || "";
  if (revisionRubricTextarea) revisionRubricTextarea.value = rubricTextarea.value || "";
  if (revisionDifficultyExplanationTextarea) revisionDifficultyExplanationTextarea.value = difficultyExplanationTextarea.value || "";
  if (revisionSolutionExplanationTextarea) revisionSolutionExplanationTextarea.value = solutionExplanationTextarea.value || "";
  if (revisionVerificationExplanationTextarea) revisionVerificationExplanationTextarea.value = verificationExplanationTextarea.value || "";
}

async function loadTestMode() {
  setAllBusy(true);
  setStatus("Status: Loading test mode...");

  try {
    const response = await fetch(chrome.runtime.getURL("test_mode_data.json"), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Failed to load test mode data (HTTP ${response.status}).`);
    }

    const data = await response.json();
    applyPanelData({
      ...data,
      testMode: true
    });

    await chrome.storage.local.set({
      chatgptUrl: chatgptUrlInput.value,
      lastResult: currentExtractedData,
      testModeData: data
    });

    setStatus("Status: Test mode loaded", "ok");
  } catch (err) {
    setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
  } finally {
    setAllBusy(false);
    updateDownloadSourceState();
  }
}

const REVIEWER_PROMPT_PREFIX = "You are a strict but fair Terminus Edition 2 reviewer for S-Project.\n\nReview the attached task ZIP, run summaries, human feedback, rubric text, and all available project source files before giving a verdict. Apply the latest project rules first. Accepted older ZIPs are only pattern evidence, not permission to copy old categories, old Docker bases, old rubric style, or outdated verifier patterns.\n\nYour job is to decide whether the task is review-ready or needs revision.\n\nCore reviewer rule:\n\nAccept clean tasks.\nReject only proven blockers.\nSelect categories only with evidence.\nFull sweep, no guesses.\n\nDo not reject for vague concerns, personal style preferences, or “could be better” comments.\nDo not accept only because the oracle passes.\nDo not stop after finding the first problem.\nDo not over-select categories.\nDo not invent issues.\nDo not mark difficulty from intuition.\n\nVerdict rule:\n\n* Mark Accept only if there is no concrete blocker.\n* Mark Needs Revision only if you can point to a specific file, check, rule, test, rubric issue, run artifact, platform artifact, or behavior.\n* If Needs Revision, continue the full sweep and check every category before finalizing.\n* For every selected category, write an evidence sentence:\n  “I selected CATEGORY because FILE/CHECK/BEHAVIOR has PROBLEM.”\n\nUse only these revision categories, exactly as written:\n\n* Instruction Styling\n* Test Alignment/Coverage Issues\n* Exposing Hints/Answers\n* Oracle Solution Issues\n* Test Build Issues\n* Time Based Tests\n* Task Difficulty\n* Metadata Issues\n* Milestones\n* uses Internet\n* Agent Timeout\n* Wrong Coding Language\n* Canary Strings\n* Rubric\n* Test Dependency Location\n* Pinning Issues\n* Environment\n* Other\n\nReview process:\n\n1. Inspect the full task package\n\n   * instruction.md\n   * task.toml\n   * environment/Dockerfile\n   * environment/.dockerignore\n   * environment/app files\n   * environment/app/docs files\n   * fixtures and starter data\n   * tests/test.sh\n   * tests/test_outputs.py or other verifier files\n   * tests/conftest.py if present\n   * solution/solve.sh and solution helpers\n   * milestone layout if present\n   * rubric text from the platform UI\n   * run summaries, if provided\n   * human feedback, if provided\n\n2. Check instruction.md\n\n   * It should be concise and human-style.\n   * It should use absolute /app paths.\n   * It should explain the task goal.\n   * It should name the command/CLI or application surface.\n   * It should name output files or output directory.\n   * It should point to /app/docs as the public contract source.\n   * It should not be a giant schema dump.\n   * It should not be too vague.\n   * It should not list exact bugs, solution steps, test names, hidden verifier details, canary strings, or task-name clutter.\n\n3. Check public docs and contract-test alignment\n\n   * Every exact verifier assertion must be documented in instruction.md or /app/docs.\n   * Every important public contract rule must have behavioral test coverage.\n   * Check exact output filenames.\n   * Check output fields and field types.\n   * Check warning/error codes.\n   * Check severity mapping per code.\n   * Check exact warning detail strings if tests assert them.\n   * Check source path/source id/source metadata rules.\n   * Check sorting keys and tie-breakers.\n   * Check null vs blank vs missing vs omitted vs zero behavior.\n   * Check alias/canonicalization rules.\n   * Check duplicate handling.\n   * Check fallback/inheritance/override behavior.\n   * Check timestamp parsing, timezone, rounding, and boundary behavior.\n   * Check malformed input behavior.\n   * Check stale-output cleanup and rerun/idempotency behavior.\n   * If tests enforce behavior that docs do not clearly state, select Test Alignment/Coverage Issues.\n   * If docs require important behavior that tests never cover, select Test Alignment/Coverage Issues.\n\n4. Check tests/test.sh and verifier harness\n\n   * It should create /logs/verifier.\n   * It should prewrite /logs/verifier/reward.txt with 0 before pytest.\n   * It should produce /logs/verifier/ctrf.json.\n   * It should run pytest in a platform-visible way, usually:\n     python3 -m pytest --ctrf /logs/verifier/ctrf.json /tests/test_outputs.py -rA\n   * It should capture rc immediately after pytest.\n   * It should write binary reward 0 or 1.\n   * It should end with the final reward block.\n   * It should not run package installs or downloads at runtime.\n   * It should not use npm/Jest/Mocha/Go test/Rust cargo test directly as the only verifier if pytest/CTRF is required.\n   * If the verifier cannot run, cannot report CTRF, may exit before reward, uses wrong paths, or validates agents differently from oracle, select Test Build Issues.\n\n5. Check test dependency location\n\n   * Verifier dependencies should be available in the Docker image or from local files.\n   * tests/test.sh should not install pytest plugins, npm packages, pip packages, apt packages, uv packages, or other dependencies at runtime.\n   * If pytest --ctrf is used, confirm a real plugin or local conftest.py shim exists.\n   * If the concrete problem is a missing/unavailable/misplaced test dependency, select Test Dependency Location.\n   * Do not use Test Dependency Location for general test.sh shape problems; those are Test Build Issues.\n\n6. Check Docker and environment\n\n   * Dockerfile should use a digest-pinned FROM image.\n   * Final runtime image should be canonical/sanctioned when available, or have credible justification.\n   * WORKDIR /app should be set early.\n   * tmux and asciinema should be installed when required by project rules.\n   * Verifier dependencies should be installed at build time.\n   * Dockerfile should not copy tests/, solution/, instruction.md, or task.toml into /app.\n   * .dockerignore should exclude tests, solution, instruction.md, task.toml, node_modules, dist, logs, caches, secrets, and generated clutter.\n   * Environment should not expose answer files, hidden tests, expected outputs, or solution helpers.\n   * If the Docker/runtime package is broken, missing required tools, copies forbidden files, leaks answers, or has bad WORKDIR/context issues, select Environment.\n\n7. Check internet usage\n\n   * If task.toml has allow_internet=false, then tests, oracle, and runtime must not require internet.\n   * No npm install, pip install, apt-get, curl, wget, uv, git clone, registry downloads, API calls, model downloads, or external services should be needed at solve/test time.\n   * If internet is required but allow_internet=false, select uses Internet.\n   * If allow_internet=true but the task does not genuinely need internet, mention Metadata Issues or uses Internet depending on the platform rule being violated.\n\n8. Check metadata\n\n   * task.toml should be complete.\n   * category should match the task’s real primary activity.\n   * Do not use software-engineering or debugging for net-new tasks unless current rules explicitly allow it.\n   * subcategories should be valid and truly supported by the task.\n   * difficulty should match run evidence when evidence is available.\n   * languages should list the application language, not verifier-only Python.\n   * codebase_size should match the task.\n   * number_of_milestones should match actual layout.\n   * allow_internet should be honest.\n   * timeouts should be reasonable.\n   * If any required field is wrong or missing, select Metadata Issues.\n   * If the app language and task.toml language disagree, select Wrong Coding Language.\n\n9. Check rubric\n\n   * Rubric must be reviewed separately from the ZIP.\n   * For non-milestone tasks, rubric should be flat Agent lines.\n   * For milestone tasks, rubric should have one block per milestone.\n   * Positive score total should be around 10–40.\n   * There should be at least 3 negative criteria.\n   * Scores should be signed and valid.\n   * Criteria should be task-specific and trace-observable.\n   * Rubric should not mention tests, hidden verifier, oracle, NOP, task.toml, metadata, or “passes all tests.”\n   * Rubric should not reward behavior contradicted by docs/tests.\n   * If rubric is missing, invalid, too generic, uses wrong format, has too few negatives, references forbidden artifacts, or does not match milestone structure, select Rubric.\n\n10. Check oracle\n\n* solution/solve.sh should be deterministic and idempotent.\n* It should solve the real task, not hardcode expected output files.\n* It should not modify tests, fixtures, reward files, or hidden verifier behavior.\n* It should not need internet unless internet is explicitly allowed.\n* It should not ship a full fixed source tree unless there is a strong reason.\n* It should not expose answer keys.\n* If oracle fails, is nondeterministic, hardcodes outputs, edits tests/fixtures, leaks answers, or does not solve the task, select Oracle Solution Issues.\n\n11. Check answer/hint exposure\n\n* Search for expected outputs, answer keys, hidden verifier hints, solution files copied into environment, and visible fixed source.\n* Search for BUG, TODO, FIXME, “oracle”, “expected output”, “answer key”, “golden”, “hidden”, and skeleton completion plans.\n* Source comments should not reveal exact bug mechanisms.\n* Docs should define the contract, not give an algorithm walkthrough.\n* If visible materials reveal the answer, solution method, hidden expected outputs, or exact bug locations, select Exposing Hints/Answers.\n\n12. Check time-based tests\n\n* Tests should not depend on the current date/time unless fixed by fixtures and public docs.\n* Avoid wall-clock sleeps, race timing, real current time, unstable time zones, or date windows that change over time.\n* If time behavior is required, it should use fixed timestamps and deterministic timezone rules.\n* If tests are flaky or time-dependent, select Time Based Tests.\n\n13. Check milestones, if applicable\n\n* Milestone tasks should use steps/milestone_N/ layout if current rules require it.\n* Each milestone should have its own instruction, tests, and solution.\n* task.toml should have matching number_of_milestones and [[steps]] blocks.\n* Per-milestone tests should only verify that milestone.\n* Earlier milestone instructions/tests should not spoil later milestones.\n* Rubric should be split by milestone.\n* If layout, scope, tests, solutions, or rubric are wrong for milestones, select Milestones.\n\n14. Check pinning\n\n* FROM images must be digest-pinned with @sha256.\n* Required package or verifier dependencies should be pinned when current rules require it.\n* No floating latest images.\n* If pinning is missing or base-image policy is violated, select Pinning Issues.\n\n15. Check canary strings\n\n* Search all task files for canary strings or skeleton markers.\n* If any canary is visible, select Canary Strings.\n\n16. Check agent timeout\n\n* Use this only when there is evidence that the agent timeout, build timeout, or verifier timeout is too low for normal task execution.\n* Do not select Agent Timeout because the task looks hard.\n* Select Agent Timeout if runs fail due to avoidable timeout settings, huge files, long sleeps, expensive setup, or slow verifier design.\n\n17. Check task difficulty\n\n* Judge difficulty only from run evidence.\n* If both frontier models pass too often, the task may be too easy/trivial.\n* If task.toml says hard but run evidence says medium, select Task Difficulty and Metadata Issues if metadata must be updated.\n* If all agents fail the same single edge case, suspect Test Alignment/Coverage Issues before calling it hard.\n* If verifier_did_not_run occurs, first distinguish platform/runtime/test-build failure from true difficulty.\n* Do not select Task Difficulty from intuition alone.\n\n18. Check wrong coding language\n\n* task.toml languages should list the app language.\n* Do not list Python only because pytest is used as verifier.\n* If the task claims Node.js but app implementation is mostly Python, or languages is incorrect, select Wrong Coding Language.\n\n19. Check ZIP hygiene and package cleanliness\n\n* ZIP should not be nested.\n* It should not include **pycache**, .pytest_cache, .pyc, node_modules, dist, logs, generated outputs, .DS_Store, completion_plan.md, skeleton leftovers, or temporary files.\n* If this is a concrete blocker and no other category fits better, select Other or Environment depending on the issue.\n\nCategory selection guide:\n\nInstruction Styling:\nSelect when instruction.md is too vague, too dense, too hinty, too synthetic, missing absolute /app paths, missing goal/command/output context, or reads like a schema dump.\n\nTest Alignment/Coverage Issues:\nSelect when tests enforce undocumented behavior, docs require untested important behavior, or docs/tests contradict each other.\n\nExposing Hints/Answers:\nSelect when visible files expose expected outputs, fixed code, solution logic, bug comments, test names, hidden verifier hints, answer keys, or completion plans.\n\nOracle Solution Issues:\nSelect when solution/solve.sh fails, hardcodes outputs, is nondeterministic, modifies tests/fixtures/reward files, requires unexpected internet, or does not solve the prompt.\n\nTest Build Issues:\nSelect when tests/test.sh, pytest, CTRF, reward writing, test paths, Docker startup, or verifier execution/reporting is broken.\n\nTime Based Tests:\nSelect when tests depend on current time, sleeps, races, unfixed time zones, or date behavior that changes over time.\n\nTask Difficulty:\nSelect only from run evidence showing too easy/trivial, difficulty mismatch, or unfair hidden ambiguity.\n\nMetadata Issues:\nSelect for wrong/missing task.toml or platform metadata: category, subcategories, difficulty, language, codebase size, milestones, timeouts, or allow_internet.\n\nMilestones:\nSelect for milestone layout, step scope, per-milestone tests/solutions, [[steps]], number_of_milestones, or milestone rubric problems.\n\nuses Internet:\nSelect when runtime/test/oracle requires internet against allow_internet=false, or when internet setting is dishonest.\n\nAgent Timeout:\nSelect when timeout settings or task design cause avoidable timeout failures.\n\nWrong Coding Language:\nSelect when languages metadata or task framing does not match the actual app language.\n\nCanary Strings:\nSelect when a canary or skeleton marker is visible anywhere.\n\nRubric:\nSelect when rubric is missing, invalid, has too few negatives, wrong score format, forbidden references, wrong milestone structure, or is not task-specific.\n\nTest Dependency Location:\nSelect when verifier dependencies are missing, installed at runtime, unavailable offline, or not wired correctly.\n\nPinning Issues:\nSelect when Docker FROM is not digest-pinned or required dependencies/images are unpinned.\n\nEnvironment:\nSelect when Docker/environment packaging is broken, missing required tools, copies forbidden files, leaks answers, has bad WORKDIR, dirty context, or noncanonical runtime setup.\n\nOther:\nSelect only for concrete blockers that do not fit another category.\n\nOutput format:\n\nVerdict:\nAccept or Needs Revision\n\nReasoning:\nExplain the main reason for the verdict. If Accept, do not invent non-blocking issues. If Needs Revision, summarize the concrete blocker or blockers.\n\nSelected Categories:\nList only the selected categories from the approved category list.\n\nEvidence:\nFor each selected category, write:\n“I selected CATEGORY because FILE/CHECK/BEHAVIOR has PROBLEM.”\n\nReviewer feedback message:\nWrite a concise human-reviewer-style message the task author can act on. Explain what to fix, where to fix it, and why. Do not be vague.\n\nFinal category audit:\n\n* Instruction Styling: yes/no + reason\n* Test Alignment/Coverage Issues: yes/no + reason\n* Exposing Hints/Answers: yes/no + reason\n* Oracle Solution Issues: yes/no + reason\n* Test Build Issues: yes/no + reason\n* Time Based Tests: yes/no + reason\n* Task Difficulty: yes/no + reason\n* Metadata Issues: yes/no + reason\n* Milestones: yes/no + reason\n* uses Internet: yes/no + reason\n* Agent Timeout: yes/no + reason\n* Wrong Coding Language: yes/no + reason\n* Canary Strings: yes/no + reason\n* Rubric: yes/no + reason\n* Test Dependency Location: yes/no + reason\n* Pinning Issues: yes/no + reason\n* Environment: yes/no + reason\n* Other: yes/no + reason\n\nFinal self-check before answering:\n\n* Did you inspect instruction.md?\n* Did you inspect /app/docs?\n* Did you inspect tests/test.sh?\n* Did you check reward.txt and CTRF behavior?\n* Did you check pytest/verifier dependency location?\n* Did you check contract-test alignment both ways?\n* Did you check Dockerfile and forbidden COPY behavior?\n* Did you check allow_internet against runtime behavior?\n* Did you check task.toml metadata?\n* Did you check application language vs languages metadata?\n* Did you check oracle determinism and answer exposure?\n* Did you check rubric separately from the ZIP?\n* Did you check milestone structure if applicable?\n* Did you check pinning?\n* Did you check canary strings?\n* Did you avoid over-selecting categories?\n* Did you base Task Difficulty only on evidence?\n* Did you accept clean tasks and reject only proven blockers?\n\nMemory rule:\nAccept clean tasks. Reject proven blockers. Select categories only with evidence. Full sweep, no guesses.";

let reviewerPromptPrefix = REVIEWER_PROMPT_PREFIX;

async function loadReviewerPromptPrefix() {
  try {
    const response = await fetch(chrome.runtime.getURL("reviewer_prompt_prefix.txt"), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = String(await response.text()).trim();
    if (!text) {
      throw new Error("reviewer_prompt_prefix.txt is empty.");
    }

    reviewerPromptPrefix = text;
    updateFormattedCopyState();
  } catch (err) {
    setStatus(
      `Status: Warn - reviewer_prompt_prefix.txt load failed (${err?.message || String(err)}). Using fallback.`,
      "warn"
    );
  }
}

function buildFormattedText(difficulty, rubricText) {
  const cleanDifficulty = String(difficulty || "").trim();
  const cleanRubric = String(rubricText || "").trim();

  const difficultyAndRubric = !cleanRubric
    ? `Difficulty: ${cleanDifficulty}

There is no rubric for this task.`
    : `Difficulty: ${cleanDifficulty}

This is the rubric for task.
${cleanRubric}`;

  return `${reviewerPromptPrefix}

---------------------

${difficultyAndRubric}`;
}

function hasRequiredData() {
  return Boolean(currentZipFileName.trim() && currentDifficulty.trim());
}

function updateFormattedCopyState() {
  if (currentDifficulty) {
    formattedTextarea.value = buildFormattedText(
      currentDifficulty,
      rubricTextarea.value.trim()
    );
  } else {
    formattedTextarea.value = "";
  }

  copyFormattedBtn.disabled = !hasRequiredData();
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  if (!/^https?:\/\//i.test(tab.url || "")) {
    throw new Error("Open the task page first. Chrome extension pages cannot be scripted.");
  }

  return tab;
}

function pageExtractData() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalizeText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getField(testId) {
    return document.querySelector(`[data-testid="${testId}"]`);
  }

  function getTextNodes(root) {
    if (!root) return "";

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parts = [];
    let node;

    while ((node = walker.nextNode())) {
      const text = normalizeText(node.nodeValue);
      if (text) parts.push(text);
    }

    return normalizeText(parts.join("\n"));
  }

  function getZipName() {
    const field = getField("field-upload_a_zip_file");
    if (!field) throw new Error("Zip upload field not found.");

    const match = getTextNodes(field).match(/([A-Za-z0-9._()[\]\- ]+\.zip)\b/i);
    if (!match) throw new Error("Zip filename not found.");

    return match[1].trim();
  }

  function getDifficulty(textOverride = "") {
    const field = getField("field-text_summary");
    const text =
      normalizeText(textOverride) ||
      getMonacoText(field) ||
      getViewLinesText(field).text ||
      getTextNodes(field);
    const match = text.match(/Difficulty:\s*(?:✅\s*)?(EASY|MEDIUM|HARD|TRIVIAL)\b/i);
    return match ? match[1].toUpperCase() : "";
  }

  function getMonacoText(field) {
    if (!field || !window.monaco?.editor?.getModels) return "";

    const uriNodes = Array.from(field.querySelectorAll("[data-uri]"));

    for (const node of uriNodes) {
      const uri = node.getAttribute("data-uri");
      if (!uri) continue;

      const model = window.monaco.editor
        .getModels()
        .find((m) => String(m.uri) === uri || String(m.uri?.toString?.()) === uri);

      const text = normalizeText(model?.getValue?.() || "");
      if (text) return text;
    }

    return "";
  }

  function numericTop(el, fallback) {
    const ownTop = parseFloat(el.style?.top || "");
    if (Number.isFinite(ownTop)) return ownTop;

    const transform = String(el.style?.transform || "");
    const match = transform.match(/translate3d?\([^,]+,\s*(-?\d+(?:\.\d+)?)px/i);
    return match ? Number(match[1]) : fallback;
  }

  function getViewLinesText(scope) {
    if (!scope) return { text: "", lineCount: 0, height: 0 };

    const candidates = Array.from(
      scope.querySelectorAll(".view-lines.monaco-mouse-cursor-text, .view-lines")
    )
      .map((container) => {
        const lines = Array.from(container.querySelectorAll(".view-line"))
          .map((line, index) => ({
            top: numericTop(line, index),
            text: normalizeText(line.innerText || line.textContent || "")
          }))
          .filter((line) => line.text)
          .sort((a, b) => a.top - b.top);

        const text = normalizeText(lines.map((line) => line.text).join("\n"));
        const height = parseFloat(container.style?.height || "0") || 0;

        return {
          text,
          lineCount: lines.length,
          height,
          score: text.length + height + lines.length * 50
        };
      })
      .filter((candidate) => candidate.text);

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || { text: "", lineCount: 0, height: 0 };
  }

  function findRubricField() {
    return (
      getField("field-test_rubrics") ||
      Array.from(document.querySelectorAll('[data-testid^="field-"]')).find((field) =>
        /Agent-generated rubric\(s\)|#\s*Rubric|rubric/i.test(getTextNodes(field))
      ) ||
      null
    );
  }

  function cssName(prop) {
    return String(prop || "").replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
  }

  function rememberStyle(el, prop, store) {
    if (el) store.push([el, prop, el.style[prop]]);
  }

  function setEditorHeight(el, px, store) {
    if (!el) return;

    ["height", "maxHeight", "minHeight", "overflow"].forEach((prop) => {
      rememberStyle(el, prop, store);
    });

    el.style.setProperty("height", `${px}px`, "important");
    el.style.setProperty("max-height", "none", "important");
    el.style.setProperty("min-height", `${px}px`, "important");
    el.style.setProperty("overflow", "visible", "important");
  }

  function restoreStyles(store) {
    for (let i = store.length - 1; i >= 0; i -= 1) {
      const [el, prop, value] = store[i];
      if (!el) continue;

      try {
        if (value) {
          el.style[prop] = value;
        } else {
          el.style.removeProperty(cssName(prop));
          el.style[prop] = "";
        }
      } catch {}
    }

    window.dispatchEvent(new Event("resize"));
  }

  async function getExpandedEditorText(field, targetHeight) {
    if (!field) return "";

    const modelText = getMonacoText(field);
    const editor = field.querySelector(".monaco-editor") || field.querySelector('[role="code"]');
    if (!editor) return modelText || getViewLinesText(field).text || getTextNodes(field);

    const restore = [];
    const elementsToResize = [
      editor.closest("section")?.parentElement,
      editor.closest("section"),
      editor.parentElement,
      editor,
      editor.querySelector(".overflow-guard"),
      editor.querySelector(".editor-scrollable"),
      editor.querySelector(".lines-content"),
      editor.querySelector(".view-overlays"),
      editor.querySelector(".view-lines.monaco-mouse-cursor-text, .view-lines"),
      editor.querySelector(".margin"),
      editor.querySelector(".minimap"),
      editor.querySelector(".scrollbar.vertical, .visible.scrollbar.vertical")
    ];

    try {
      elementsToResize.forEach((el) => setEditorHeight(el, targetHeight, restore));

      editor.scrollIntoView({ block: "center", inline: "nearest" });
      window.dispatchEvent(new Event("resize"));
      await sleep(800);

      return modelText || getMonacoText(field) || getViewLinesText(field).text || getTextNodes(field);
    } catch {
      return modelText || getMonacoText(field) || getViewLinesText(field).text || "";
    } finally {
      restoreStyles(restore);
      await sleep(120);
    }
  }

  async function getSummaryText() {
    return getExpandedEditorText(getField("field-text_summary"), 4000);
  }

  async function getRubricText() {
    return getExpandedEditorText(findRubricField(), 5000);
  }

  function getSimpleTextareaText(id) {
    const textarea = document.getElementById(id);
    if (!textarea) return "";
    return normalizeText(textarea.value || "");
  }

  async function getReviewerFeedbackText() {
    function cleanReviewerFeedback(text) {
      return normalizeText(text)
        .replace(/^Reviewer Feedback\s*/i, "")
        .replace(/Do you disagree with the reviewer feedback\?/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    const button = Array.from(document.querySelectorAll("button")).find((btn) => {
      const titleNode = Array.from(btn.querySelectorAll("div, span")).some((node) =>
        /^Reviewer Feedback$/i.test(normalizeText(node.textContent || ""))
      );

      return titleNode || /^Reviewer Feedback$/i.test(normalizeText(btn.textContent || ""));
    });

    if (!button) return "";

    if (button.getAttribute("aria-expanded") !== "true") {
      try {
        button.click();
        await sleep(250);
      } catch {}
    }

    const controlsId = button.getAttribute("aria-controls");
    if (controlsId) {
      const panelText = cleanReviewerFeedback(getTextNodes(document.getElementById(controlsId)));
      if (panelText) return panelText;
    }

    const card =
      button.closest(".w-full.max-w-full.rounded-md.border") ||
      button.closest(".rounded-md.border") ||
      button.parentElement;

    const panel =
      button.nextElementSibling ||
      card?.querySelector(".px-16.pb-4") ||
      card?.querySelector("[id^='radix-']");

    return cleanReviewerFeedback(getTextNodes(panel));
  }

  async function scrollPageToTop() {
    const forceTop = () => {
      try {
        const candidates = new Set([
          document.scrollingElement,
          document.documentElement,
          document.body
        ]);

        document.querySelectorAll("body *").forEach((el) => {
          try {
            if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
              candidates.add(el);
            }
          } catch {}
        });

        candidates.forEach((el) => {
          if (!el) return;

          try {
            el.scrollTop = 0;
            el.scrollLeft = 0;
            if (typeof el.scrollTo === "function") {
              el.scrollTo({ top: 0, left: 0, behavior: "auto" });
            }
          } catch {}
        });

        window.scrollTo(0, 0);
      } catch {}
    };

    forceTop();
    await sleep(50);
    forceTop();
    await sleep(150);
    forceTop();
  }

  return (async () => {
    try {
      const zipFileName = getZipName();
      const summaryText = await getSummaryText();
      const difficulty = getDifficulty(summaryText);
      const reviewerFeedbackText = await getReviewerFeedbackText();
      const rubricText = await getRubricText();
      const difficultyExplanation = getSimpleTextareaText("difficulty_explanation");
      const solutionExplanation = getSimpleTextareaText("solution_explanation");
      const verificationExplanation = getSimpleTextareaText("verification_explanation");

      return {
        ok: true,
        zipFileName,
        difficulty,
        reviewerFeedbackText,
        summaryText,
        rubricText,
        difficultyExplanation,
        solutionExplanation,
        verificationExplanation,
        extractedAt: new Date().toISOString()
      };
    } finally {
      await scrollPageToTop();
    }
  })();
}

async function pageForceScrollToTop() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const forceTop = () => {
    try {
      const candidates = new Set([
        document.scrollingElement,
        document.documentElement,
        document.body
      ]);

      document.querySelectorAll("body *").forEach((el) => {
        try {
          if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
            candidates.add(el);
          }
        } catch {}
      });

      candidates.forEach((el) => {
        if (!el) return;

        try {
          el.scrollTop = 0;
          el.scrollLeft = 0;
          if (typeof el.scrollTo === "function") {
            el.scrollTo({ top: 0, left: 0, behavior: "auto" });
          }
        } catch {}
      });

      window.scrollTo(0, 0);
    } catch {}
  };

  forceTop();
  await sleep(50);
  forceTop();
  await sleep(150);
  forceTop();

  return { ok: true };
}

function pageDownloadSourceZip() {
  const field = document.querySelector('[data-testid="field-upload_a_zip_file"]');
  if (!field) throw new Error("Zip upload field not found.");

  const button =
    field.querySelector('button[title="Download file"]') ||
    field.querySelector('button[aria-label="Download file"]');

  if (!button) throw new Error("Zip download button not found.");

  button.click();
  return { ok: true };
}

function pageDownloadCheckingFiles() {
  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  const buttons = Array.from(document.querySelectorAll("button"));

  const button = buttons.find((btn) => {
    const text = normalizeText(btn.textContent || "");
    const hasDownloadIcon = Boolean(btn.querySelector("svg.lucide-download, svg[class*='lucide-download']"));

    return text === "Download File" && hasDownloadIcon;
  }) || buttons.find((btn) => normalizeText(btn.textContent || "") === "Download File");

  if (!button) {
    throw new Error('Checking files Download File button not found.');
  }

  button.scrollIntoView({ block: "center", inline: "nearest" });
  button.click();

  return { ok: true };
}

async function waitForTabComplete(tabId, timeoutMs = 60000) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.status === "complete") return;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Timed out while waiting for tab to finish loading."));
    }, timeoutMs);

    function onUpdated(updatedTabId, info) {
      if (updatedTabId !== tabId) return;
      if (info.status !== "complete") return;

      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function focusTabWindowById(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab?.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
  await chrome.tabs.update(tabId, { active: true });
}

function pageSuppressBeforeUnloadWarning() {
  try {
    if (window.__sProjectBeforeUnloadSuppressed) return { ok: true, alreadyInstalled: true };

    window.__sProjectBeforeUnloadSuppressed = true;
    window.onbeforeunload = null;
    window.addEventListener(
      "beforeunload",
      (event) => {
        event.stopImmediatePropagation();
        delete event.returnValue;
      },
      true
    );

    return { ok: true, alreadyInstalled: false };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function suppressBeforeUnloadWarningForTab(tabId, reason = "") {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: pageSuppressBeforeUnloadWarning
    });
    logRevision("beforeunload-suppressed", { tabId, reason, ok: Boolean(result?.ok), alreadyInstalled: Boolean(result?.alreadyInstalled), error: result?.error || null });
    return result;
  } catch (err) {
    logRevision("beforeunload-suppress-error", { tabId, reason, error: err?.message || String(err) });
    return { ok: false, error: err?.message || String(err) };
  }
}

function pageGetChatGptReadyState() {
  function findComposer() {
    return (
      document.querySelector("textarea#prompt-textarea") ||
      document.querySelector("#prompt-textarea") ||
      document.querySelector("textarea[data-testid='prompt-textarea']") ||
      document.querySelector("[data-testid='prompt-textarea']") ||
      document.querySelector("[contenteditable='true']#prompt-textarea") ||
      document.querySelector("[contenteditable='true'][data-lexical-editor='true']") ||
      document.querySelector("[contenteditable='true'][role='textbox']") ||
      document.querySelector("main [contenteditable='true']")
    );
  }

  const composer = findComposer();

  const sendButton =
    document.querySelector("button[data-testid='send-button']") ||
    document.querySelector("button[aria-label='Send message']") ||
    Array.from(document.querySelectorAll("button")).find((btn) =>
      /send/i.test(btn.getAttribute("aria-label") || "")
    );

  const attachButton =
    document.querySelector("button[aria-label*='Attach']") ||
    document.querySelector("button[aria-label*='Upload']") ||
    Array.from(document.querySelectorAll("button")).find((btn) => {
      const label = String(btn.getAttribute("aria-label") || "");
      const title = String(btn.getAttribute("title") || "");
      return /attach|upload|file/i.test(`${label} ${title}`);
    });

  return {
    ok: true,
    readyState: document.readyState,
    hasComposer: Boolean(composer),
    hasSendButton: Boolean(sendButton),
    hasAttachButton: Boolean(attachButton),
    title: document.title || ""
  };
}

async function waitForChatGptInteractive(tabId, timeoutMs = 120000) {
  const start = Date.now();
  logExtension("chatgpt-interactive-wait-start", { tabId, timeoutMs });

  while (Date.now() - start <= timeoutMs) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: pageGetChatGptReadyState
    });

    logExtension("chatgpt-interactive-poll", {
      tabId,
      elapsedMs: Date.now() - start,
      result
    });

    if (result?.hasComposer && result?.readyState === "complete") {
      logExtension("chatgpt-interactive-ready", { tabId, elapsedMs: Date.now() - start });
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("ChatGPT page did not become interactive.");
}

async function extractDataFromTabId(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: pageExtractData
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Extraction failed.");
  }

  return result;
}

async function downloadSourceZipForTabId(tabId, filename) {
  const uniqueFilename = buildUniqueZipFilename(filename);

  await chrome.runtime.sendMessage({
    type: "SET_NEXT_DOWNLOAD_FILENAME",
    filename: uniqueFilename
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: pageDownloadSourceZip
  });

  return uniqueFilename;
}

function buildChatGptPrompt(data) {
  const rubric = String(data?.rubricText || "").trim();
  const reviewerFeedback = String(data?.reviewerFeedbackText || "").trim();
  const includeReviewerFeedback = !/^AutoEval Execution\b/i.test(reviewerFeedback);

  const lines = [
    "Rubric:",
    rubric || "(empty)",
    ""
  ];

  if (includeReviewerFeedback) {
    lines.push("Reviewer feedback:");
    lines.push(reviewerFeedback || "(empty)");
  }

  return lines.join("\n");
}

function pageRunChatGptPrompt(firstPromptText, secondPromptText, attachments) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function log(event, details = {}) {
    try {
      console.log("[s-project-extension][chatgpt]", event, {
        at: new Date().toISOString(),
        ...details
      });
    } catch {}
  }

  function getJsonFromLatestCodeTag(root = document) {
    const codeTags = root.querySelectorAll("code");
    log("json-scan", { codeTagCount: codeTags.length });

    if (!codeTags.length) {
      return {
        valid: false,
        error: "No <code> tag found",
        value: null
      };
    }

    const latestCode = codeTags[codeTags.length - 1];
    const rawText = String(latestCode.textContent || "").trim();

    try {
      const jsonValue = JSON.parse(rawText);

      return {
        valid: true,
        value: jsonValue,
        error: null
      };
    } catch (err) {
      log("json-parse-failed", { error: err?.message || String(err) });
      return {
        valid: false,
        value: null,
        error: err?.message || String(err)
      };
    }
  }

  function setNativeValue(element, value) {
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findComposer() {
    return (
      document.querySelector("textarea#prompt-textarea") ||
      document.querySelector("#prompt-textarea") ||
      document.querySelector("textarea[data-testid='prompt-textarea']") ||
      document.querySelector("[data-testid='prompt-textarea']") ||
      document.querySelector("[contenteditable='true']#prompt-textarea") ||
      document.querySelector("[contenteditable='true'][data-lexical-editor='true']") ||
      document.querySelector("[contenteditable='true'][role='textbox']") ||
      document.querySelector("main [contenteditable='true']")
    );
  }

  function findAttachButton() {
    return (
      document.querySelector("button[aria-label*='Attach']") ||
      document.querySelector("button[aria-label*='Upload']") ||
      Array.from(document.querySelectorAll("button")).find((btn) => {
        const label = String(btn.getAttribute("aria-label") || "");
        const title = String(btn.getAttribute("title") || "");
        return /attach|upload|file/i.test(`${label} ${title}`);
      })
    );
  }

  function findFileInput() {
    return (
      document.querySelector("input[type='file']") ||
      document.querySelector("input[accept*='*']")
    );
  }

  function fillComposer(el, text) {
    if (!el) throw new Error("ChatGPT input composer not found.");
    log("composer-fill", {
      tagName: el.tagName,
      contentEditable: el.getAttribute("contenteditable"),
      textLength: String(text || "").length
    });
    el.focus();

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      setNativeValue(el, text);
      el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " ", code: "Space" }));
      el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " ", code: "Space" }));
      return;
    }

    el.textContent = text;
    el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, data: text, inputType: "insertText" }));
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
  }

  function findSendButton() {
    return (
      document.querySelector("button[data-testid='send-button']") ||
      document.querySelector("button[aria-label='Send message']") ||
      Array.from(document.querySelectorAll("button")).find((btn) => /send/i.test(btn.getAttribute("aria-label") || ""))
    );
  }

  function isButtonEnabled(button) {
    if (!button) return false;
    const ariaDisabled = String(button.getAttribute("aria-disabled") || "").toLowerCase();
    return !button.disabled && ariaDisabled !== "true";
  }

  function submitComposerWithEnter(composer) {
    if (!composer) return;
    log("prompt-send-enter-fallback");
    composer.focus();
    const keydown = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      which: 13,
      keyCode: 13
    });
    const keypress = new KeyboardEvent("keypress", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      which: 13,
      keyCode: 13
    });
    const keyup = new KeyboardEvent("keyup", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      which: 13,
      keyCode: 13
    });
    composer.dispatchEvent(keydown);
    composer.dispatchEvent(keypress);
    composer.dispatchEvent(keyup);
  }

  function extractLastAssistantMessage() {
    const messages = Array.from(document.querySelectorAll("[data-message-author-role='assistant']"));
    const last = messages[messages.length - 1];
    if (!last) return "";

    const markdown = last.querySelector(".markdown") || last;
    return String(markdown.innerText || markdown.textContent || "").trim();
  }

  async function waitForPageReady() {
    const maxWaitMs = 120000;
    const start = Date.now();
    log("wait-page-ready-start", { maxWaitMs });

    while (Date.now() - start <= maxWaitMs) {
      const composer = findComposer();
      log("wait-page-ready-poll", {
        elapsedMs: Date.now() - start,
        readyState: document.readyState,
        hasComposer: Boolean(composer),
        hasSendButton: Boolean(findSendButton())
      });
      if (composer && document.readyState === "complete") {
        log("wait-page-ready-found", { elapsedMs: Date.now() - start });
        await sleep(5000);
        if (findComposer()) {
          log("wait-page-ready-complete", { elapsedMs: Date.now() - start });
          return;
        }
      }
      await sleep(400);
    }

    throw new Error("Timed out waiting for ChatGPT page to fully render.");
  }

  function toUint8Array(bytes) {
    if (bytes instanceof Uint8Array) return bytes;
    if (Array.isArray(bytes)) return new Uint8Array(bytes);
    return new Uint8Array(bytes || []);
  }

  async function attachFiles(fileDefs) {
    if (!Array.isArray(fileDefs) || !fileDefs.length) return;

    log("attach-start", {
      files: fileDefs.map((fileDef) => ({
        name: fileDef?.name || "",
        type: fileDef?.type || "",
        byteLength: Array.isArray(fileDef?.bytes) ? fileDef.bytes.length : 0
      }))
    });

    let input = findFileInput();

    if (!input) {
      const attachButton = findAttachButton();
      log("attach-no-input", { hasAttachButton: Boolean(attachButton) });
      if (attachButton) {
        attachButton.click();
        log("attach-button-clicked");
        await sleep(300);
      }
      input = findFileInput();
    }

    if (!input) {
      log("attach-failed-no-input");
      throw new Error("File input not found on ChatGPT page.");
    }

    log("attach-input-found", {
      accept: input.getAttribute("accept") || "",
      multiple: Boolean(input.multiple)
    });

    const dt = new DataTransfer();

    for (const fileDef of fileDefs) {
      if (!fileDef?.name) continue;
      const file = new File([toUint8Array(fileDef.bytes)], fileDef.name, {
        type: fileDef.type || "application/octet-stream",
        lastModified: Date.now()
      });
      dt.items.add(file);
    }

    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    log("attach-dispatched", { fileCount: dt.files.length });
    await sleep(700);
  }

  async function sendPromptAndWait(promptText) {
    const maxWaitMs = 300000;
    const start = Date.now();
    const beforeCount = document.querySelectorAll("[data-message-author-role='assistant']").length;

    log("prompt-send-start", {
      promptPreview: String(promptText || "").slice(0, 180),
      promptLength: String(promptText || "").length,
      beforeAssistantCount: beforeCount,
      maxWaitMs
    });

    fillComposer(findComposer(), promptText);
    await sleep(300);

    let sendButton = findSendButton();
    const sendWaitStart = Date.now();

    while ((!sendButton || !isButtonEnabled(sendButton)) && Date.now() - sendWaitStart <= 30000) {
      await sleep(250);
      sendButton = findSendButton();
      log("prompt-send-button-wait", {
        elapsedMs: Date.now() - sendWaitStart,
        found: Boolean(sendButton),
        enabled: isButtonEnabled(sendButton)
      });
    }

    if (sendButton && isButtonEnabled(sendButton)) {
      log("prompt-send-click", {
        disabled: Boolean(sendButton.disabled),
        ariaDisabled: sendButton.getAttribute("aria-disabled") || "",
        ariaLabel: sendButton.getAttribute("aria-label") || ""
      });
      sendButton.click();
    } else {
      submitComposerWithEnter(findComposer());
    }

    let stableCycles = 0;
    let lastText = "";
    let lastLoggedSecond = -1;

    while (Date.now() - start <= maxWaitMs) {
      await sleep(1400);

      const assistantMessages = Array.from(document.querySelectorAll("[data-message-author-role='assistant']"));
      const hasNewMessage = assistantMessages.length > beforeCount;
      const stopButton = document.querySelector("button[data-testid='stop-button']");
      const currentText = hasNewMessage ? extractLastAssistantMessage() : "";
      const elapsedSeconds = Math.floor((Date.now() - start) / 1000);

      if (elapsedSeconds !== lastLoggedSecond) {
        lastLoggedSecond = elapsedSeconds;
        log("prompt-wait", {
          elapsedSeconds,
          hasNewMessage,
          assistantCount: assistantMessages.length,
          hasStopButton: Boolean(stopButton),
          currentTextLength: String(currentText || "").length,
          stableCycles
        });
      }

      if (currentText && currentText === lastText && !stopButton) {
        stableCycles += 1;
      } else {
        stableCycles = 0;
      }

      if (currentText) {
        lastText = currentText;
      }

      if (hasNewMessage && stableCycles >= 2 && lastText) {
        const jsonResult = getJsonFromLatestCodeTag(document);
        log("prompt-complete", {
          elapsedMs: Date.now() - start,
          responseLength: lastText.length,
          jsonValid: Boolean(jsonResult.valid),
          jsonError: jsonResult.valid ? null : jsonResult.error
        });
        return {
          responseText: lastText,
          responseJson: jsonResult.valid ? jsonResult.value : null,
          responseJsonError: jsonResult.valid ? null : jsonResult.error
        };
      }
    }

    log("prompt-timeout", { elapsedMs: Date.now() - start });
    throw new Error("Timed out waiting for ChatGPT response completion.");
  }

  async function sendJsonPromptWithRetry(promptText, maxAttempts = 3) {
    let lastResponse = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      log("json-prompt-attempt-start", {
        attempt,
        maxAttempts,
        promptPreview: String(promptText || "").slice(0, 180)
      });

      const response = await sendPromptAndWait(promptText);
      lastResponse = response;

      log("json-prompt-post-wait-start", { attempt, waitMs: 5000 });
      await sleep(5000);

      const jsonResult = getJsonFromLatestCodeTag(document);
      log("json-prompt-post-wait-scan", {
        attempt,
        valid: Boolean(jsonResult.valid),
        error: jsonResult.valid ? null : jsonResult.error
      });

      if (jsonResult.valid) {
        return {
          responseText: response.responseText,
          responseJson: jsonResult.value,
          responseJsonError: null
        };
      }
    }

    log("json-prompt-attempts-exhausted", {
      maxAttempts,
      lastResponseLength: String(lastResponse?.responseText || "").length
    });

    return {
      responseText: lastResponse?.responseText || "",
      responseJson: null,
      responseJsonError: "Could not get valid JSON from code panel after 3 attempts."
    };
  }

  return (async () => {
    log("conversation-start", {
      attachmentCount: Array.isArray(attachments) ? attachments.length : 0,
      firstPromptLength: String(firstPromptText || "").length,
      secondPromptLength: String(secondPromptText || "").length
    });
    await waitForPageReady();
    await attachFiles(attachments);

    const firstResponse = await sendPromptAndWait(firstPromptText);
    log("first-response-finished", {
      responseLength: String(firstResponse?.responseText || "").length
    });
    const secondResponse = await sendJsonPromptWithRetry(secondPromptText, 3);
    log("second-response-finished", {
      responseLength: String(secondResponse?.responseText || "").length,
      jsonValid: Boolean(secondResponse?.responseJson)
    });

    return {
      ok: true,
      firstResponseText: firstResponse.responseText,
      responseText: secondResponse.responseText,
      responseJson: secondResponse.responseJson,
      responseJsonError: secondResponse.responseJsonError
    };
  })();
}

function extractJsonFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("ChatGPT response is empty.");

  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  const candidates = fenced ? [fenced[1], raw] : [raw];

  function tryParse(candidate) {
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  function extractBalancedObject(candidate) {
    const start = candidate.indexOf("{");
    if (start < 0) return "";

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < candidate.length; i += 1) {
      const ch = candidate[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          return candidate.slice(start, i + 1);
        }
      }
    }

    return "";
  }

  for (const candidate of candidates) {
    const direct = tryParse(candidate);
    if (direct && typeof direct === "object") return direct;

    const objectText = extractBalancedObject(candidate);
    const parsed = tryParse(objectText);
    if (parsed && typeof parsed === "object") return parsed;
  }

  throw new Error("Could not parse JSON from ChatGPT response.");
}

function normalizeReviewJson(payload) {
  const source = payload && typeof payload === "object" ? payload : {};

  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(source, key);

  const hasAny = (...keys) => keys.some((key) => hasOwn(key));

  const pick = (...keys) => {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  };

  const categoriesRaw =
    source.revision_categories ||
    source.revisionCategories ||
    source.selected_categories ||
    source.seelcted_categories ||
    source.error_categories ||
    source.errorCategories ||
    source.categories ||
    [];

  const revisionCategories = Array.isArray(categoriesRaw)
    ? categoriesRaw.map((item) => String(item || "").trim()).filter(Boolean)
    : String(categoriesRaw || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const reviewAhtRaw =
    source.review_aht ??
    source.reviewAht ??
    source.aht ??
    source.review_time ??
    "";

  const reviewAht = String(reviewAhtRaw ?? "").trim();

  return {
    difficultyExplanation: pick(
      "difficulty_explanation",
      "difficultyExplanation",
      "difficulty_reasoning"
    ),
    solutionExplanation: pick("solution_explanation", "solutionExplanation"),
    verificationExplanation: pick(
      "verification_explanation",
      "verificationExplanation",
      "verification_reasoning"
    ),
    rubricText: pick("rubric_text", "rubricText", "rubric"),
    summaryText: pick("summary_text", "summaryText"),
    reviewerFeedbackRewrite: pick(
      "revision_message",
      "revision_notes",
      "acceptance_notes",
      "reviewer_feedback_rewrite",
      "reviewerFeedbackRewrite",
      "reviewer_feedback"
    ),
    revisionNotes: pick("revision_notes", "revision_message"),
    acceptanceNotes: pick("acceptance_notes"),
    verdict: pick("verdict", "review_decision", "reviewDecision"),
    revisionCategories,
    reviewAht,
    providedFields: {
      verdict: hasAny("verdict", "review_decision", "reviewDecision"),
      revisionCategories: hasAny(
        "selected_categories",
        "seelcted_categories",
        "revision_categories",
        "revisionCategories",
        "error_categories",
        "errorCategories",
        "categories"
      ),
      reviewerFeedback: hasAny(
        "revision_message",
        "revision_notes",
        "acceptance_notes",
        "reviewer_feedback_rewrite",
        "reviewerFeedbackRewrite",
        "reviewer_feedback"
      ),
      difficultyExplanation: hasAny("difficulty_explanation", "difficultyExplanation", "difficulty_reasoning"),
      solutionExplanation: hasAny("solution_explanation", "solutionExplanation"),
      verificationExplanation: hasAny(
        "verification_explanation",
        "verificationExplanation",
        "verification_reasoning"
      ),
      rubricText: hasAny("rubric_text", "rubricText", "rubric"),
      summaryText: hasAny("summary_text", "summaryText"),
      reviewAht: hasAny("review_aht", "reviewAht", "aht", "review_time")
    }
  };
}

function hasExpectedReviewJsonShape(payload) {
  if (!payload || typeof payload !== "object") return false;

  const hasVerdict =
    Object.prototype.hasOwnProperty.call(payload, "verdict") ||
    Object.prototype.hasOwnProperty.call(payload, "review_decision") ||
    Object.prototype.hasOwnProperty.call(payload, "reviewDecision");
  const hasRevisionMessage =
    Object.prototype.hasOwnProperty.call(payload, "revision_message") ||
    Object.prototype.hasOwnProperty.call(payload, "revision_notes") ||
    Object.prototype.hasOwnProperty.call(payload, "acceptance_notes") ||
    Object.prototype.hasOwnProperty.call(payload, "reviewer_feedback_rewrite") ||
    Object.prototype.hasOwnProperty.call(payload, "reviewer_feedback");
  const hasCategories =
    Object.prototype.hasOwnProperty.call(payload, "selected_categories") ||
    Object.prototype.hasOwnProperty.call(payload, "seelcted_categories") ||
    Object.prototype.hasOwnProperty.call(payload, "revision_categories") ||
    Object.prototype.hasOwnProperty.call(payload, "revisionCategories") ||
    Object.prototype.hasOwnProperty.call(payload, "error_categories") ||
    Object.prototype.hasOwnProperty.call(payload, "errorCategories") ||
    Object.prototype.hasOwnProperty.call(payload, "categories");

  return hasVerdict && hasRevisionMessage && hasCategories;
}

function pageFillSnorkelFromJson(data, options = {}) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalizeText(text) {
    return String(text || "").replace(/\r\n/g, "\n").trim();
  }

  function normalizeLabel(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function clickElement(el) {
    if (!el) return false;
    try {
      el.scrollIntoView({ block: "center", inline: "nearest" });
      el.click();
      return true;
    } catch {
      return false;
    }
  }

  function findElementsByExactText(selector, text) {
    const target = normalizeLabel(text);
    return Array.from(document.querySelectorAll(selector)).filter((el) => {
      if (!isVisible(el)) return false;
      return normalizeLabel(el.innerText || el.textContent || "") === target;
    });
  }

  function findClickableByText(text) {
    const selectors = [
      "button",
      "label",
      "[role='button']",
      "[role='radio']",
      "[role='checkbox']",
      "[data-state]"
    ];

    for (const selector of selectors) {
      const matches = findElementsByExactText(selector, text);
      if (matches[0]) return matches[0];
    }

    return null;
  }

  function findClickableByTextFuzzy(text) {
    const target = normalizeLabel(text).replace(/[^a-z0-9\s/]/g, "").trim();
    if (!target) return null;

    const selectors = [
      "button",
      "label",
      "[role='button']",
      "[role='radio']",
      "[role='checkbox']",
      "[data-state]"
    ];

    for (const selector of selectors) {
      const matches = Array.from(document.querySelectorAll(selector)).filter((el) => {
        if (!isVisible(el)) return false;
        const textValue = normalizeLabel(el.innerText || el.textContent || "")
          .replace(/[^a-z0-9\s/]/g, "")
          .trim();
        if (!textValue) return false;
        return (
          textValue === target ||
          textValue.includes(target) ||
          target.includes(textValue)
        );
      });

      if (matches[0]) return matches[0];
    }

    return null;
  }

  function findFieldContainerByText(text) {
    const target = normalizeLabel(text);
    return Array.from(document.querySelectorAll("[data-testid^='field-'], section, div"))
      .filter((el) => isVisible(el))
      .find((el) => normalizeLabel(el.innerText || el.textContent || "").includes(target));
  }

  function setNativeValue(el, value) {
    if (!el) return false;

    const normalized = normalizeText(value);
    const proto = Object.getPrototypeOf(el);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");

    if (descriptor?.set) {
      descriptor.set.call(el, normalized);
    } else {
      el.value = normalized;
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }

  function sendKeyStroke(target, key) {
    const code = key === "Enter" ? "Enter" : key;
    const keyCode = key === "Enter" ? 13 : key.charCodeAt(0);
    target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, code, keyCode, which: keyCode }));
    target.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true, cancelable: true, key, code, keyCode, which: keyCode }));
    target.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key, code, keyCode, which: keyCode }));
  }

  async function typeLikeUser(target, value) {
    if (!target) return false;
    const text = String(value || "");

    target.focus();

    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
      setNativeValue(target, "");

      let current = "";
      for (const ch of text) {
        current += ch;
        sendKeyStroke(target, ch === "\n" ? "Enter" : ch);
        setNativeValue(target, current);
        await sleep(6);
      }

      target.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    }

    if (target.getAttribute("contenteditable") === "true") {
      target.textContent = "";
      let current = "";
      for (const ch of text) {
        current += ch;
        sendKeyStroke(target, ch === "\n" ? "Enter" : ch);
        target.textContent = current;
        target.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            data: ch,
            inputType: "insertText"
          })
        );
        await sleep(6);
      }

      target.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    }

    return false;
  }

  function setById(id, value) {
    if (!value) return false;
    return setNativeValue(document.getElementById(id), value);
  }

  function setByTestId(testId, value) {
    if (!value) return false;

    const field = document.querySelector(`[data-testid='${testId}']`);
    if (!field) return false;

    const input = field.querySelector("textarea, input");
    if (input && setNativeValue(input, value)) return true;

    if (window.monaco?.editor?.getModels) {
      const uriNode = field.querySelector("[data-uri]");
      const uri = uriNode?.getAttribute("data-uri") || "";

      if (uri) {
        const model = window.monaco.editor
          .getModels()
          .find((m) => String(m.uri) === uri || String(m.uri?.toString?.()) === uri);

        if (model?.setValue) {
          model.setValue(normalizeText(value));
          return true;
        }
      }
    }

    const editable = field.querySelector("[contenteditable='true']");
    if (editable) {
      editable.focus();
      editable.textContent = normalizeText(value);
      editable.dispatchEvent(new InputEvent("input", { bubbles: true, data: normalizeText(value), inputType: "insertText" }));
      return true;
    }

    return false;
  }

  function setFirstWritableInContainer(container, value) {
    if (!container || !value) return false;

    const input = Array.from(container.querySelectorAll("textarea, input"))
      .find((el) => !el.readOnly && !el.disabled && isVisible(el));
    if (input) return typeLikeUser(input, value);

    const editable = Array.from(container.querySelectorAll("[contenteditable='true']"))
      .find((el) => isVisible(el));
    if (editable) {
      return typeLikeUser(editable, value);
    }

    return false;
  }

  function isSelectedControl(el) {
    if (!el) return false;
    const ariaChecked = String(el.getAttribute("aria-checked") || "").toLowerCase();
    const ariaPressed = String(el.getAttribute("aria-pressed") || "").toLowerCase();
    const dataState = String(el.getAttribute("data-state") || "").toLowerCase();
    return ariaChecked === "true" || ariaPressed === "true" || dataState === "checked" || dataState === "on";
  }

  function setVerdict(verdict) {
    const normalizedVerdict = normalizeLabel(verdict);
    if (!normalizedVerdict) return false;

    const options = {
      accept: ["accept"],
      "needs revision": ["needs revision", "need revision"]
    };

    const targets = options[normalizedVerdict] || [normalizedVerdict];

    for (const target of targets) {
      const control = findClickableByText(target);
      if (control) {
        if (!isSelectedControl(control)) {
          clickElement(control);
        }
        return true;
      }
    }

    return false;
  }

  async function setRevisionCategories(categories) {
    const values = Array.isArray(categories) ? categories : [];
    let count = 0;

    const expandCategorySection = () => {
      const toggles = [
        "revision categories",
        "error categories",
        "categories"
      ];

      for (const label of toggles) {
        const control = findClickableByText(label) || findClickableByTextFuzzy(label);
        if (!control) continue;
        const expanded = String(control.getAttribute("aria-expanded") || "").toLowerCase();
        if (expanded && expanded !== "true") {
          clickElement(control);
        }
      }
    };

    for (const category of values) {
      let selected = false;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        expandCategorySection();
        const control = findClickableByText(category) || findClickableByTextFuzzy(category);
        if (!control) {
          await sleep(120);
          continue;
        }

        if (!isSelectedControl(control)) {
          clickElement(control);
          await sleep(120);
        }

        if (isSelectedControl(control)) {
          selected = true;
          break;
        }
      }

      if (selected) count += 1;
    }

    return count;
  }

  async function waitForDynamicFields() {
    for (let i = 0; i < 20; i += 1) {
      const hasRevision = Boolean(document.getElementById("textarea-revision_notes"));
      const hasAcceptance = Boolean(document.getElementById("textarea-a1f81"));
      const hasAht = Boolean(document.getElementById("review_aht"));
      if (hasRevision || hasAcceptance || hasAht) return;
      await sleep(120);
    }
  }

  async function setReviewerFeedbackMessage(data) {
    if (!data || typeof data !== "object") return false;

    await waitForDynamicFields();

    const normalizedVerdict = normalizeLabel(data?.verdict);
    const revisionText = normalizeText(data?.revisionNotes || data?.reviewerFeedbackRewrite || "");
    const acceptanceText = normalizeText(data?.acceptanceNotes || data?.reviewerFeedbackRewrite || "");
    const genericValue = normalizeText(data?.reviewerFeedbackRewrite || data?.revisionNotes || data?.acceptanceNotes || "");

    if (!revisionText && !acceptanceText && !genericValue) return false;

    if (normalizedVerdict === "needs revision" || normalizedVerdict === "need revision") {
      const revisionNotes = document.getElementById("textarea-revision_notes");
      if (revisionNotes && isVisible(revisionNotes)) {
        return typeLikeUser(revisionNotes, revisionText || genericValue);
      }
    }

    if (normalizedVerdict === "accept") {
      const acceptanceNotes = document.getElementById("textarea-a1f81");
      if (acceptanceNotes && isVisible(acceptanceNotes)) {
        return typeLikeUser(acceptanceNotes, acceptanceText || genericValue);
      }
    }

    const candidateLabels = [
      "automated feedback",
      "reviewer feedback",
      "feedback",
      "message"
    ];

    for (const label of candidateLabels) {
      const button = findClickableByText(label);
      if (button && String(button.getAttribute("aria-expanded") || "").toLowerCase() !== "true") {
        clickElement(button);
        await sleep(120);
      }

      const container = findFieldContainerByText(label);
      if (container && (await setFirstWritableInContainer(container, genericValue))) {
        return true;
      }
    }

    const fallbacks = Array.from(document.querySelectorAll("textarea, input"))
      .filter((el) => !el.readOnly && !el.disabled && isVisible(el))
      .filter((el) => !["difficulty_explanation", "solution_explanation", "verification_explanation"].includes(el.id || ""));

    return Boolean(fallbacks[0] && (await typeLikeUser(fallbacks[0], genericValue)));
  }

  function getRandomIntInclusive(min, max) {
    const low = Number.isFinite(min) ? Math.floor(min) : 10;
    const high = Number.isFinite(max) ? Math.floor(max) : 20;
    const start = Math.min(low, high);
    const end = Math.max(low, high);
    return Math.floor(Math.random() * (end - start + 1)) + start;
  }

  async function setReviewAht(value) {
    const normalized = normalizeText(value);

    const input = document.getElementById("review_aht");
    if (!input || !isVisible(input)) return false;

    let outputValue = normalized || "random";

    if (normalized.toLowerCase() === "random") {
      const min = Number(options?.reviewAhtMin);
      const max = Number(options?.reviewAhtMax);
      outputValue = String(getRandomIntInclusive(min, max));
    }

    if (outputValue.toLowerCase() === "random") {
      const min = Number(options?.reviewAhtMin);
      const max = Number(options?.reviewAhtMax);
      outputValue = String(getRandomIntInclusive(min, max));
    }

    return typeLikeUser(input, outputValue);
  }

  const results = {
    verdict: false,
    revisionCategories: 0,
    reviewerFeedback: false,
    reviewAht: false,
    difficulty: false,
    solution: false,
    verification: false,
    rubric: false,
    summary: false
  };

  return (async () => {
    if (data?.providedFields?.verdict && data?.verdict) {
      results.verdict = setVerdict(data?.verdict);
      await sleep(220);
    }

    if (data?.providedFields?.revisionCategories && Array.isArray(data?.revisionCategories) && data.revisionCategories.length > 0) {
      results.revisionCategories = await setRevisionCategories(data?.revisionCategories);
      await sleep(220);
    }

    if (data?.providedFields?.reviewerFeedback) {
      results.reviewerFeedback = await setReviewerFeedbackMessage(data);
      await sleep(220);
    }

    results.reviewAht = await setReviewAht(data?.reviewAht);
    await sleep(220);

    if (data?.providedFields?.difficultyExplanation && data?.difficultyExplanation) {
      results.difficulty =
        setById("difficulty_explanation", data?.difficultyExplanation) ||
        setByTestId("field-difficulty_explanation", data?.difficultyExplanation);
      await sleep(220);
    }

    if (data?.providedFields?.solutionExplanation && data?.solutionExplanation) {
      results.solution =
        setById("solution_explanation", data?.solutionExplanation) ||
        setByTestId("field-solution_explanation", data?.solutionExplanation);
      await sleep(220);
    }

    if (data?.providedFields?.verificationExplanation && data?.verificationExplanation) {
      results.verification =
        setById("verification_explanation", data?.verificationExplanation) ||
        setByTestId("field-verification_explanation", data?.verificationExplanation);
      await sleep(220);
    }

    if (data?.providedFields?.rubricText && data?.rubricText) {
      results.rubric = setByTestId("field-test_rubrics", data?.rubricText);
      await sleep(220);
    }

    if (data?.providedFields?.summaryText && data?.summaryText) {
      results.summary = setByTestId("field-text_summary", data?.summaryText);
    }

    return {
      ok: true,
      results
    };
  })();
}

async function runChatGptForData(data, tabId) {
  logExtension("chatgpt-run-start", {
    tabId,
    zipFileName: data?.zipFileName || "",
    fileApiUrl: data?.fileApiUrl || "",
    chatgptUrl: chatgptUrlInput.value || ""
  });

  const firstPrompt = buildChatGptPrompt(data);
  const secondPrompt =
    `give me as JSON only in code tag. {"review_decision": "Accept or Needs Revision","high_quality_submission": false,"low_quality_submission": false,"acceptance_notes": "","revision_message": "This message should be return to task creator. it needs to help him to fix the issues.","error_categories": []}. Allowed categories: ["Instruction Styling","Test Alignment/Coverage Issues","Exposing Hints/Answers","Oracle Solution Issues","Test Build Issues","Time Based Tests","Task Difficulty","Metadata Issues","Milestones","Uses Internet","Agent Timeout","Wrong Coding Language","Canary Strings","Rubric","Test Dependency Location","Pinning Issues","Environment","Other"].  select categories as max 3.`;


  async function fetchWithRetry(url, options = {}, retries = 10, delayMs = 1200) {
    let lastError = null;

    for (let i = 0; i < retries; i += 1) {
      try {
        logExtension("fetch-retry-attempt", { url, attempt: i + 1, retries, delayMs });
        const response = await fetch(url, options);
        if (response.ok) return response;
        lastError = new Error(`HTTP ${response.status}`);
      } catch (err) {
        lastError = err;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw lastError || new Error("Fetch failed.");
  }

  const [reviewerPromptResponse, sourceZipResponse] = await Promise.all([
    fetch(chrome.runtime.getURL("reviewer_prompt_prefix.txt"), { cache: "no-store" }),
    fetchWithRetry(String(data?.fileApiUrl || ""), { cache: "no-store" })
  ]);

  logExtension("chatgpt-assets-fetched", {
    reviewerPromptStatus: reviewerPromptResponse.status,
    sourceZipStatus: sourceZipResponse.status
  });

  if (!reviewerPromptResponse.ok) {
    throw new Error(`Failed to load reviewer_prompt_prefix.txt (HTTP ${reviewerPromptResponse.status}).`);
  }

  if (!sourceZipResponse.ok) {
    throw new Error(`Failed to load source zip from API (HTTP ${sourceZipResponse.status}).`);
  }

  const reviewerPromptBuffer = await reviewerPromptResponse.arrayBuffer();
  const sourceZipBuffer = await sourceZipResponse.arrayBuffer();

  const attachments = [
    {
      name: "reviewer_prompt_prefix.txt",
      type: "text/plain",
      bytes: Array.from(new Uint8Array(reviewerPromptBuffer))
    },
    {
      name: String(data?.zipFileName || "source.zip"),
      type: "application/zip",
      bytes: Array.from(new Uint8Array(sourceZipBuffer))
    }
  ];

  async function runConversationOnTab(targetTabId) {
    logExtension("chatgpt-conversation-run", {
      targetTabId,
      attachmentNames: attachments.map((item) => item.name)
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      world: "MAIN",
      func: pageRunChatGptPrompt,
      args: [firstPrompt, secondPrompt, attachments]
    });

    logExtension("chatgpt-conversation-result", {
      targetTabId,
      ok: Boolean(result?.ok),
      hasResponseText: Boolean(result?.responseText),
      hasResponseJson: Boolean(result?.responseJson),
      responseJsonError: result?.responseJsonError || null
    });

    if (!result?.ok || !result?.responseText) {
      throw new Error(result?.error || "ChatGPT response was empty.");
    }

    const parsed = result.responseJson && typeof result.responseJson === "object"
      ? result.responseJson
      : extractJsonFromText(result.responseText);

    if (!hasExpectedReviewJsonShape(parsed)) {
      throw new Error(
        "ChatGPT JSON missing required semantics: decision (verdict/review_decision), notes (revision_message/revision_notes/acceptance_notes), and categories (selected_categories/revision_categories/error_categories)."
      );
    }

    return parsed;
  }

  const currentTab = await chrome.tabs.get(tabId);
  const chatGptPageUrl = /^https?:\/\//i.test(currentTab.url || "")
    ? currentTab.url
    : getChatGptUrl();

  let parsed = null;
  let workingTabId = tabId;
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      logExtension("chatgpt-attempt-start", { attempt, workingTabId });
      setStatus(`Status: Preparing ChatGPT page (attempt ${attempt}/3)...`);
      await focusTabWindowById(workingTabId);
      await waitForTabComplete(workingTabId, 120000);
      await waitForChatGptInteractive(workingTabId, 120000);
      setStatus(`Status: ChatGPT page ready, sending files and prompts (attempt ${attempt}/3)...`);

      parsed = await runConversationOnTab(workingTabId);
      logExtension("chatgpt-attempt-success", { attempt, workingTabId });
      break;
    } catch (err) {
      lastError = err;
      logExtension("chatgpt-attempt-failed", {
        attempt,
        workingTabId,
        error: err?.message || String(err)
      });

      if (attempt === 1) {
        setStatus("Status: Warn - ChatGPT did not respond correctly. Refreshing page and retrying...", "warn");
        await chrome.tabs.reload(workingTabId);
        await waitForTabComplete(workingTabId, 120000);
        continue;
      }

      if (attempt === 2) {
        setStatus("Status: Warn - Retrying on a new ChatGPT page...", "warn");
        const newTab = await chrome.tabs.create({ url: chatGptPageUrl, active: true });
        workingTabId = newTab.id;
        await waitForTabComplete(workingTabId, 120000);
        continue;
      }
    }
  }

  if (!parsed) {
    logExtension("chatgpt-run-failed", {
      error: lastError?.message || "Failed to get valid ChatGPT response after retries."
    });
    throw new Error(lastError?.message || "Failed to get valid ChatGPT response after retries.");
  }

  const normalized = normalizeReviewJson(parsed);
  logExtension("chatgpt-run-finished", {
    verdict: normalized.verdict,
    revisionCategoryCount: normalized.revisionCategories.length
  });

  chatgptJsonTextarea.value = JSON.stringify(parsed, null, 2);
  if (normalized.reviewerFeedbackRewrite) {
    reviewerFeedbackTextarea.value = normalized.reviewerFeedbackRewrite;
  }
  difficultyExplanationTextarea.value = normalized.difficultyExplanation || "";
  solutionExplanationTextarea.value = normalized.solutionExplanation || "";
  verificationExplanationTextarea.value = normalized.verificationExplanation || "";
  if (normalized.rubricText) rubricTextarea.value = normalized.rubricText;
  if (normalized.summaryText) summaryTextarea.value = normalized.summaryText;
  syncRevisionSnapshotFields();

  await chrome.storage.local.set({
    lastChatgptJson: parsed,
    lastNormalizedFillData: normalized
  });

  return normalized;
}

async function fillSnorkelActiveTabFromJsonText() {
  const raw = String(chatgptJsonTextarea.value || "").trim();
  if (!raw) {
    throw new Error("ChatGPT JSON response is empty.");
  }

  const parsed = JSON.parse(raw);
  const normalized = normalizeReviewJson(parsed);
  const tab = await getActiveTab();
  const reviewAhtRange = getReviewAhtRange();

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: pageFillSnorkelFromJson,
    args: [normalized, reviewAhtRange]
  });

  return normalized;
}

async function getData() {
  setAllBusy(true);
  copyFormattedBtn.disabled = true;
  setStatus("Status: Reading...");

  try {
    const tab = await getActiveTab();
    const result = await extractDataFromTabId(tab.id);

    currentZipFileName = result.zipFileName || "";
    currentDifficulty = result.difficulty || "";
    currentExtractedData = result;

    zipNameInput.value = currentZipFileName;
    reviewerFeedbackTextarea.value = result.reviewerFeedbackText || "";
    summaryTextarea.value = result.summaryText || "";
    rubricTextarea.value = result.rubricText || "";
    difficultyExplanationTextarea.value = result.difficultyExplanation || "";
    solutionExplanationTextarea.value = result.solutionExplanation || "";
    verificationExplanationTextarea.value = result.verificationExplanation || "";

    updateFormattedCopyState();
    updateDownloadSourceState();
    syncRevisionSnapshotFields();

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: pageForceScrollToTop
    });

    if (!hasRequiredData()) {
      throw new Error("Extraction incomplete. Zip name or difficulty is missing.");
    }

    await chrome.storage.local.set({ lastResult: result });
    await cacheSnorkelExtractionForTab(tab.id, tab.url || "", result, "get-data");
    setStatus("Status: Completed", "ok");
  } catch (err) {
    updateFormattedCopyState();
    updateDownloadSourceState();
    setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
  } finally {
    setAllBusy(false);
    updateDownloadSourceState();
  }
}

async function downloadSourceZip() {
  if (!currentZipFileName.trim()) {
    setStatus("Status: Error - Get Data first", "error");
    return;
  }

  setStatus("Status: Downloading...");

  try {
    const tab = await getActiveTab();
    const uniqueFilename = buildUniqueZipFilename(currentZipFileName);

    await chrome.runtime.sendMessage({
      type: "SET_NEXT_DOWNLOAD_FILENAME",
      filename: uniqueFilename
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: pageDownloadSourceZip
    });

    currentZipFileName = uniqueFilename;
    zipNameInput.value = currentZipFileName;
    updateDownloadSourceState();

    setStatus("Status: Source downloaded", "ok");
  } catch (err) {
    setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
  }
}

async function runChatGptOnActiveTab() {
  if (!currentZipFileName.trim()) {
    setStatus("Status: Error - Get Data first", "error");
    return;
  }

  setAllBusy(true);
  setStatus("Status: Sending data to ChatGPT...");

  try {
    const tab = await getActiveTab();

    const payload = {
      zipFileName: currentZipFileName,
      fileApiUrl: buildFileApiUrl(currentZipFileName),
      difficulty: currentDifficulty,
      reviewerFeedbackText: reviewerFeedbackTextarea.value,
      summaryText: summaryTextarea.value,
      rubricText: rubricTextarea.value,
      difficultyExplanation: difficultyExplanationTextarea.value,
      solutionExplanation: solutionExplanationTextarea.value,
      verificationExplanation: verificationExplanationTextarea.value,
      extractedAt: currentExtractedData?.extractedAt || new Date().toISOString()
    };

    await runChatGptForData(payload, tab.id);
    setStatus("Status: ChatGPT JSON captured", "ok");
  } catch (err) {
    setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
  } finally {
    setAllBusy(false);
    updateDownloadSourceState();
  }
}

async function fillSnorkelFromJsonOnActiveTab() {
  setAllBusy(true);
  setStatus("Status: Filling snorkel form...");

  try {
    await fillSnorkelActiveTabFromJsonText();
    setStatus("Status: Snorkel form filled", "ok");
  } catch (err) {
    setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
  } finally {
    setAllBusy(false);
    updateDownloadSourceState();
  }
}

async function autoRunWorkflow() {
  setAllBusy(true);
  setStatus("Status: Auto-run started...");

  try {
    const snorkelTab = await getActiveTab();
    const result = await extractDataFromTabId(snorkelTab.id);
    await cacheSnorkelExtractionForTab(snorkelTab.id, snorkelTab.url || "", result, "auto-run-extract");

    currentZipFileName = result.zipFileName || "";
    currentDifficulty = result.difficulty || "";
    currentExtractedData = result;

    zipNameInput.value = currentZipFileName;
    reviewerFeedbackTextarea.value = result.reviewerFeedbackText || "";
    summaryTextarea.value = result.summaryText || "";
    rubricTextarea.value = result.rubricText || "";
    difficultyExplanationTextarea.value = result.difficultyExplanation || "";
    solutionExplanationTextarea.value = result.solutionExplanation || "";
    verificationExplanationTextarea.value = result.verificationExplanation || "";
    updateFormattedCopyState();
    updateDownloadSourceState();
    syncRevisionSnapshotFields();

    if (!hasRequiredData()) {
      throw new Error("Extraction incomplete. Zip name or difficulty is missing.");
    }

    const downloadedZipName = await downloadSourceZipForTabId(snorkelTab.id, currentZipFileName);
    currentZipFileName = downloadedZipName;
    zipNameInput.value = currentZipFileName;
    updateDownloadSourceState();
    setStatus("Status: Source downloaded, opening ChatGPT...");

    const chatGptUrl = getChatGptUrl();
    const chatTab = await chrome.tabs.create({ url: chatGptUrl, active: true });
    await waitForTabComplete(chatTab.id, 90000);

    const payload = {
      zipFileName: currentZipFileName,
      fileApiUrl: buildFileApiUrl(currentZipFileName),
      difficulty: currentDifficulty,
      reviewerFeedbackText: reviewerFeedbackTextarea.value,
      summaryText: summaryTextarea.value,
      rubricText: rubricTextarea.value,
      difficultyExplanation: difficultyExplanationTextarea.value,
      solutionExplanation: solutionExplanationTextarea.value,
      verificationExplanation: verificationExplanationTextarea.value,
      extractedAt: result.extractedAt || new Date().toISOString()
    };

    const normalized = await runChatGptForData(payload, chatTab.id);
    setStatus("Status: ChatGPT response ready, filling snorkel...");

    await chrome.tabs.update(snorkelTab.id, { active: true });
    await chrome.windows.update(snorkelTab.windowId, { focused: true });
    await waitForTabComplete(snorkelTab.id, 15000);

    await chrome.scripting.executeScript({
      target: { tabId: snorkelTab.id },
      world: "MAIN",
      func: pageFillSnorkelFromJson,
      args: [normalized, getReviewAhtRange()]
    });

    await chrome.storage.local.set({
      lastResult: result,
      lastNormalizedFillData: normalized
    });

    setStatus("Status: Auto-run completed", "ok");
  } catch (err) {
    setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
  } finally {
    setAllBusy(false);
    updateDownloadSourceState();
  }
}

async function downloadCheckingFiles() {
  setStatus("Status: Downloading checking files...");

  try {
    const tab = await getActiveTab();

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: pageDownloadCheckingFiles
    });

    setStatus("Status: Checking files downloaded", "ok");
  } catch (err) {
    setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
  }
}

const REVISION_TERMINAL_STATUSES = new Set(["done", "error", "needs_manual_review", "ready_to_send_reviewer"]);
const REVISION_RUNNING_STATUSES = new Set([
  "opening_revision_page",
  "waiting_snorkel_form",
  "refreshing_snorkel_page",
  "classifying",
  "checking_feedback",
  "downloading_files",
  "opening_chatgpt",
  "sending_chatgpt",
  "waiting_chatgpt",
  "downloading_revised_zip",
  "uploading_revised_zip"
]);
let revisionJobs = [];
let revisionSessionRegistry = {};
let revisionListState = {
  revisionListTabId: null,
  revisionListUrl: "",
  items: [],
  scannedAt: ""
};
let revisionSettings = {
  revisionChatgptUrl: DEFAULT_REVISION_CHATGPT_URL,
  revisionBatchSize: DEFAULT_REVISION_BATCH_SIZE,
  autoSendNoFixRevisions: false,
  enableGenerateRubricAfterUpload: true,
  autoCheckSendReviewerAfterFixedUpload: false,
  forceFullResend: false,
  paused: false
};

const pendingDownloadWaiters = new Map();
let revisionPollTimer = null;
let revisionStarterBusy = false;
let lastPausedPollLogAt = 0;
let revisionBatchScopeUrls = null;
let revisionBatchActive = false;

function nowIso() {
  return new Date().toISOString();
}

function setRevisionStatus(job, status, error = null) {
  const previousStatus = job.status || "";
  job.status = status;
  job.updatedAt = nowIso();
  if (error) job.error = String(error);
  logRevision("status-change", job, {
    previousStatus,
    nextStatus: status,
    error: error ? String(error) : null
  });
}

function isRevisionJobRunning(job) {
  return REVISION_RUNNING_STATUSES.has(String(job?.status || ""));
}

function hasReusableChatSessionUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return false;
  return /\/c\//i.test(raw);
}

function normalizeRevisionIdentity(value) {
  return String(value || "").trim().toLowerCase();
}

function resetRevisionJobForStart(job) {
  job.taskUuid = job.taskUuid || "";
  job.snorkelTabId = null;
  job.snorkelWindowId = null;
  job.chatGptTabId = null;
  job.chatGptWindowId = null;
  job.chatGptStartInfo = null;
  job.error = null;
  job.forceFullResend = Boolean(revisionSettings.forceFullResend || job.forceFullResend);
}

function getDownloadWaitKey(jobId, role) {
  return `${jobId}::${role}`;
}

function waitForJobDownload(jobId, role, timeoutMs = 120000) {
  logRevision("download-wait-start", { jobId, role, timeoutMs });
  return new Promise((resolve, reject) => {
    const key = getDownloadWaitKey(jobId, role);
    const timeout = setTimeout(() => {
      pendingDownloadWaiters.delete(key);
      logRevision("download-wait-timeout", { jobId, role, timeoutMs });
      reject(new Error(`Timed out waiting for download (${role}).`));
    }, timeoutMs);

    pendingDownloadWaiters.set(key, {
      resolve: (payload) => {
        clearTimeout(timeout);
        logRevision("download-wait-complete", { jobId, role, filename: payload?.filename || "" });
        resolve(payload);
      },
      reject: (err) => {
        clearTimeout(timeout);
        logRevision("download-wait-error", { jobId, role, error: err?.message || String(err) });
        reject(err);
      }
    });
  });
}

function getDownloadBaseName(fullPath) {
  const raw = String(fullPath || "").trim();
  if (!raw) return "";
  const parts = raw.split(/[\\/]/);
  return String(parts[parts.length - 1] || "").trim();
}

function parseDownloadStartMs(item) {
  const value = String(item?.startTime || "").trim();
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function looksLikeZipDownloadItem(item) {
  const filename = String(item?.filename || "").toLowerCase();
  const finalUrl = String(item?.finalUrl || item?.url || "").toLowerCase();
  const mime = String(item?.mime || "").toLowerCase();
  return filename.endsWith(".zip") || filename.includes(".zip") || finalUrl.includes(".zip") || mime.includes("zip") || mime.includes("octet-stream");
}

async function findRecentCompletedZipDownloadForTab(tabId, sinceMs = 0) {
  const downloads = await chrome.downloads.search({
    state: "complete",
    orderBy: ["-startTime"],
    limit: 60
  });

  const normalizedSinceMs = Number.isFinite(sinceMs) ? sinceMs : 0;
  const candidates = downloads.filter((item) => {
    if (!looksLikeZipDownloadItem(item)) return false;
    const startMs = parseDownloadStartMs(item);
    if (normalizedSinceMs && startMs && startMs < normalizedSinceMs - 10000) return false;

    const sameTab = Number(item?.tabId) === Number(tabId);
    const unknownTab = !Number.isFinite(Number(item?.tabId)) || Number(item?.tabId) < 0;
    return sameTab || unknownTab;
  });

  return candidates[0] || null;
}

async function waitForRecentCompletedZipDownloadForTab(tabId, sinceMs, timeoutMs = 45000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    const found = await findRecentCompletedZipDownloadForTab(tabId, sinceMs);
    if (found) {
      return {
        ok: true,
        downloadId: found.id,
        filename: getDownloadBaseName(found.filename),
        fullPath: found.filename || "",
        tabId: found.tabId,
        startTime: found.startTime || "",
        source: "downloads-search-fallback"
      };
    }
    await delay(1200);
  }

  return {
    ok: false,
    error: "Timed out while searching chrome.downloads fallback for revised ZIP."
  };
}

async function persistRevisionState() {
  logRevision("persist-state", {
    jobCount: revisionJobs.length,
    sessionCount: Object.keys(revisionSessionRegistry || {}).length,
    listCount: revisionListState.items?.length || 0,
    paused: Boolean(revisionSettings.paused)
  });
  await chrome.storage.local.set({
    revisionSessionRegistry,
    revisionListState,
    revisionSettings
  });
  await chrome.storage.local.remove("revisionJobs");
}

function removeRevisionJobFromList(jobId) {
  revisionJobs = revisionJobs.filter((job) => job.id !== jobId);
}

function getRevisionChatGptUrl() {
  const raw = String(revisionSettings.revisionChatgptUrl || DEFAULT_REVISION_CHATGPT_URL).trim();
  if (!/^https?:\/\//i.test(raw)) return DEFAULT_REVISION_CHATGPT_URL;
  return raw;
}

function updateRevisionQueueStats() {
  if (!revisionQueueStatsEl) return;
  const counts = {
    listed: revisionListState.items.length,
    queued: 0,
    opening: 0,
    waiting: 0,
    downloading: 0,
    uploading: 0,
    done: 0,
    error: 0,
    manual: 0
  };

  for (const job of revisionJobs) {
    if (job.status === "queued") counts.queued += 1;
    if (job.status === "opening_revision_page" || job.status === "extracting" || job.status === "classifying" || job.status === "sending_chatgpt") counts.opening += 1;
    if (job.status === "waiting_chatgpt") counts.waiting += 1;
    if (job.status === "downloading_files" || job.status === "downloading_revised_zip") counts.downloading += 1;
    if (job.status === "uploading_revised_zip" || job.status === "filling_revision") counts.uploading += 1;
    if (job.status === "done" || job.status === "ready_to_send_reviewer") counts.done += 1;
    if (job.status === "error") counts.error += 1;
    if (job.status === "needs_manual_review") counts.manual += 1;
  }

  revisionQueueStatsEl.textContent = [
    `Found on list: ${counts.listed}`,
    `Queued: ${counts.queued}`,
    `Starting: ${counts.opening}`,
    `Waiting ChatGPT: ${counts.waiting}`,
    `Downloading ZIP: ${counts.downloading}`,
    `Uploading ZIP: ${counts.uploading}`,
    `Done: ${counts.done}`,
    `Error: ${counts.error}`,
    `Needs Manual: ${counts.manual}`
  ].join(" | ");
}

function renderRevisionJobs() {
  if (!revisionJobsListEl) return;
  revisionJobsListEl.innerHTML = "";

  const sorted = [...revisionJobs].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  for (const job of sorted) {
    const card = document.createElement("div");
    card.className = "revision-job-card";

    const top = document.createElement("div");
    top.textContent = `${job.taskUuid || job.listUuid || job.id} | ${job.projectName || ""}`;
    card.appendChild(top);

    const line2 = document.createElement("div");
    line2.textContent = `status=${job.status} | classification=${job.classification} | session=${job.chatGptSessionUrl ? "saved" : "new"}`;
    card.appendChild(line2);

    const line3 = document.createElement("div");
    line3.textContent = `source=${job.sourceZipDownloadedName || "-"} | build=${job.buildingErrorDownloadedName || "-"} | revised=${job.revisedZipDownloadedName || "-"}`;
    card.appendChild(line3);

    if (job.error) {
      const err = document.createElement("div");
      err.textContent = `error: ${job.error}`;
      card.appendChild(err);
    }

    const actions = document.createElement("div");
    actions.className = "revision-job-actions";
    const actionDefs = [
      ["Open Snorkel", "open-snorkel"],
      ["Open ChatGPT", "open-chatgpt"],
      ["Retry", "retry"],
      ["Download Revised ZIP Again", "download-revised"],
      ["Upload ZIP Again", "upload-again"],
      ["Fill Again", "fill-again"],
      ["Remove", "remove"],
      ["Force Full Resend", "force-resend"]
    ];

    for (const [label, action] of actionDefs) {
      const btn = document.createElement("button");
      btn.className = "small";
      btn.textContent = label;
      btn.dataset.jobAction = action;
      btn.dataset.jobId = job.id;
      actions.appendChild(btn);
    }

    card.appendChild(actions);
    revisionJobsListEl.appendChild(card);
  }
}

async function refreshRevisionUiAndPersist() {
  await persistRevisionState();
  updateRevisionQueueStats();
  renderRevisionJobs();
}

function pageExtractRevisionListItems() {
  console.log("[s-project-extension][revision-page] extract-list-start", { at: new Date().toISOString(), url: location.href });
  function normalize(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function toAbsolute(href) {
    try {
      return new URL(href, location.href).toString();
    } catch {
      return href || "";
    }
  }

  function getText(root) {
    if (!root) return "";
    return normalize(root.innerText || root.textContent || "");
  }

  const list = document.querySelector('[data-testid="assignments-list"]');
  const cards = list
    ? Array.from(list.querySelectorAll('[data-testid="project-card"]'))
    : [];

  const rows = [];

  function pushFromCard(card) {
    const anchor = card.querySelector('a[href*="/review?assignmentId="]');
    if (!anchor) return;
    const href = String(anchor.getAttribute("href") || "").trim();
    if (!href) return;
    const absoluteUrl = toAbsolute(href);
    const rawText = getText(card);

    let listUuid = "";
    const fromTestId = String(anchor.getAttribute("data-testid") || "");
    const uuidMatch = fromTestId.match(/([a-f0-9]{8}-[a-f0-9-]{8,})/i) || rawText.match(/([a-f0-9]{8}-[a-f0-9-]{8,})/i);
    if (uuidMatch) listUuid = uuidMatch[1];

    const projectMatch = rawText.match(/Project:\s*([^\n]+)/i);
    const expiresMatch = rawText.match(/Expires at:\s*([^\n]+)/i);

    rows.push({
      listUuid,
      projectName: projectMatch ? normalize(projectMatch[1]) : "",
      expiresAt: expiresMatch ? normalize(expiresMatch[1]) : "",
      href,
      absoluteUrl,
      rawText
    });
  }

  for (const card of cards) pushFromCard(card);

  if (!rows.length) {
    const anchors = Array.from(document.querySelectorAll('a[href*="/review?assignmentId="]'));
    for (const anchor of anchors) {
      const href = String(anchor.getAttribute("href") || "").trim();
      const absoluteUrl = toAbsolute(href);
      const rawText = getText(anchor.closest('[data-testid="project-card"]') || anchor.parentElement || anchor);
      const fromTestId = String(anchor.getAttribute("data-testid") || "");
      const uuidMatch = fromTestId.match(/([a-f0-9]{8}-[a-f0-9-]{8,})/i) || rawText.match(/([a-f0-9]{8}-[a-f0-9-]{8,})/i);
      rows.push({
        listUuid: uuidMatch ? uuidMatch[1] : "",
        projectName: "",
        expiresAt: "",
        href,
        absoluteUrl,
        rawText
      });
    }
  }

  const dedupe = new Map();
  for (const row of rows) {
    const key = `${row.absoluteUrl}::${row.listUuid}`;
    if (!dedupe.has(key)) dedupe.set(key, row);
  }

  return {
    ok: true,
    count: dedupe.size,
    items: Array.from(dedupe.values())
  };
}

function pageExtractRevisionData() {
  console.log("[s-project-extension][revision-page] extract-data-start", { at: new Date().toISOString(), url: location.href });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalize(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getField(testId) {
    return document.querySelector(`[data-testid="${testId}"]`);
  }

  function getPlainText(root) {
    return normalize(root?.innerText || root?.textContent || "");
  }

  function getMonacoText(field) {
    if (!field || !window.monaco?.editor?.getModels) return "";
    const uriNodes = Array.from(field.querySelectorAll("[data-uri]"));
    for (const node of uriNodes) {
      const uri = node.getAttribute("data-uri");
      if (!uri) continue;
      const model = window.monaco.editor.getModels().find((m) => String(m.uri) === uri || String(m.uri?.toString?.()) === uri);
      const text = normalize(model?.getValue?.() || "");
      if (text) return text;
    }
    return "";
  }

  function getTextNodes(root) {
    if (!root) return "";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parts = [];
    let node;

    while ((node = walker.nextNode())) {
      const text = normalize(node.nodeValue);
      if (text) parts.push(text);
    }

    return normalize(parts.join("\n"));
  }

  function numericTop(el, fallback) {
    const ownTop = parseFloat(el.style?.top || "");
    if (Number.isFinite(ownTop)) return ownTop;

    const transform = String(el.style?.transform || "");
    const match = transform.match(/translate3d?\([^,]+,\s*(-?\d+(?:\.\d+)?)px/i);
    return match ? Number(match[1]) : fallback;
  }

  function getViewLinesText(scope) {
    if (!scope) return { text: "", lineCount: 0, height: 0 };

    const candidates = Array.from(scope.querySelectorAll(".view-lines.monaco-mouse-cursor-text, .view-lines"))
      .map((container) => {
        const lines = Array.from(container.querySelectorAll(".view-line"))
          .map((line, index) => ({
            top: numericTop(line, index),
            text: normalize(line.innerText || line.textContent || "")
          }))
          .filter((line) => line.text)
          .sort((a, b) => a.top - b.top);

        const text = normalize(lines.map((line) => line.text).join("\n"));
        const height = parseFloat(container.style?.height || "0") || 0;

        return {
          text,
          lineCount: lines.length,
          height,
          score: text.length + height + lines.length * 50
        };
      })
      .filter((candidate) => candidate.text);

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || { text: "", lineCount: 0, height: 0 };
  }

  function findRubricField() {
    return (
      getField("field-test_rubrics") ||
      Array.from(document.querySelectorAll('[data-testid^="field-"]')).find((field) =>
        /Agent-generated rubric\(s\)|#\s*Rubric|rubric/i.test(getTextNodes(field))
      ) ||
      null
    );
  }

  async function getExpandedEditorText(field, targetHeight) {
    if (!field) return "";

    const modelText = getMonacoText(field);
    const editor = field.querySelector(".monaco-editor") || field.querySelector('[role="code"]');
    if (!editor) return modelText || getViewLinesText(field).text || getTextNodes(field);

    const elementsToResize = [
      editor.closest("section")?.parentElement,
      editor.closest("section"),
      editor.parentElement,
      editor,
      editor.querySelector(".overflow-guard"),
      editor.querySelector(".editor-scrollable"),
      editor.querySelector(".lines-content"),
      editor.querySelector(".view-overlays"),
      editor.querySelector(".view-lines.monaco-mouse-cursor-text, .view-lines")
    ];

    const previous = [];
    for (const el of elementsToResize) {
      if (!el) continue;
      previous.push([el, el.style.height, el.style.maxHeight, el.style.minHeight, el.style.overflow]);
      el.style.height = `${targetHeight}px`;
      el.style.maxHeight = "none";
      el.style.minHeight = `${targetHeight}px`;
      el.style.overflow = "visible";
    }

    try {
      editor.scrollIntoView({ block: "center", inline: "nearest" });
      window.dispatchEvent(new Event("resize"));
      await sleep(800);
      return modelText || getMonacoText(field) || getViewLinesText(field).text || getTextNodes(field);
    } finally {
      for (let i = previous.length - 1; i >= 0; i -= 1) {
        const [el, h, mh, minh, ov] = previous[i];
        if (!el) continue;
        el.style.height = h || "";
        el.style.maxHeight = mh || "";
        el.style.minHeight = minh || "";
        el.style.overflow = ov || "";
      }
      window.dispatchEvent(new Event("resize"));
      await sleep(120);
    }
  }

  async function getSummaryText() {
    return getExpandedEditorText(getField("field-text_summary"), 4000) || getExpandedEditorText(getField("field-quality_check_summary"), 4000);
  }

  async function getRubricText() {
    return getExpandedEditorText(findRubricField(), 5000);
  }

  function getSimpleTextareaText(id, fieldTestId = "") {
    const textarea = document.getElementById(id);
    if (textarea?.value) return normalize(textarea.value);

    if (fieldTestId) {
      const field = getField(fieldTestId);
      const editable = field?.querySelector("textarea, input, [contenteditable='true']");
      const value = normalize(editable?.value || editable?.innerText || editable?.textContent || "");
      if (value) return value;
    }

    return "";
  }

  async function getReviewerFeedbackText() {
    function cleanReviewerFeedback(text) {
      return normalize(text)
        .replace(/^Reviewer Feedback\s*/i, "")
        .replace(/Do you disagree with the reviewer feedback\?/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    const direct = getSimpleTextareaText("test_review", "field-test_review");
    if (direct) return cleanReviewerFeedback(direct);

    const button = Array.from(document.querySelectorAll("button")).find((btn) => {
      const text = normalize(btn.textContent || "");
      return /^Reviewer Feedback$/i.test(text) || /reviewer feedback/i.test(text);
    });

    if (!button) return "";

    if (button.getAttribute("aria-expanded") !== "true") {
      try {
        button.click();
        await sleep(250);
      } catch {}
    }

    const controlsId = button.getAttribute("aria-controls");
    if (controlsId) {
      const panelText = cleanReviewerFeedback(getTextNodes(document.getElementById(controlsId)));
      if (panelText) return panelText;
    }

    const card = button.closest(".w-full.max-w-full.rounded-md.border") || button.closest(".rounded-md.border") || button.parentElement;
    const panel = button.nextElementSibling || card?.querySelector(".px-16.pb-4") || card?.querySelector("[id^='radix-']");
    return cleanReviewerFeedback(getTextNodes(panel));
  }

  function findFileName(field) {
    const text = normalize(getPlainText(field));
    const match = text.match(/([A-Za-z0-9._()[\]\- ]+\.(zip|txt|log|json|csv))/i);
    return match ? match[1].trim() : "";
  }

  function hasDownloadFileButton(field) {
    if (!field) return false;
    return Array.from(field.querySelectorAll("button, a")).some((el) => {
      const ariaDisabled = String(el.getAttribute("aria-disabled") || "").toLowerCase();
      if (el.disabled || ariaDisabled === "true") return false;
      const text = normalize(el.innerText || el.textContent || "");
      const title = normalize(el.getAttribute("title") || el.getAttribute("aria-label") || "");
      const hasDownloadIcon = Boolean(el.querySelector("svg.lucide-download, svg[class*='lucide-download']"));
      return /download file/i.test(`${text} ${title}`) || hasDownloadIcon;
    });
  }

  return (async () => {
    await sleep(120);
    const pageText = normalize(document.body?.innerText || "");
    const uidMatch = pageText.match(/(?:UID|uuid)\s*:?\s*([a-f0-9-]{8,})/i);

    const summaryText = await getSummaryText();
    const reviewerFeedbackText = await getReviewerFeedbackText();
    const rubricText = await getRubricText();
    const difficultyExplanation = getSimpleTextareaText("difficulty_explanation", "field-difficulty_explanation");
    const solutionExplanation = getSimpleTextareaText("solution_explanation", "field-solution_explanation");
    const verificationExplanation = getSimpleTextareaText("verification_explanation", "field-verification_explanation");
    const sourceZipField = getField("field-upload_a_zip_file");
    const buildingErrorField = getField("field-difficulty_check_artifact_s3_key");
    const sourceZipFileName = findFileName(sourceZipField);
    const buildingErrorFileName = findFileName(buildingErrorField);
    const sourceZipDownloadAvailable = hasDownloadFileButton(sourceZipField);
    const buildingErrorDownloadAvailable = hasDownloadFileButton(buildingErrorField);

    const result = {
      ok: true,
      taskUuid: uidMatch ? uidMatch[1] : "",
      taskTitle: "",
      projectName: "",
      summaryText,
      reviewerFeedbackText,
      rubricText,
      testReviewText: reviewerFeedbackText,
      difficultyExplanation,
      solutionExplanation,
      verificationExplanation,
      sourceZipFileName,
      buildingErrorFileName,
      sourceZipDownloadAvailable,
      buildingErrorDownloadAvailable,
      buildLogText: "",
      currentPageUrl: location.href,
      extractedAt: new Date().toISOString()
    };

    console.log("[s-project-extension][revision-page] extract-data-complete", {
      at: new Date().toISOString(),
      taskUuid: result.taskUuid,
      hasSummary: Boolean(result.summaryText),
      hasReviewerFeedback: Boolean(result.reviewerFeedbackText),
      hasRubric: Boolean(result.rubricText),
      sourceZipFileName: result.sourceZipFileName,
      buildingErrorFileName: result.buildingErrorFileName,
      sourceZipDownloadAvailable: result.sourceZipDownloadAvailable,
      buildingErrorDownloadAvailable: result.buildingErrorDownloadAvailable
    });

    return result;
  })();
}

function classifyRevisionNeed(summaryText, reviewerFeedbackText) {
  const summary = String(summaryText || "").toLowerCase();
  const feedback = String(reviewerFeedbackText || "").trim();
  const feedbackLower = feedback.toLowerCase();

  if (!summary && !feedback) return "UNKNOWN";

  const mediumOrHard = /difficulty\s*:\s*✅\s*(medium|hard)/i.test(summaryText || "");
  const solvable = /status\s*:\s*✅\s*solvable/i.test(summaryText || "");
  const hasAutoEvalOnly = !feedback || /^autoeval/i.test(feedbackLower);

  if (mediumOrHard && solvable && hasAutoEvalOnly) return "NO_FIX_NEEDED";

  const obviousFix =
    /difficulty\s*:\s*❌\s*(trivial|easy)/i.test(summaryText || "") ||
    /status\s*:\s*❌/i.test(summaryText || "") ||
    /oracle solution failed|not tested with any agents|some tests not passed/i.test(summary) ||
    (feedback && !/^autoeval/i.test(feedbackLower));

  if (obviousFix) return "FIX_NEEDED";
  return "FIX_NEEDED";
}

function pageHandleNoFixRevision({ autoSend }) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function norm(text) {
    return String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function findButtonByText(candidates) {
    const buttons = Array.from(document.querySelectorAll("button"));
    for (const btn of buttons) {
      const text = norm(btn.innerText || btn.textContent || "");
      if (candidates.some((item) => text === norm(item) || text.includes(norm(item)))) return btn;
    }
    return null;
  }

  function ensureCheckbox(fieldTestId, labelText) {
    const field = document.querySelector(`[data-testid="${fieldTestId}"]`) || document;
    const control = field.querySelector('[role="checkbox"]') ||
      Array.from(document.querySelectorAll('[role="checkbox"]')).find((el) => norm(el.getAttribute("aria-label") || "").includes(norm(labelText)));
    if (!control) return false;
    const checked = String(control.getAttribute("aria-checked") || "").toLowerCase() === "true";
    if (!checked) control.click();
    return true;
  }

  return (async () => {
    const checkBtn = findButtonByText(["Check feedback", "Check Feedback"]);
    if (checkBtn) {
      checkBtn.click();
      await sleep(500);
    }

    ensureCheckbox("field-checkbox_send_to_reviewer", "send to reviewer");
    if (autoSend) {
      const sendBtn = findButtonByText(["Send to reviewer", "Send to Reviewer"]);
      if (sendBtn) sendBtn.click();
    }

    return { ok: true };
  })();
}

function pageStartChatGptPrompt(promptText, attachments) {
  console.log("[s-project-extension][revision-page] chatgpt-start-prompt", {
    at: new Date().toISOString(),
    promptLength: String(promptText || "").length,
    attachmentCount: Array.isArray(attachments) ? attachments.length : 0
  });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function setNativeValue(element, value) {
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findComposer() {
    return document.querySelector("textarea#prompt-textarea") ||
      document.querySelector("#prompt-textarea") ||
      document.querySelector("textarea[data-testid='prompt-textarea']") ||
      document.querySelector("[contenteditable='true'][role='textbox']") ||
      document.querySelector("main [contenteditable='true']");
  }

  function findSendButton() {
    return document.querySelector("button[data-testid='send-button']") ||
      document.querySelector("button[aria-label='Send message']") ||
      Array.from(document.querySelectorAll("button")).find((btn) => /send/i.test(btn.getAttribute("aria-label") || ""));
  }

  function isButtonEnabled(button) {
    if (!button) return false;
    const ariaDisabled = String(button.getAttribute("aria-disabled") || "").toLowerCase();
    return !button.disabled && ariaDisabled !== "true";
  }

  function findFileInput() {
    return document.querySelector("input[type='file']");
  }

  function toUint8Array(bytes) {
    if (bytes instanceof Uint8Array) return bytes;
    if (Array.isArray(bytes)) return new Uint8Array(bytes);
    return new Uint8Array(bytes || []);
  }

  async function waitReady() {
    const start = Date.now();
    while (Date.now() - start < 120000) {
      if (findComposer() && document.readyState === "complete") return;
      await sleep(300);
    }
    throw new Error("ChatGPT page not ready.");
  }

  async function attachFiles(fileDefs) {
    if (!Array.isArray(fileDefs) || !fileDefs.length) return;
    console.log("[s-project-extension][revision-page] chatgpt-attach-start", {
      at: new Date().toISOString(),
      files: fileDefs.map((item) => ({ name: item?.name || "", type: item?.type || "", byteCount: Array.isArray(item?.bytes) ? item.bytes.length : 0 }))
    });
    let input = findFileInput();
    if (!input) {
      const attachBtn = Array.from(document.querySelectorAll("button")).find((btn) => /attach|upload|file/i.test(`${btn.getAttribute("aria-label") || ""} ${btn.getAttribute("title") || ""}`));
      if (attachBtn) attachBtn.click();
      await sleep(300);
      input = findFileInput();
    }
    if (!input) throw new Error("ChatGPT file input not found.");

    const dt = new DataTransfer();
    for (const def of fileDefs) {
      if (!def?.name) continue;
      dt.items.add(new File([toUint8Array(def.bytes)], def.name, { type: def.type || "application/octet-stream", lastModified: Date.now() }));
    }
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("[s-project-extension][revision-page] chatgpt-attach-complete", { at: new Date().toISOString(), fileCount: dt.files.length });
    await sleep(600);
  }

  function fillComposer(el, text) {
    el.focus();
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      setNativeValue(el, text);
      return;
    }
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
  }

  function submitEnter(composer) {
    composer.focus();
    composer.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", code: "Enter", which: 13, keyCode: 13 }));
    composer.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter", code: "Enter", which: 13, keyCode: 13 }));
  }

  function hasGenerationStarted(assistantCountBefore) {
    const assistantCount = document.querySelectorAll("[data-message-author-role='assistant']").length;
    const stopButton = document.querySelector("button[data-testid='stop-button']");
    return Boolean(stopButton) || assistantCount > assistantCountBefore;
  }

  async function waitForSendButton(maxWaitMs = 45000) {
    const start = Date.now();
    let button = findSendButton();

    while ((!button || !isButtonEnabled(button)) && Date.now() - start <= maxWaitMs) {
      await sleep(300);
      button = findSendButton();
      console.log("[s-project-extension][revision-page] chatgpt-send-button-wait", {
        at: new Date().toISOString(),
        elapsedMs: Date.now() - start,
        found: Boolean(button),
        enabled: isButtonEnabled(button),
        disabled: Boolean(button?.disabled),
        ariaDisabled: button?.getAttribute("aria-disabled") || "",
        ariaLabel: button?.getAttribute("aria-label") || ""
      });
    }

    return button;
  }

  async function clickSendAndTrigger(composer, assistantCountBefore) {
    let sendButton = await waitForSendButton();
    let usedButton = false;
    let usedEnterFallback = false;
    const sentAt = new Date().toISOString();

    if (sendButton && isButtonEnabled(sendButton)) {
      usedButton = true;
      console.log("[s-project-extension][revision-page] chatgpt-send-click", {
        at: new Date().toISOString(),
        disabled: Boolean(sendButton.disabled),
        ariaDisabled: sendButton.getAttribute("aria-disabled") || "",
        ariaLabel: sendButton.getAttribute("aria-label") || ""
      });
      sendButton.click();
    }

    await sleep(1200);
    if (!hasGenerationStarted(assistantCountBefore)) {
      usedEnterFallback = true;
      console.log("[s-project-extension][revision-page] chatgpt-send-enter-fallback", { at: new Date().toISOString(), usedButton });
      submitEnter(composer);
    }

    console.log("[s-project-extension][revision-page] chatgpt-send-verify", {
      at: new Date().toISOString(),
      ok: true,
      assumedStarted: true,
      usedButton,
      usedEnterFallback
    });
    return { ok: true, usedButton, usedEnterFallback, assumedStarted: true, sentAt };
  }

  return (async () => {
    await waitReady();
    const assistantCountBefore = document.querySelectorAll("[data-message-author-role='assistant']").length;
    await attachFiles(attachments);

    const composer = findComposer();
    if (!composer) throw new Error("ChatGPT composer not found.");
    fillComposer(composer, String(promptText || ""));
    await sleep(250);

    const sendResult = await clickSendAndTrigger(composer, assistantCountBefore);
    if (!sendResult.ok) throw new Error(sendResult.error || "Failed to send ChatGPT prompt.");

    console.log("[s-project-extension][revision-page] chatgpt-prompt-sent", {
      at: new Date().toISOString(),
      assistantCountBefore,
      usedButton: Boolean(sendResult.usedButton),
      usedEnterFallback: Boolean(sendResult.usedEnterFallback),
      sentAt: sendResult.sentAt || null
    });

    return { ok: true, assistantCountBefore, startedAt: new Date().toISOString(), sentAt: sendResult.sentAt || new Date().toISOString() };
  })();
}

function pageCheckChatGptResponse(startInfo) {
  console.log("[s-project-extension][revision-page] chatgpt-poll", {
    at: new Date().toISOString(),
    assistantCountBefore: startInfo?.assistantCountBefore || 0
  });
  function getLastAssistantMessage() {
    const messages = Array.from(document.querySelectorAll("[data-message-author-role='assistant']"));
    const last = messages[messages.length - 1];
    if (!last) return "";
    const markdown = last.querySelector(".markdown") || last;
    return String(markdown.innerText || markdown.textContent || "").trim();
  }

  function getJsonFromLatestCodeTag() {
    const codeTags = document.querySelectorAll("code");
    if (!codeTags.length) return { valid: false, value: null, error: "No code block found" };
    const latest = String(codeTags[codeTags.length - 1].textContent || "").trim();
    try {
      return { valid: true, value: JSON.parse(latest), error: null };
    } catch (err) {
      return { valid: false, value: null, error: err?.message || String(err) };
    }
  }

  const beforeCount = Number(startInfo?.assistantCountBefore || 0);
  const currentMessages = Array.from(document.querySelectorAll("[data-message-author-role='assistant']"));
  const hasNew = currentMessages.length > beforeCount;
  const stopButton = document.querySelector("button[data-testid='stop-button']");

  if (!hasNew || stopButton) {
    return { ok: true, done: false };
  }

  const text = getLastAssistantMessage();
  if (!text) {
    return { ok: true, done: false };
  }

  const jsonResult = getJsonFromLatestCodeTag();
  return {
    ok: true,
    done: true,
    responseText: text,
    responseJson: jsonResult.valid ? jsonResult.value : null,
    responseJsonError: jsonResult.valid ? null : jsonResult.error
  };
}

function pageFindAndClickLatestChatGptZipDownload() {
  console.log("[s-project-extension][revision-page] find-revised-zip-start", { at: new Date().toISOString() });
  function norm(text) {
    return String(text || "").toLowerCase();
  }

  function findInScope(scope) {
    const candidates = Array.from(scope.querySelectorAll("a, button"));
    const scored = [];

    for (const el of candidates) {
      const text = norm(el.innerText || el.textContent || "");
      const href = norm(el.getAttribute("href") || "");
      const download = norm(el.getAttribute("download") || "");
      const aria = norm(el.getAttribute("aria-label") || "");
      const title = norm(el.getAttribute("title") || "");

      let score = 0;
      if (text.includes(".zip")) score += 5;
      if (href.includes(".zip") || href.startsWith("blob:")) score += 4;
      if (download.includes(".zip")) score += 4;
      if (aria.includes(".zip") || title.includes(".zip")) score += 3;
      if (text.includes("download")) score += 2;
      if (score > 0) scored.push({ el, score, text, href, download });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored[0] || null;
  }

  const assistants = Array.from(document.querySelectorAll("[data-message-author-role='assistant']"));
  const lastAssistant = assistants[assistants.length - 1];

  let found = null;
  let source = "latest_assistant_message";

  if (lastAssistant) {
    found = findInScope(lastAssistant);
  }

  if (!found) {
    found = findInScope(document);
    source = "document_fallback";
  }

  if (!found?.el) {
    console.log("[s-project-extension][revision-page] find-revised-zip-failed", { at: new Date().toISOString() });
    return {
      ok: false,
      clicked: false,
      error: "No downloadable ZIP file found in ChatGPT response."
    };
  }

  found.el.click();
  const filenameGuess = (found.download || found.text || found.href || "").match(/([A-Za-z0-9._()[\]\-]+\.zip)/i)?.[1] || "";

  console.log("[s-project-extension][revision-page] find-revised-zip-clicked", { at: new Date().toISOString(), filenameGuess, source });

  return {
    ok: true,
    clicked: true,
    filenameGuess,
    source
  };
}

function pageUploadRevisedZipToRevisionForm(fileDef) {
  console.log("[s-project-extension][revision-page] upload-revised-zip-start", {
    at: new Date().toISOString(),
    fileName: fileDef?.name || "",
    byteCount: Array.isArray(fileDef?.bytes) ? fileDef.bytes.length : 0
  });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function getUploadField() {
    return document.querySelector('[data-testid="field-upload_a_zip_file"]');
  }

  function findFileInput(field) {
    return field?.querySelector('input[type="file"]') || document.querySelector('input[type="file"]');
  }

  function toUint8Array(bytes) {
    if (bytes instanceof Uint8Array) return bytes;
    if (Array.isArray(bytes)) return new Uint8Array(bytes);
    return new Uint8Array(bytes || []);
  }

  function getVisibleText(root) {
    return String(root?.innerText || root?.textContent || "");
  }

  async function clickRemoveIfPresent() {
    const field = getUploadField();
    if (!field) return;
    const removeButton = field.querySelector('button[title="Remove file"], button[aria-label="Remove file"]') ||
      Array.from(field.querySelectorAll("button")).find((btn) => /remove file/i.test(btn.innerText || ""));
    if (!removeButton) return;

    removeButton.click();
    await sleep(200);

    const dialog = document.querySelector('[data-testid="dialog-content"], [role="alertdialog"]') || document;
    const confirm = Array.from(dialog.querySelectorAll("button")).find((btn) => /remove file/i.test(btn.innerText || btn.textContent || ""));
    if (confirm) {
      confirm.click();
      await sleep(300);
    }
  }

  return (async () => {
    await clickRemoveIfPresent();

    const field = getUploadField();
    if (!field) throw new Error("Upload field not found.");

    let input = findFileInput(field);
    if (!input) {
      field.click();
      await sleep(200);
      input = findFileInput(field);
    }
    if (!input) throw new Error("Upload file input not found.");

    const dt = new DataTransfer();
    const file = new File([toUint8Array(fileDef?.bytes)], fileDef?.name || "revised.zip", {
      type: fileDef?.type || "application/zip",
      lastModified: Date.now()
    });
    dt.items.add(file);

    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const dropTarget = field.querySelector("[role='button']") || field;
    dropTarget.dispatchEvent(new DragEvent("dragenter", { bubbles: true, dataTransfer: dt }));
    dropTarget.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: dt }));
    dropTarget.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt }));

    await sleep(500);
    const text = getVisibleText(field);
    const uploaded = new RegExp(file.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text);

    console.log("[s-project-extension][revision-page] upload-revised-zip-complete", {
      at: new Date().toISOString(),
      fileName: file.name,
      uploaded
    });

    return {
      ok: uploaded,
      uploaded,
      text
    };
  })();
}

function pageFillRevisionFormFromJob(payload) {
  console.log("[s-project-extension][revision-page] fill-revision-form-start", { at: new Date().toISOString() });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalize(text) {
    return String(text || "").trim();
  }

  function setNativeValue(el, value) {
    if (!el) return false;
    const proto = Object.getPrototypeOf(el);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor?.set) descriptor.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }

  function fillField(testId, value, fallbackId = "") {
    const text = normalize(value);
    if (!text) return false;

    const field = document.querySelector(`[data-testid="${testId}"]`);
    const input = field?.querySelector("textarea, input") || (fallbackId ? document.getElementById(fallbackId) : null);
    if (input) return setNativeValue(input, text);

    const editable = field?.querySelector("[contenteditable='true']");
    if (editable) {
      editable.focus();
      editable.textContent = text;
      editable.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
      return true;
    }

    if (window.monaco?.editor?.getModels && field) {
      const uriNode = field.querySelector("[data-uri]");
      const uri = uriNode?.getAttribute("data-uri") || "";
      if (uri) {
        const model = window.monaco.editor.getModels().find((m) => String(m.uri) === uri || String(m.uri?.toString?.()) === uri);
        if (model?.setValue) {
          model.setValue(text);
          return true;
        }
      }
    }
    return false;
  }

  function setCheckbox(testId, shouldCheck) {
    if (!shouldCheck) return false;
    const field = document.querySelector(`[data-testid="${testId}"]`);
    const box = field?.querySelector('[role="checkbox"]') || null;
    if (!box) return false;
    const checked = String(box.getAttribute("aria-checked") || "").toLowerCase() === "true";
    if (!checked) box.click();
    return true;
  }

  function findCheckFeedbackButton() {
    return Array.from(document.querySelectorAll("button")).find((btn) => {
      const text = normalize(btn.innerText || btn.textContent || "").toLowerCase();
      const aria = normalize(btn.getAttribute("aria-label") || "").toLowerCase();
      const title = normalize(btn.getAttribute("title") || "").toLowerCase();
      return text.includes("check feedback") || aria.includes("check feedback") || title.includes("check feedback");
    }) || null;
  }

  function isButtonEnabled(button) {
    if (!button) return false;
    const ariaDisabled = String(button.getAttribute("aria-disabled") || "").toLowerCase();
    const style = window.getComputedStyle(button);
    const hidden = style.display === "none" || style.visibility === "hidden";
    return !button.disabled && ariaDisabled !== "true" && !hidden;
  }

  function clickButtonRobust(button) {
    if (!button) return false;
    try {
      button.scrollIntoView({ block: "center", inline: "nearest" });
    } catch {}

    try {
      button.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true, view: window }));
      button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      button.click();
      return true;
    } catch {
      return false;
    }
  }

  return (async () => {
    const normalized = payload?.normalizedFillData || {};
    const fallback = payload?.fallbackData || {};
    const opts = payload?.options || {};

    const resolvedDifficulty = normalized.difficultyExplanation || fallback.difficultyExplanation || "";
    const resolvedSolution = normalized.solutionExplanation || fallback.solutionExplanation || "";
    const resolvedVerification = normalized.verificationExplanation || fallback.verificationExplanation || "";

    fillField("field-quality_check_summary", normalized.summaryText);
    await sleep(90);
    fillField("field-test_rubrics", normalized.rubricText);
    await sleep(90);
    fillField("field-test_review", normalized.reviewerFeedbackRewrite || normalized.revisionNotes || normalized.acceptanceNotes);
    await sleep(90);
    fillField("field-difficulty_explanation", resolvedDifficulty, "difficulty_explanation");
    await sleep(90);
    fillField("field-solution_explanation", resolvedSolution, "solution_explanation");
    await sleep(90);
    fillField("field-verification_explanation", resolvedVerification, "verification_explanation");
    await sleep(90);

    setCheckbox("field-checkbox_evaluate_rubrics", Boolean(opts.enableGenerateRubricAfterUpload));
    setCheckbox("field-checkbox_send_to_reviewer", Boolean(opts.autoCheckSendReviewerAfterFixedUpload));

    let checkButton = findCheckFeedbackButton();
    console.log("[s-project-extension][revision-page] check-feedback-state", {
      at: new Date().toISOString(),
      found: Boolean(checkButton),
      enabled: isButtonEnabled(checkButton)
    });

    const waitStart = Date.now();
    const maxWaitMs = Math.max(10000, Number(opts.checkFeedbackWaitMs) || 45000);
    while (Date.now() - waitStart <= maxWaitMs) {
      checkButton = findCheckFeedbackButton();
      if (checkButton && isButtonEnabled(checkButton)) break;

      // Keep explanations populated while the button is disabled and backend validation is pending.
      fillField("field-difficulty_explanation", resolvedDifficulty, "difficulty_explanation");
      fillField("field-solution_explanation", resolvedSolution, "solution_explanation");
      fillField("field-verification_explanation", resolvedVerification, "verification_explanation");
      await sleep(500);
    }

    let clicked = false;
    let clickAttempts = 0;
    if (checkButton && isButtonEnabled(checkButton)) {
      for (let attempt = 1; attempt <= 6; attempt += 1) {
        clickAttempts = attempt;
        checkButton = findCheckFeedbackButton();
        if (!checkButton || !isButtonEnabled(checkButton)) break;
        clicked = clickButtonRobust(checkButton) || clicked;
        await sleep(700);
        const after = findCheckFeedbackButton();
        if (!after || !isButtonEnabled(after)) {
          clicked = true;
          break;
        }
      }
    }

    if (clicked) {
      console.log("[s-project-extension][revision-page] check-feedback-clicked", {
        at: new Date().toISOString(),
        waitedMs: Date.now() - waitStart,
        clickAttempts
      });
      await sleep(300);
    } else {
      console.log("[s-project-extension][revision-page] check-feedback-not-clicked", {
        at: new Date().toISOString(),
        found: Boolean(checkButton),
        enabled: isButtonEnabled(checkButton),
        waitedMs: Date.now() - waitStart,
        clickAttempts
      });
    }

    console.log("[s-project-extension][revision-page] fill-revision-form-complete", { at: new Date().toISOString() });

    return {
      ok: true,
      checkFeedbackClicked: clicked,
      checkFeedbackFound: Boolean(checkButton),
      checkFeedbackEnabled: isButtonEnabled(checkButton),
      waitedMs: Date.now() - waitStart,
      clickAttempts
    };
  })();
}

function pageClickCheckFeedbackButton(payload = {}) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalize(text) {
    return String(text || "").trim().toLowerCase();
  }

  function findButton() {
    return Array.from(document.querySelectorAll("button")).find((btn) => {
      const text = normalize(btn.innerText || btn.textContent || "");
      const aria = normalize(btn.getAttribute("aria-label") || "");
      const title = normalize(btn.getAttribute("title") || "");
      return text.includes("check feedback") || aria.includes("check feedback") || title.includes("check feedback");
    }) || null;
  }

  function isEnabled(button) {
    if (!button) return false;
    const ariaDisabled = normalize(button.getAttribute("aria-disabled") || "");
    const style = window.getComputedStyle(button);
    const hidden = style.display === "none" || style.visibility === "hidden";
    return !button.disabled && ariaDisabled !== "true" && !hidden;
  }

  function clickRobust(button) {
    if (!button) return false;
    try {
      button.scrollIntoView({ block: "center", inline: "nearest" });
    } catch {}

    try {
      button.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true, view: window }));
      button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      button.click();
      return true;
    } catch {
      return false;
    }
  }

  return (async () => {
    const maxWaitMs = Math.max(5000, Number(payload?.maxWaitMs) || 45000);
    const start = Date.now();
    let button = null;

    while (Date.now() - start <= maxWaitMs) {
      button = findButton();
      if (button && isEnabled(button)) break;
      await sleep(500);
    }

    if (!button || !isEnabled(button)) {
      return {
        ok: false,
        clicked: false,
        found: Boolean(button),
        enabled: isEnabled(button),
        waitedMs: Date.now() - start,
        error: "Check feedback button is not available/enabled yet."
      };
    }

    let clicked = false;
    let clickAttempts = 0;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      clickAttempts = attempt;
      button = findButton();
      if (!button || !isEnabled(button)) break;
      clicked = clickRobust(button) || clicked;
      await sleep(700);
      const after = findButton();
      if (!after || !isEnabled(after)) {
        clicked = true;
        break;
      }
    }

    return {
      ok: clicked,
      clicked,
      found: true,
      enabled: isEnabled(findButton()),
      waitedMs: Date.now() - start,
      clickAttempts,
      error: clicked ? null : "Check feedback button click did not take effect."
    };
  })();
}

async function clickCheckFeedbackOnActiveTab() {
  setStatus("Status: Trying to click Check feedback on active tab...");
  try {
    const tab = await getActiveTab();
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: pageClickCheckFeedbackButton,
      args: [{ maxWaitMs: 45000 }]
    });

    if (!result?.ok || !result?.clicked) {
      throw new Error(result?.error || "Failed to click Check feedback.");
    }

    setStatus("Status: Check feedback clicked", "ok");
  } catch (err) {
    setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
  }
}

function createRevisionJobFromListItem(item) {
  const id = `revision_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    type: "revision",
    listUuid: String(item?.listUuid || ""),
    taskUuid: "",
    taskTitle: String(item?.taskTitle || ""),
    projectName: String(item?.projectName || ""),
    assignmentUrl: String(item?.absoluteUrl || item?.href || ""),
    snorkelRevisionUrl: String(item?.absoluteUrl || item?.href || ""),
    status: "queued",
    classification: "UNKNOWN",
    snorkelTabId: null,
    snorkelWindowId: null,
    chatGptTabId: null,
    chatGptWindowId: null,
    chatGptSessionUrl: "",
    chatGptStartInfo: null,
    forceFullResend: Boolean(revisionSettings.forceFullResend),
    sourceZipOriginalName: "",
    sourceZipDownloadedName: "",
    sourceZipFileApiUrl: "",
    buildingErrorOriginalName: "",
    buildingErrorDownloadAvailable: false,
    buildingErrorDownloadedName: "",
    buildingErrorFileApiUrl: "",
    revisedZipOriginalName: "",
    revisedZipDownloadedName: "",
    revisedZipFileApiUrl: "",
    extractedData: {
      summaryText: "",
      reviewerFeedbackText: "",
      rubricText: "",
      testReviewText: "",
      difficultyExplanation: "",
      solutionExplanation: "",
      verificationExplanation: "",
      buildLogText: ""
    },
    promptText: "",
    chatGptResponseText: "",
    chatGptResponseJson: null,
    normalizedFillData: null,
    error: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

async function scanRevisionListFromCurrentTab() {
  logRevision("scan-list-clicked");
  const tab = await getActiveTab();
  logRevision("scan-list-active-tab", { tabId: tab.id, url: tab.url || "" });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: pageExtractRevisionListItems
  });

  if (!result?.ok) throw new Error(result?.error || "Failed to extract revision list.");

  revisionListState = {
    revisionListTabId: tab.id,
    revisionListUrl: tab.url || "",
    items: Array.isArray(result.items) ? result.items : [],
    scannedAt: nowIso()
  };

  logRevision("scan-list-complete", {
    tabId: tab.id,
    count: result.count,
    firstItem: result.items?.[0] || null
  });

  await refreshRevisionUiAndPersist();
  setStatus(`Status: Revision list scanned (${result.count})`, "ok");
}

async function pageDownloadRevisionSourceZip() {
  const field = document.querySelector('[data-testid="field-upload_a_zip_file"]');
  if (!field) throw new Error("Source ZIP field not found.");
  const button = field.querySelector('button[title="Download file"], button[aria-label="Download file"]') ||
    Array.from(field.querySelectorAll("button")).find((btn) => /download file/i.test(btn.innerText || btn.textContent || ""));
  if (!button) throw new Error("Source ZIP download button not found.");
  button.click();
  return { ok: true };
}

async function pageDownloadRevisionBuildingError() {
  const field = document.querySelector('[data-testid="field-difficulty_check_artifact_s3_key"]');
  if (!field) throw new Error("Building error field not found.");
  const button = Array.from(field.querySelectorAll("button")).find((btn) => /download file/i.test(btn.innerText || btn.textContent || ""));
  if (!button) throw new Error("Building error download button not found.");
  button.click();
  return { ok: true };
}

async function registerAndWaitDownload(job, tabId, role, filename, pageFunc) {
  logRevision("download-register", job, { tabId, role, filename });
  await chrome.runtime.sendMessage({
    type: "REGISTER_DOWNLOAD_FILENAME",
    tabId,
    jobId: job.id,
    taskUuid: job.taskUuid || job.listUuid,
    role,
    filename
  });

  const waitPromise = waitForJobDownload(job.id, role, 180000);

  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: pageFunc
  });

  logRevision("download-click-dispatched", job, { tabId, role, filename });

  return waitPromise;
}

function buildFullRevisionPrompt(job) {
  const d = job.extractedData || {};
  return [
    "Fix this task based on this feedback:",
    "",
    "Reviewer Feedback:",
    d.reviewerFeedbackText || "",
    "",
    "Summary:",
    d.summaryText || "",
    "",
    "Rubric:",
    d.rubricText || "",
    "",
    "Difficulty Explanation:",
    d.difficultyExplanation || "",
    "",
    "Solution Explanation:",
    d.solutionExplanation || "",
    "",
    "Verification Explanation:",
    d.verificationExplanation || "",
    "",
    "Build / Test / Checking Error:",
    d.buildLogText || job.buildingErrorOriginalName || "",
    "",
    "Task UUID:",
    job.taskUuid || "",
    "",
    "Source ZIP:",
    job.sourceZipOriginalName || "",
    "",
    "Building Error File:",
    job.buildingErrorOriginalName || "",
    "",
    "Instructions:",
    "Please fix the task package based on the feedback. Return the completed revised ZIP file in your response as a downloadable file/link. Also return the text fields needed for the Snorkel revision form: updated summary if needed, updated rubric if needed, difficulty explanation, solution explanation, verification explanation, and a short human revision note."
  ].join("\n");
}

function buildFollowUpRevisionPrompt(job) {
  const d = job.extractedData || {};
  return [
    "Update for the same revision task.",
    "",
    "Task UUID:",
    job.taskUuid || "",
    "",
    "Current Summary:",
    d.summaryText || "",
    "",
    "Latest Reviewer Feedback:",
    d.reviewerFeedbackText || "",
    "",
    "Latest Build / Test / Checking Error:",
    d.buildLogText || job.buildingErrorOriginalName || "",
    "",
    "Instructions:",
    "Use the existing task context from this ChatGPT session. I am attaching only the latest building error/checking file. Please continue fixing the same task. Return the updated revised ZIP file in your response as a downloadable file/link. Also return any updated Snorkel revision form fields if they changed."
  ].join("\n");
}

async function getFileDefFromApi(fileName, defaultType) {
  const url = buildFileApiUrl(fileName);
  let response = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    response = await fetch(url, { cache: "no-store" });
    if (response.ok) break;
    await delay(500 * attempt);
  }

  if (!response?.ok) throw new Error(`Failed to fetch ${fileName} from file API (HTTP ${response?.status || "unknown"}).`);
  const buffer = await response.arrayBuffer();
  return {
    name: fileName,
    type: defaultType,
    bytes: Array.from(new Uint8Array(buffer))
  };
}

async function getOptionalFileDefFromApi(job, fileName, defaultType, role) {
  try {
    return await getFileDefFromApi(fileName, defaultType);
  } catch (err) {
    logRevision("optional-attachment-skip", job, {
      role,
      fileName,
      error: err?.message || String(err)
    });
    return null;
  }
}

function getMissingRevisionDataFields(extracted, job = null) {
  const missing = [];
  const knownTaskUuid = String(extracted?.taskUuid || job?.taskUuid || job?.listUuid || "").trim();
  if (!knownTaskUuid) missing.push("taskUuid");
  if (!String(extracted?.summaryText || "").trim()) missing.push("summaryText");
  if (!String(extracted?.reviewerFeedbackText || "").trim()) missing.push("reviewerFeedbackText");
  if (!String(extracted?.rubricText || "").trim()) missing.push("rubricText");
  if (!String(extracted?.sourceZipFileName || "").trim()) missing.push("sourceZipFileName");
  return missing;
}

async function extractRevisionDataOnce(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: pageExtractRevisionData
  });

  if (!result?.ok) throw new Error(result?.error || "Failed to extract revision data.");
  return result;
}

async function waitForRevisionDataLoaded(job) {
  let lastExtracted = null;
  let lastMissing = [];

  for (let refreshAttempt = 0; refreshAttempt <= REVISION_FORM_REFRESH_RETRIES; refreshAttempt += 1) {
    const startedAt = Date.now();
    logRevision("snorkel-form-wait-start", job, {
      refreshAttempt,
      timeoutMs: REVISION_FORM_LOAD_TIMEOUT_MS,
      pollMs: REVISION_FORM_LOAD_POLL_MS
    });

    while (Date.now() - startedAt < REVISION_FORM_LOAD_TIMEOUT_MS) {
      lastExtracted = await extractRevisionDataOnce(job.snorkelTabId);
      lastMissing = getMissingRevisionDataFields(lastExtracted, job);

      logRevision("snorkel-form-wait-check", job, {
        refreshAttempt,
        missingFields: lastMissing,
        taskUuid: lastExtracted.taskUuid || "",
        sourceZipFileName: lastExtracted.sourceZipFileName || "",
        buildingErrorFileName: lastExtracted.buildingErrorFileName || "",
        hasSummary: Boolean(lastExtracted.summaryText),
        hasReviewerFeedback: Boolean(lastExtracted.reviewerFeedbackText),
        hasRubric: Boolean(lastExtracted.rubricText),
        buildingErrorDownloadAvailable: Boolean(lastExtracted.buildingErrorDownloadAvailable)
      });

      if (!lastMissing.length) {
        logRevision("snorkel-form-ready", job, {
          refreshAttempt,
          waitedMs: Date.now() - startedAt,
          taskUuid: lastExtracted.taskUuid || "",
          sourceZipFileName: lastExtracted.sourceZipFileName || "",
          buildingErrorFileName: lastExtracted.buildingErrorFileName || "",
          buildingErrorDownloadAvailable: Boolean(lastExtracted.buildingErrorDownloadAvailable)
        });
        return lastExtracted;
      }

      await delay(REVISION_FORM_LOAD_POLL_MS);
    }

    if (refreshAttempt < REVISION_FORM_REFRESH_RETRIES) {
      logRevision("snorkel-form-refresh", job, {
        refreshAttempt,
        missingFields: lastMissing
      });
      setRevisionStatus(job, "refreshing_snorkel_page");
      await refreshRevisionUiAndPersist();
      await suppressBeforeUnloadWarningForTab(job.snorkelTabId, "refresh-incomplete-revision-form");
      await chrome.tabs.reload(job.snorkelTabId, { bypassCache: true });
      await waitForTabComplete(job.snorkelTabId, 120000);
      await suppressBeforeUnloadWarningForTab(job.snorkelTabId, "after-refresh");
      logRevision("snorkel-form-refresh-loaded", job, { refreshAttempt });
    }
  }

  throw new Error(`Snorkel revision form did not load required data. Missing: ${lastMissing.join(", ") || "unknown"}`);
}

async function startRevisionJobFromListItem(listItem) {
  logRevision("job-start-request", { listUuid: listItem?.listUuid || "", absoluteUrl: listItem?.absoluteUrl || "" });
  const existingJob = revisionJobs.find((j) => !REVISION_TERMINAL_STATUSES.has(j.status) && (j.snorkelRevisionUrl === listItem.absoluteUrl || (j.listUuid && j.listUuid === listItem.listUuid)));
  if (existingJob && isRevisionJobRunning(existingJob)) {
    logRevision("job-start-skip-existing-running", existingJob);
    return existingJob;
  }

  const job = existingJob || createRevisionJobFromListItem(listItem);
  resetRevisionJobForStart(job);
  if (!existingJob) {
    revisionJobs.push(job);
    logRevision("job-created", job, { assignmentUrl: job.assignmentUrl });
  } else {
    logRevision("job-reusing-queued", job, { assignmentUrl: job.assignmentUrl });
  }
  await refreshRevisionUiAndPersist();

  try {
    setRevisionStatus(job, "opening_revision_page");
    await refreshRevisionUiAndPersist();

    const snorkelTab = await chrome.tabs.create({ url: job.snorkelRevisionUrl, active: true });
    job.snorkelTabId = snorkelTab.id;
    job.snorkelWindowId = snorkelTab.windowId;
    logRevision("snorkel-tab-opened", job, { tabId: job.snorkelTabId, windowId: job.snorkelWindowId, url: job.snorkelRevisionUrl });
    await waitForTabComplete(job.snorkelTabId, 120000);
    await suppressBeforeUnloadWarningForTab(job.snorkelTabId, "revision-tab-loaded");
    logRevision("snorkel-tab-loaded", job);

    setRevisionStatus(job, "waiting_snorkel_form");
    await refreshRevisionUiAndPersist();

    const extracted = await waitForRevisionDataLoaded(job);

    logRevision("revision-data-extracted", job, {
      taskUuid: extracted.taskUuid || "",
      hasSummary: Boolean(extracted.summaryText),
      hasReviewerFeedback: Boolean(extracted.reviewerFeedbackText),
      hasRubric: Boolean(extracted.rubricText),
      sourceZipFileName: extracted.sourceZipFileName || "",
      buildingErrorFileName: extracted.buildingErrorFileName || "",
      buildingErrorDownloadAvailable: Boolean(extracted.buildingErrorDownloadAvailable)
    });

    job.taskUuid = extracted.taskUuid || job.taskUuid || job.listUuid;
    job.taskTitle = extracted.taskTitle || "";
    job.projectName = extracted.projectName || job.projectName || "";
    job.extractedData = {
      summaryText: extracted.summaryText || "",
      reviewerFeedbackText: extracted.reviewerFeedbackText || "",
      rubricText: extracted.rubricText || "",
      testReviewText: extracted.testReviewText || "",
      difficultyExplanation: extracted.difficultyExplanation || "",
      solutionExplanation: extracted.solutionExplanation || "",
      verificationExplanation: extracted.verificationExplanation || "",
      buildLogText: extracted.buildLogText || ""
    };

    await cacheSnorkelExtractionForTab(job.snorkelTabId, extracted.currentPageUrl || job.snorkelRevisionUrl || "", {
      zipFileName: extracted.sourceZipFileName || "",
      difficulty: inferDifficultyFromSummaryText(extracted.summaryText || ""),
      reviewerFeedbackText: extracted.reviewerFeedbackText || "",
      summaryText: extracted.summaryText || "",
      rubricText: extracted.rubricText || "",
      difficultyExplanation: extracted.difficultyExplanation || "",
      solutionExplanation: extracted.solutionExplanation || "",
      verificationExplanation: extracted.verificationExplanation || "",
      extractedAt: extracted.extractedAt || nowIso(),
      currentPageUrl: extracted.currentPageUrl || job.snorkelRevisionUrl || ""
    }, "revision-load");

    job.sourceZipOriginalName = extracted.sourceZipFileName || "";
    job.buildingErrorOriginalName = extracted.buildingErrorFileName || "";
    job.buildingErrorDownloadAvailable = Boolean(extracted.buildingErrorDownloadAvailable);

    setRevisionStatus(job, "classifying");
    job.classification = classifyRevisionNeed(job.extractedData.summaryText, job.extractedData.reviewerFeedbackText);
    logRevision("classification-result", job, {
      classification: job.classification,
      summaryPreview: String(job.extractedData.summaryText || "").slice(0, 180),
      feedbackPreview: String(job.extractedData.reviewerFeedbackText || "").slice(0, 180)
    });
    await refreshRevisionUiAndPersist();

    if (job.classification === "NO_FIX_NEEDED") {
      setRevisionStatus(job, "checking_feedback");
      await refreshRevisionUiAndPersist();

      await chrome.scripting.executeScript({
        target: { tabId: job.snorkelTabId },
        world: "MAIN",
        func: pageHandleNoFixRevision,
        args: [{ autoSend: Boolean(revisionSettings.autoSendNoFixRevisions) }]
      });

      logRevision("no-fix-handled", job, { autoSend: Boolean(revisionSettings.autoSendNoFixRevisions) });

      setRevisionStatus(job, revisionSettings.autoSendNoFixRevisions ? "done" : "ready_to_send_reviewer");
      await refreshRevisionUiAndPersist();
      if (revisionSettings.autoSendNoFixRevisions) {
        removeRevisionJobFromList(job.id);
        await refreshRevisionUiAndPersist();
      }
      return job;
    }

    setRevisionStatus(job, "downloading_files");
    await refreshRevisionUiAndPersist();

    if (job.sourceZipOriginalName) {
      const sourceName = job.sourceZipOriginalName;
      const sourceDownload = await registerAndWaitDownload(job, job.snorkelTabId, "source_zip", sourceName, pageDownloadRevisionSourceZip);
      job.sourceZipDownloadedName = sourceDownload.filename || sourceName;
      job.sourceZipFileApiUrl = buildFileApiUrl(job.sourceZipDownloadedName);
      logRevision("source-zip-downloaded", job, { filename: job.sourceZipDownloadedName, fileApiUrl: job.sourceZipFileApiUrl });
    }

    if (job.buildingErrorDownloadAvailable || job.buildingErrorOriginalName) {
      const buildName = job.buildingErrorOriginalName || `${job.taskUuid || "task"}_difficulty_check_artifact_${Date.now()}.zip`;
      const buildDownload = await registerAndWaitDownload(job, job.snorkelTabId, "building_error", buildName, pageDownloadRevisionBuildingError);
      job.buildingErrorDownloadedName = buildDownload.filename || buildName;
      job.buildingErrorFileApiUrl = buildFileApiUrl(job.buildingErrorDownloadedName);
      logRevision("building-error-downloaded", job, { filename: job.buildingErrorDownloadedName, fileApiUrl: job.buildingErrorFileApiUrl });
    } else {
      logRevision("building-error-skip-unavailable", job, { message: "No enabled difficulty check result download button was found." });
    }

    setRevisionStatus(job, "opening_chatgpt");
    await refreshRevisionUiAndPersist();

    const existingSession = revisionSessionRegistry[job.taskUuid] || null;
    const savedSessionUrl = existingSession?.chatGptSessionUrl || "";
    const canReuseSavedSession = hasReusableChatSessionUrl(savedSessionUrl);
    const sessionUrl = canReuseSavedSession ? savedSessionUrl : getRevisionChatGptUrl();
    logRevision("chatgpt-session-selected", job, {
      hasSavedSession: Boolean(savedSessionUrl),
      canReuseSavedSession,
      sessionUrl,
      forceFullResend: Boolean(job.forceFullResend)
    });
    const chatTab = await chrome.tabs.create({ url: sessionUrl, active: true });
    job.chatGptTabId = chatTab.id;
    job.chatGptWindowId = chatTab.windowId;
    logRevision("chatgpt-tab-opened", job, { tabId: job.chatGptTabId, windowId: job.chatGptWindowId, url: sessionUrl });
    await waitForTabComplete(job.chatGptTabId, 120000);
    logRevision("chatgpt-tab-loaded", job);

    const attachments = [];
    const shouldFullResend = !canReuseSavedSession || Boolean(job.forceFullResend);

    if (shouldFullResend && job.sourceZipDownloadedName) {
      attachments.push(await getFileDefFromApi(job.sourceZipDownloadedName, "application/zip"));
    }
    if (job.buildingErrorDownloadedName) {
      const buildingErrorAttachment = await getOptionalFileDefFromApi(job, job.buildingErrorDownloadedName, "application/zip", "building_error");
      if (buildingErrorAttachment) attachments.push(buildingErrorAttachment);
    }

    logRevision("chatgpt-attachments-prepared", job, {
      shouldFullResend,
      attachments: attachments.map((item) => ({ name: item.name, type: item.type, byteCount: item.bytes?.length || 0 }))
    });

    job.promptText = shouldFullResend ? buildFullRevisionPrompt(job) : buildFollowUpRevisionPrompt(job);

    setRevisionStatus(job, "sending_chatgpt");
    await refreshRevisionUiAndPersist();

    const [{ result: startInfo }] = await chrome.scripting.executeScript({
      target: { tabId: job.chatGptTabId },
      world: "MAIN",
      func: pageStartChatGptPrompt,
      args: [job.promptText, attachments]
    });

    if (!startInfo?.ok) throw new Error(startInfo?.error || "Failed to start ChatGPT prompt.");

    logRevision("chatgpt-prompt-started", job, startInfo);

    job.chatGptStartInfo = startInfo;
    job.chatGptSessionUrl = (await chrome.tabs.get(job.chatGptTabId)).url || sessionUrl;
    setRevisionStatus(job, "waiting_chatgpt");

    revisionSessionRegistry[job.taskUuid] = {
      taskUuid: job.taskUuid,
      listUuid: job.listUuid,
      taskTitle: job.taskTitle,
      projectName: job.projectName,
      snorkelRevisionUrl: job.snorkelRevisionUrl,
      chatGptSessionUrl: job.chatGptSessionUrl,
      chatGptTabId: job.chatGptTabId,
      sourceZipFileName: job.sourceZipDownloadedName,
      buildingErrorFileName: job.buildingErrorDownloadedName,
      revisedZipFileName: job.revisedZipDownloadedName,
      lastSummaryText: job.extractedData.summaryText || "",
      lastReviewerFeedbackText: job.extractedData.reviewerFeedbackText || "",
      lastRubricText: job.extractedData.rubricText || "",
      createdAt: existingSession?.createdAt || nowIso(),
      updatedAt: nowIso()
    };

    logRevision("session-registry-updated", job, { chatGptSessionUrl: job.chatGptSessionUrl });

    await refreshRevisionUiAndPersist();
    const handoffDelayMs = 4000;
    logRevision("waiting-chatgpt-handoff", job, {
      message: "Handing off to the next task without waiting for ChatGPT completion.",
      handoffDelayMs
    });
    setTimeout(() => {
      processNextRevisionFromList().catch((err) => {
        logRevision("waiting-chatgpt-handoff-error", job, { error: err?.message || String(err) });
      });
    }, handoffDelayMs);
    return job;
  } catch (err) {
    logRevision("job-error", job, { error: err?.message || String(err) });
    setRevisionStatus(job, "error", err?.message || String(err));
    await refreshRevisionUiAndPersist();
    return job;
  }
}

async function processNextRevisionFromList(options = {}) {
  const force = Boolean(options?.force);
  logRevision("process-next-start", { busy: revisionStarterBusy, paused: Boolean(revisionSettings.paused), batchActive: revisionBatchActive, force });
  if (revisionStarterBusy) {
    logRevision("process-next-skip-busy");
    return;
  }
  if (!revisionBatchActive && !force) {
    logRevision("process-next-skip-inactive-batch");
    return;
  }
  if (revisionSettings.paused) {
    logRevision("process-next-skip-paused", { message: "Click Start Batch or Resume Queue to continue." });
    setStatus("Status: Revision queue is paused. Click Start Batch or Resume Queue to continue.", "warn");
    return;
  }
  revisionStarterBusy = true;
  try {
    const activeCount = revisionJobs.filter((job) => isRevisionJobRunning(job)).length;
    const target = Number(revisionSettings.revisionBatchSize || DEFAULT_REVISION_BATCH_SIZE);
    const statusCounts = revisionJobs.reduce((counts, job) => {
      const status = String(job.status || "unknown");
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});
    logRevision("process-next-counts", { activeCount, target, listCount: revisionListState.items.length, statusCounts });
    if (activeCount >= target) return;

    const activeUrls = new Set(revisionJobs.filter((j) => isRevisionJobRunning(j)).map((j) => normalizeRevisionIdentity(j.snorkelRevisionUrl)));
    const completedUrls = new Set(revisionJobs.filter((j) => j.status === "done" || j.status === "ready_to_send_reviewer").map((j) => normalizeRevisionIdentity(j.snorkelRevisionUrl)));
    const blockedErrorUrls = new Set(revisionJobs.filter((j) => j.status === "error").map((j) => normalizeRevisionIdentity(j.snorkelRevisionUrl)));
    const activeListUuids = new Set(revisionJobs.filter((j) => isRevisionJobRunning(j)).map((j) => normalizeRevisionIdentity(j.listUuid)));
    const completedListUuids = new Set(revisionJobs.filter((j) => j.status === "done" || j.status === "ready_to_send_reviewer").map((j) => normalizeRevisionIdentity(j.listUuid)));
    const blockedErrorListUuids = new Set(revisionJobs.filter((j) => j.status === "error").map((j) => normalizeRevisionIdentity(j.listUuid)));

    const candidates = revisionListState.items.filter((item) => {
      const url = normalizeRevisionIdentity(item.absoluteUrl || "");
      const listUuid = normalizeRevisionIdentity(item.listUuid || "");
      if (!url) return false;
      if (revisionBatchScopeUrls && !revisionBatchScopeUrls.has(url)) return false;
      return !activeUrls.has(url)
        && !completedUrls.has(url)
        && !blockedErrorUrls.has(url)
        && !activeListUuids.has(listUuid)
        && !completedListUuids.has(listUuid)
        && !blockedErrorListUuids.has(listUuid);
    });

    const slots = Math.max(0, target - activeCount);
    logRevision("process-next-candidates", {
      candidateCount: candidates.length,
      slots,
      blockedErrorCount: blockedErrorUrls.size,
      blockedErrorListUuidCount: blockedErrorListUuids.size,
      scopedBatchCount: revisionBatchScopeUrls ? revisionBatchScopeUrls.size : 0
    });
    const nextCandidate = candidates[0] || null;
    if (nextCandidate && slots > 0) {
      await startRevisionJobFromListItem(nextCandidate);
    }
  } finally {
    revisionStarterBusy = false;
    logRevision("process-next-finished");
  }
}

async function startRevisionBatchFromList() {
  logRevision("start-batch-clicked", { currentListCount: revisionListState.items.length, batchSize: revisionSettings.revisionBatchSize, wasPaused: Boolean(revisionSettings.paused) });
  if (revisionSettings.paused) {
    revisionSettings.paused = false;
    logRevision("start-batch-auto-resume");
    await refreshRevisionUiAndPersist();
  }
  if (!revisionListState.items.length) {
    await scanRevisionListFromCurrentTab();
  }

  const target = Number(revisionSettings.revisionBatchSize || DEFAULT_REVISION_BATCH_SIZE);
  const completedOrErroredUrls = new Set(
    revisionJobs
      .filter((j) => REVISION_TERMINAL_STATUSES.has(j.status))
      .map((j) => normalizeRevisionIdentity(j.snorkelRevisionUrl))
  );
  const selected = revisionListState.items
    .map((item) => ({
      url: normalizeRevisionIdentity(item.absoluteUrl || "")
    }))
    .filter((it) => it.url && !completedOrErroredUrls.has(it.url));

  revisionBatchScopeUrls = new Set(selected.slice(0, target).map((it) => it.url));
  revisionBatchActive = true;
  logRevision("start-batch-scope", {
    target,
    selectedCount: revisionBatchScopeUrls.size,
    selectedUrls: Array.from(revisionBatchScopeUrls)
  });

  await processNextRevisionFromList();
}

async function handleCompletedChatGptRevision(job) {
  try {
    logRevision("handle-chatgpt-complete-start", job);
    setRevisionStatus(job, "downloading_revised_zip");
    await refreshRevisionUiAndPersist();

    const filenameHint = buildRevisionResultZipFilename(
      job.sourceZipOriginalName || job.sourceZipDownloadedName,
      (job.taskUuid || "task").slice(0, 12)
    );
    logRevision("register-revised-zip-download", job, { filenameHint });
    await chrome.runtime.sendMessage({
      type: "REGISTER_EXPECTED_CHATGPT_DOWNLOAD",
      jobId: job.id,
      taskUuid: job.taskUuid || job.listUuid,
      tabId: job.chatGptTabId,
      role: "revised_zip",
      filenameHint
    });

    const waitDownload = waitForJobDownload(job.id, "revised_zip", 180000);

    await chrome.tabs.update(job.chatGptTabId, { active: true });
    if (job.chatGptWindowId) await chrome.windows.update(job.chatGptWindowId, { focused: true });
    await waitForTabComplete(job.chatGptTabId, 30000);

    let clickResult = null;
    const clickStart = Date.now();
    while (Date.now() - clickStart <= 120000) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: job.chatGptTabId },
        world: "MAIN",
        func: pageFindAndClickLatestChatGptZipDownload
      });
      clickResult = result;
      if (clickResult?.ok && clickResult?.clicked) break;
      await delay(1500);
    }

    if (!clickResult?.ok || !clickResult?.clicked) {
      throw new Error(clickResult?.error || "Could not click revised ZIP download.");
    }

    logRevision("revised-zip-clicked", job, clickResult);

    let revisedDownload = null;
    try {
      revisedDownload = await waitDownload;
    } catch (waitErr) {
      logRevision("revised-zip-wait-timeout", job, { error: waitErr?.message || String(waitErr) });

      const fallbackDownload = await waitForRecentCompletedZipDownloadForTab(
        job.chatGptTabId,
        clickStart,
        60000
      );

      if (!fallbackDownload?.ok || !fallbackDownload?.filename) {
        throw waitErr;
      }

      revisedDownload = fallbackDownload;
      logRevision("revised-zip-fallback-resolved", job, {
        filename: fallbackDownload.filename,
        source: fallbackDownload.source,
        downloadId: fallbackDownload.downloadId,
        tabId: fallbackDownload.tabId
      });
    }

    job.revisedZipDownloadedName = revisedDownload.filename || filenameHint;
    job.revisedZipFileApiUrl = buildFileApiUrl(job.revisedZipDownloadedName);
    logRevision("revised-zip-downloaded", job, { filename: job.revisedZipDownloadedName, fileApiUrl: job.revisedZipFileApiUrl });

    const revisedFile = await getFileDefFromApi(job.revisedZipDownloadedName, "application/zip");

    setRevisionStatus(job, "uploading_revised_zip");
    await refreshRevisionUiAndPersist();

    await chrome.tabs.update(job.snorkelTabId, { active: true });
    if (job.snorkelWindowId) await chrome.windows.update(job.snorkelWindowId, { focused: true });
    await waitForTabComplete(job.snorkelTabId, 30000);

    const [{ result: uploadResult }] = await chrome.scripting.executeScript({
      target: { tabId: job.snorkelTabId },
      world: "MAIN",
      func: pageUploadRevisedZipToRevisionForm,
      args: [revisedFile]
    });

    logRevision("revised-zip-upload-result", job, uploadResult || {});

    if (!uploadResult?.ok) {
      setRevisionStatus(job, "needs_manual_review", uploadResult?.error || "Failed to upload revised ZIP.");
      await refreshRevisionUiAndPersist();
      return;
    }

    setRevisionStatus(job, "filling_revision");
    await refreshRevisionUiAndPersist();

    // Snorkel usually enables "Check feedback" a few seconds after upload processing completes.
    await delay(6000);

    const [{ result: fillResult }] = await chrome.scripting.executeScript({
      target: { tabId: job.snorkelTabId },
      world: "MAIN",
      func: pageFillRevisionFormFromJob,
      args: [{
        normalizedFillData: job.normalizedFillData || {},
        fallbackData: job.extractedData || {},
        options: {
          enableGenerateRubricAfterUpload: Boolean(revisionSettings.enableGenerateRubricAfterUpload),
          autoCheckSendReviewerAfterFixedUpload: Boolean(revisionSettings.autoCheckSendReviewerAfterFixedUpload)
        }
      }]
    });

    logRevision("revision-form-filled", job, fillResult || {});

    if (!fillResult?.checkFeedbackClicked) {
      setRevisionStatus(job, "needs_manual_review", "Check feedback button was not clicked automatically.");
      await refreshRevisionUiAndPersist();
      return;
    }

    setRevisionStatus(job, "done");
    await refreshRevisionUiAndPersist();
    removeRevisionJobFromList(job.id);
    await refreshRevisionUiAndPersist();
  } catch (err) {
    logRevision("handle-chatgpt-complete-error", job, { error: err?.message || String(err) });
    setRevisionStatus(job, "error", err?.message || String(err));
    await refreshRevisionUiAndPersist();
  }
}

async function pollRevisionJobs() {
  if (revisionSettings.paused) {
    const now = Date.now();
    if (now - lastPausedPollLogAt > 30000) {
      lastPausedPollLogAt = now;
      logRevision("poll-skipped-paused", { message: "Revision queue is paused." });
    }
    return;
  }
  const waiting = revisionJobs.filter((job) => job.status === "waiting_chatgpt" && job.chatGptTabId && job.chatGptStartInfo);
  logRevision("poll-start", { waitingCount: waiting.length });
  for (const job of waiting) {
    try {
      logRevision("poll-job", job);
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: job.chatGptTabId },
        world: "MAIN",
        func: pageCheckChatGptResponse,
        args: [job.chatGptStartInfo]
      });

      logRevision("poll-job-result", job, {
        ok: Boolean(result?.ok),
        done: Boolean(result?.done),
        hasResponseText: Boolean(result?.responseText),
        hasResponseJson: Boolean(result?.responseJson),
        responseJsonError: result?.responseJsonError || null
      });

      if (!result?.ok || !result?.done) continue;

      job.chatGptResponseText = result.responseText || "";
      job.chatGptResponseJson = result.responseJson || null;
      if (job.chatGptResponseJson) {
        try {
          job.normalizedFillData = normalizeReviewJson(job.chatGptResponseJson);
          logRevision("poll-json-normalized", job, {
            normalizedKeys: Object.keys(job.normalizedFillData || {})
          });
        } catch {}
      }

      setRevisionStatus(job, "chatgpt_done");
      await refreshRevisionUiAndPersist();
      await handleCompletedChatGptRevision(job);
    } catch (err) {
      logRevision("poll-job-error", job, { error: err?.message || String(err) });
      setRevisionStatus(job, "error", err?.message || String(err));
      await refreshRevisionUiAndPersist();
    }
  }

  await processNextRevisionFromList();
}

function ensureRevisionPolling() {
  if (revisionPollTimer) return;
  revisionPollTimer = setInterval(() => {
    pollRevisionJobs().catch((err) => {
      logExtension("revision-poll-error", { error: err?.message || String(err) });
    });
  }, 7000);
}

function handleRevisionDownloadStatus(message) {
  logRevision("download-status-message", {
    ok: Boolean(message.ok),
    interrupted: Boolean(message.interrupted),
    jobId: message.jobId || "",
    role: message.role || "",
    filename: message.filename || "",
    tabId: message.tabId || null
  });
  if (!message.ok && !message.interrupted) {
    logRevision("download-status-ignored-nonterminal", {
      jobId: message.jobId || "",
      role: message.role || "",
      filename: message.filename || ""
    });
    return;
  }
  const key = getDownloadWaitKey(String(message.jobId || ""), String(message.role || ""));
  const waiter = pendingDownloadWaiters.get(key);
  if (!waiter) return;
  pendingDownloadWaiters.delete(key);

  if (message.ok) {
    waiter.resolve(message);
  } else {
    waiter.reject(new Error(`Download failed for role ${message.role}.`));
  }
}

async function addCurrentRevisionPage() {
  logRevision("add-current-revision-page-clicked");
  const tab = await getActiveTab();
  logRevision("add-current-revision-page-tab", { tabId: tab.id, url: tab.url || "" });
  const [{ result: extracted }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: pageExtractRevisionData
  });

  if (!extracted?.ok) throw new Error(extracted?.error || "Failed to extract current revision page.");

  const listItem = {
    listUuid: extracted.taskUuid || "",
    projectName: extracted.projectName || "",
    expiresAt: "",
    href: tab.url || "",
    absoluteUrl: tab.url || "",
    rawText: extracted.summaryText || ""
  };

  const exists = revisionListState.items.some((it) => it.absoluteUrl === listItem.absoluteUrl);
  if (!exists) {
    revisionListState.items.push(listItem);
  }

  await refreshRevisionUiAndPersist();
  logRevision("add-current-revision-page-complete", { taskUuid: listItem.listUuid, url: listItem.absoluteUrl });
  setStatus("Status: Added current revision page", "ok");
}

function getRevisionJobById(jobId) {
  return revisionJobs.find((job) => job.id === jobId) || null;
}

async function handleRevisionJobAction(action, jobId) {
  const job = getRevisionJobById(jobId);
  if (!job) return;

  logRevision("job-action", job, { action });

  try {
    if (action === "open-snorkel" && job.snorkelTabId) {
      await chrome.tabs.update(job.snorkelTabId, { active: true });
      if (job.snorkelWindowId) await chrome.windows.update(job.snorkelWindowId, { focused: true });
      return;
    }

    if (action === "open-chatgpt" && job.chatGptTabId) {
      await chrome.tabs.update(job.chatGptTabId, { active: true });
      if (job.chatGptWindowId) await chrome.windows.update(job.chatGptWindowId, { focused: true });
      return;
    }

    if (action === "retry") {
      setRevisionStatus(job, "queued");
      job.error = null;
      await refreshRevisionUiAndPersist();
      await processNextRevisionFromList({ force: true });
      return;
    }

    if (action === "download-revised") {
      await handleCompletedChatGptRevision(job);
      return;
    }

    if (action === "upload-again") {
      if (!job.revisedZipDownloadedName) throw new Error("No revised ZIP available for this job.");
      const revisedFile = await getFileDefFromApi(job.revisedZipDownloadedName, "application/zip");
      await chrome.scripting.executeScript({
        target: { tabId: job.snorkelTabId },
        world: "MAIN",
        func: pageUploadRevisedZipToRevisionForm,
        args: [revisedFile]
      });
      return;
    }

    if (action === "fill-again") {
      await chrome.scripting.executeScript({
        target: { tabId: job.snorkelTabId },
        world: "MAIN",
        func: pageFillRevisionFormFromJob,
        args: [{
          normalizedFillData: job.normalizedFillData || {},
          fallbackData: job.extractedData || {},
          options: {
            enableGenerateRubricAfterUpload: Boolean(revisionSettings.enableGenerateRubricAfterUpload),
            autoCheckSendReviewerAfterFixedUpload: Boolean(revisionSettings.autoCheckSendReviewerAfterFixedUpload)
          }
        }]
      });
      return;
    }

    if (action === "remove") {
      revisionJobs = revisionJobs.filter((it) => it.id !== job.id);
      await refreshRevisionUiAndPersist();
      return;
    }

    if (action === "force-resend") {
      job.forceFullResend = !job.forceFullResend;
      if (job.forceFullResend && job.taskUuid) {
        delete revisionSessionRegistry[job.taskUuid];
        job.chatGptSessionUrl = "";
        logRevision("session-registry-forgotten", job, { taskUuid: job.taskUuid });
      }
      await refreshRevisionUiAndPersist();
      return;
    }
  } catch (err) {
    setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
  }
}

async function copyText(text) {
  await navigator.clipboard.writeText(text || "");
  setStatus("Status: Copied", "ok");
}

startBtn.addEventListener("click", getData);
downloadSourceBtn.addEventListener("click", downloadSourceZip);
downloadCheckingFilesBtn.addEventListener("click", downloadCheckingFiles);
loadTestModeBtn.addEventListener("click", loadTestMode);
runChatGptBtn.addEventListener("click", runChatGptOnActiveTab);
fillSnorkelBtn.addEventListener("click", fillSnorkelFromJsonOnActiveTab);
autoRunBtn.addEventListener("click", autoRunWorkflow);
copyZipBtn.addEventListener("click", () => copyText(zipNameInput.value));
copyFileApiUrlBtn.addEventListener("click", () => copyText(fileApiUrlInput.value));
copyReviewerFeedbackBtn.addEventListener("click", () => copyText(reviewerFeedbackTextarea.value));
copySummaryBtn.addEventListener("click", () => copyText(summaryTextarea.value));
copyRubricBtn.addEventListener("click", () => copyText(rubricTextarea.value));
copyDifficultyExplanationBtn.addEventListener("click", () => copyText(difficultyExplanationTextarea.value));
copySolutionExplanationBtn.addEventListener("click", () => copyText(solutionExplanationTextarea.value));
copyVerificationExplanationBtn.addEventListener("click", () => copyText(verificationExplanationTextarea.value));
copyChatgptJsonBtn.addEventListener("click", () => copyText(chatgptJsonTextarea.value));

if (reviewTabBtn) {
  reviewTabBtn.addEventListener("click", async () => {
    setSidebarTab("review");
    await chrome.storage.local.set({ sidebarActiveTab: "review" });
  });
}

if (revisionTabBtn) {
  revisionTabBtn.addEventListener("click", async () => {
    setSidebarTab("revision");
    await chrome.storage.local.set({ sidebarActiveTab: "revision" });
  });
}

chatgptUrlInput.addEventListener("change", async () => {
  const value = String(chatgptUrlInput.value || "").trim() || DEFAULT_CHATGPT_URL;
  chatgptUrlInput.value = value;
  await chrome.storage.local.set({ chatgptUrl: value });
});

reviewAhtMinInput.addEventListener("change", persistReviewAhtRange);
reviewAhtMaxInput.addEventListener("change", persistReviewAhtRange);

if (revisionChatgptUrlInput) {
  revisionChatgptUrlInput.addEventListener("change", async () => {
    revisionSettings.revisionChatgptUrl = String(revisionChatgptUrlInput.value || "").trim() || DEFAULT_REVISION_CHATGPT_URL;
    revisionChatgptUrlInput.value = revisionSettings.revisionChatgptUrl;
    await refreshRevisionUiAndPersist();
  });
}

if (revisionBatchSizeInput) {
  revisionBatchSizeInput.addEventListener("change", async () => {
    const parsed = Number.parseInt(String(revisionBatchSizeInput.value || "5"), 10);
    revisionSettings.revisionBatchSize = Math.max(1, Math.min(5, Number.isFinite(parsed) ? parsed : DEFAULT_REVISION_BATCH_SIZE));
    revisionBatchSizeInput.value = String(revisionSettings.revisionBatchSize);
    await refreshRevisionUiAndPersist();
  });
}

if (autoSendNoFixRevisionsInput) {
  autoSendNoFixRevisionsInput.addEventListener("change", async () => {
    revisionSettings.autoSendNoFixRevisions = Boolean(autoSendNoFixRevisionsInput.checked);
    await refreshRevisionUiAndPersist();
  });
}

if (enableGenerateRubricAfterUploadInput) {
  enableGenerateRubricAfterUploadInput.addEventListener("change", async () => {
    revisionSettings.enableGenerateRubricAfterUpload = Boolean(enableGenerateRubricAfterUploadInput.checked);
    await refreshRevisionUiAndPersist();
  });
}

if (autoCheckSendReviewerAfterFixedUploadInput) {
  autoCheckSendReviewerAfterFixedUploadInput.addEventListener("change", async () => {
    revisionSettings.autoCheckSendReviewerAfterFixedUpload = Boolean(autoCheckSendReviewerAfterFixedUploadInput.checked);
    await refreshRevisionUiAndPersist();
  });
}

if (forceFullResendInput) {
  forceFullResendInput.addEventListener("change", async () => {
    revisionSettings.forceFullResend = Boolean(forceFullResendInput.checked);
    await refreshRevisionUiAndPersist();
  });
}

if (scanRevisionListBtn) {
  scanRevisionListBtn.addEventListener("click", async () => {
    try {
      await scanRevisionListFromCurrentTab();
    } catch (err) {
      setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
    }
  });
}

if (startRevisionBatchBtn) {
  startRevisionBatchBtn.addEventListener("click", async () => {
    try {
      await startRevisionBatchFromList();
    } catch (err) {
      setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
    }
  });
}

if (addCurrentRevisionPageBtn) {
  addCurrentRevisionPageBtn.addEventListener("click", async () => {
    try {
      await addCurrentRevisionPage();
    } catch (err) {
      setStatus(`Status: Error - ${err?.message || String(err)}`, "error");
    }
  });
}

if (pauseRevisionQueueBtn) {
  pauseRevisionQueueBtn.addEventListener("click", async () => {
    revisionSettings.paused = true;
    await refreshRevisionUiAndPersist();
    setStatus("Status: Revision queue paused", "warn");
  });
}

if (resumeRevisionQueueBtn) {
  resumeRevisionQueueBtn.addEventListener("click", async () => {
    revisionSettings.paused = false;
    await refreshRevisionUiAndPersist();
    setStatus("Status: Revision queue resumed", "ok");
    await processNextRevisionFromList({ force: true });
  });
}

if (manualCheckFeedbackBtn) {
  manualCheckFeedbackBtn.addEventListener("click", async () => {
    await clickCheckFeedbackOnActiveTab();
  });
}

if (clearFinishedRevisionJobsBtn) {
  clearFinishedRevisionJobsBtn.addEventListener("click", async () => {
    revisionJobs = [];
    revisionBatchScopeUrls = null;
    revisionBatchActive = false;
    await refreshRevisionUiAndPersist();
    setStatus("Status: Cleared jobs list", "ok");
  });
}

if (revisionJobsListEl) {
  revisionJobsListEl.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("button[data-job-action]");
    if (!button) return;
    const action = button.dataset.jobAction;
    const jobId = button.dataset.jobId;
    if (!action || !jobId) return;
    await handleRevisionJobAction(action, jobId);
  });
}

chrome.tabs.onActivated.addListener(() => {
  restoreCachedSnorkelExtractionForActiveTab().catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== "complete") return;
  if (!tab?.active) return;
  restoreCachedSnorkelExtractionForActiveTab().catch(() => {});
});

copyFormattedBtn.addEventListener("click", () => {
  updateFormattedCopyState();

  if (copyFormattedBtn.disabled) {
    setStatus("Status: Error - Get Data first", "error");
    return;
  }

  copyText(formattedTextarea.value);
});

chrome.storage.local
  .get([
    "lastResult",
    "chatgptUrl",
    "lastChatgptJson",
    "lastNormalizedFillData",
    "reviewAhtMin",
    "reviewAhtMax",
    "revisionJobs",
    "revisionSessionRegistry",
    "revisionListState",
    "revisionSettings",
    "sidebarActiveTab",
    "snorkelExtractionCache"
  ])
  .then(({ lastResult, chatgptUrl, lastChatgptJson, lastNormalizedFillData, reviewAhtMin, reviewAhtMax, revisionJobs: savedRevisionJobs, revisionSessionRegistry: savedSessionRegistry, revisionListState: savedRevisionListState, revisionSettings: savedRevisionSettings, sidebarActiveTab, snorkelExtractionCache: savedSnorkelExtractionCache }) => {
    chatgptUrlInput.value = String(chatgptUrl || DEFAULT_CHATGPT_URL);

    const reviewAhtRange = normalizeReviewAhtRange(reviewAhtMin, reviewAhtMax);
    reviewAhtMinInput.value = String(reviewAhtRange.min);
    reviewAhtMaxInput.value = String(reviewAhtRange.max);

    if (lastChatgptJson) {
      chatgptJsonTextarea.value = JSON.stringify(lastChatgptJson, null, 2);
    }

    if (lastNormalizedFillData) {
      difficultyExplanationTextarea.value = lastNormalizedFillData.difficultyExplanation || "";
      solutionExplanationTextarea.value = lastNormalizedFillData.solutionExplanation || "";
      verificationExplanationTextarea.value = lastNormalizedFillData.verificationExplanation || "";
      if (lastNormalizedFillData.rubricText) rubricTextarea.value = lastNormalizedFillData.rubricText;
      if (lastNormalizedFillData.summaryText) summaryTextarea.value = lastNormalizedFillData.summaryText;
    }

  revisionJobs = [];
  revisionSessionRegistry = savedSessionRegistry && typeof savedSessionRegistry === "object" ? savedSessionRegistry : {};
  revisionListState = savedRevisionListState && typeof savedRevisionListState === "object"
    ? { ...revisionListState, ...savedRevisionListState }
    : revisionListState;
  revisionSettings = savedRevisionSettings && typeof savedRevisionSettings === "object"
    ? { ...revisionSettings, ...savedRevisionSettings }
    : revisionSettings;
  snorkelExtractionCache = savedSnorkelExtractionCache && typeof savedSnorkelExtractionCache === "object"
    ? {
      byTabId: savedSnorkelExtractionCache.byTabId && typeof savedSnorkelExtractionCache.byTabId === "object" ? savedSnorkelExtractionCache.byTabId : {},
      byUrl: savedSnorkelExtractionCache.byUrl && typeof savedSnorkelExtractionCache.byUrl === "object" ? savedSnorkelExtractionCache.byUrl : {}
    }
    : { byTabId: {}, byUrl: {} };

  if (revisionChatgptUrlInput) revisionChatgptUrlInput.value = String(revisionSettings.revisionChatgptUrl || DEFAULT_REVISION_CHATGPT_URL);
  if (revisionBatchSizeInput) revisionBatchSizeInput.value = String(revisionSettings.revisionBatchSize || DEFAULT_REVISION_BATCH_SIZE);
  if (autoSendNoFixRevisionsInput) autoSendNoFixRevisionsInput.checked = Boolean(revisionSettings.autoSendNoFixRevisions);
  if (enableGenerateRubricAfterUploadInput) enableGenerateRubricAfterUploadInput.checked = Boolean(revisionSettings.enableGenerateRubricAfterUpload);
  if (autoCheckSendReviewerAfterFixedUploadInput) autoCheckSendReviewerAfterFixedUploadInput.checked = Boolean(revisionSettings.autoCheckSendReviewerAfterFixedUpload);
  if (forceFullResendInput) forceFullResendInput.checked = Boolean(revisionSettings.forceFullResend);

  if (!lastResult) {
    updateFormattedCopyState();
    updateDownloadSourceState();
  } else {
    applyPanelData(lastResult);
  }

  syncRevisionSnapshotFields();

  updateRevisionQueueStats();
  renderRevisionJobs();
  setSidebarTab(sidebarActiveTab === "revision" ? "revision" : DEFAULT_SIDEBAR_TAB);
  restoreCachedSnorkelExtractionForActiveTab().catch(() => {});
  ensureRevisionPolling();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "DOWNLOAD_STATUS") {
    handleRevisionDownloadStatus(message);
  }
});

loadReviewerPromptPrefix();

let nextDownloadFilename = null;

const pendingDownloadsByTabId = new Map();
const pendingChatGptDownloadsByTabId = new Map();
const activeDownloadsById = new Map();

function logBackground(event, details = {}) {
  try {
    console.log("[s-project-extension][background]", event, {
      at: new Date().toISOString(),
      ...details
    });
  } catch {}
}

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

function sanitizeFilename(name) {
  if (!name || typeof name !== "string") return null;

  let clean = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");

  return clean || null;
}

function enqueuePendingDownload(store, tabId, payload) {
  const key = Number(tabId);
  if (!Number.isFinite(key) || key < 0) return false;
  const queue = store.get(key) || [];
  queue.push(payload);
  store.set(key, queue);
  logBackground("download-enqueued", {
    tabId: key,
    queueLength: queue.length,
    role: payload.role,
    jobId: payload.jobId,
    filename: payload.filename
  });
  return true;
}

function prependPendingDownload(store, tabId, payload) {
  const key = Number(tabId);
  if (!Number.isFinite(key) || key < 0 || !payload) return false;
  const queue = store.get(key) || [];
  queue.unshift(payload);
  store.set(key, queue);
  logBackground("download-requeued", {
    tabId: key,
    queueLength: queue.length,
    role: payload.role,
    jobId: payload.jobId,
    filename: payload.filename
  });
  return true;
}

function dequeuePendingDownload(store, tabId) {
  const key = Number(tabId);
  if (!Number.isFinite(key) || key < 0) return null;
  const queue = store.get(key);
  if (!queue?.length) return null;
  const item = queue.shift();
  if (!queue.length) store.delete(key);
  else store.set(key, queue);
  logBackground("download-dequeued", {
    tabId: key,
    remaining: queue.length,
    role: item.role,
    jobId: item.jobId,
    filename: item.filename
  });
  return item;
}

function dequeueSinglePendingDownloadFallback() {
  const candidates = [];
  for (const [tabId, queue] of pendingChatGptDownloadsByTabId.entries()) {
    if (queue?.length) candidates.push({ store: pendingChatGptDownloadsByTabId, tabId, payload: queue[0] });
  }
  for (const [tabId, queue] of pendingDownloadsByTabId.entries()) {
    if (queue?.length) candidates.push({ store: pendingDownloadsByTabId, tabId, payload: queue[0] });
  }

  if (candidates.length !== 1) {
    logBackground("download-fallback-skip", { pendingCount: candidates.length });
    return null;
  }

  const candidate = candidates[0];
  logBackground("download-fallback-single-pending", {
    expectedTabId: candidate.tabId,
    role: candidate.payload.role,
    jobId: candidate.payload.jobId,
    filename: candidate.payload.filename
  });
  return dequeuePendingDownload(candidate.store, candidate.tabId);
}

function looksLikeExpectedDownload(downloadItem, payload) {
  const currentName = String(downloadItem.filename || "").toLowerCase();
  const expectedName = String(payload?.filename || "").toLowerCase();
  const mime = String(downloadItem.mime || "").toLowerCase();
  const role = String(payload?.role || "");

  if (role === "source_zip" || role === "revised_zip") {
    return currentName.endsWith(".zip") || currentName.includes(".zip") || expectedName.endsWith(".zip") || mime.includes("zip") || mime.includes("octet-stream");
  }

  if (role === "building_error") {
    return /\.(txt|log|json|csv)$/i.test(currentName) || /\.(txt|log|json|csv)$/i.test(expectedName) || mime.includes("text") || mime.includes("json") || mime.includes("octet-stream");
  }

  return Boolean(payload?.filename);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SET_NEXT_DOWNLOAD_FILENAME") {
    nextDownloadFilename = sanitizeFilename(message.filename);
    logBackground("legacy-next-download-filename-set", { filename: nextDownloadFilename });
    sendResponse({ ok: true, filename: nextDownloadFilename });
    return true;
  }

  if (message?.type === "CLEAR_NEXT_DOWNLOAD_FILENAME") {
    nextDownloadFilename = null;
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "REGISTER_DOWNLOAD_FILENAME") {
    const filename = sanitizeFilename(message.filename);
    const tabId = Number(message.tabId);

    if (!filename || !Number.isFinite(tabId) || tabId < 0) {
      sendResponse({ ok: false, error: "Invalid download registration payload." });
      return true;
    }

    const payload = {
      filename,
      jobId: String(message.jobId || ""),
      taskUuid: String(message.taskUuid || ""),
      role: String(message.role || ""),
      tabId,
      registeredAt: new Date().toISOString()
    };

    const isChatGptRole = payload.role === "revised_zip";
    logBackground("register-download-filename", payload);
    const ok = enqueuePendingDownload(
      isChatGptRole ? pendingChatGptDownloadsByTabId : pendingDownloadsByTabId,
      tabId,
      payload
    );

    sendResponse({ ok, payload });
    return true;
  }

  if (message?.type === "REGISTER_EXPECTED_CHATGPT_DOWNLOAD") {
    const tabId = Number(message.tabId);
    const filenameHint = sanitizeFilename(message.filenameHint || "revised.zip");

    if (!filenameHint || !Number.isFinite(tabId) || tabId < 0) {
      sendResponse({ ok: false, error: "Invalid ChatGPT download registration payload." });
      return true;
    }

    const payload = {
      filename: filenameHint,
      jobId: String(message.jobId || ""),
      taskUuid: String(message.taskUuid || ""),
      role: String(message.role || "revised_zip"),
      tabId,
      registeredAt: new Date().toISOString()
    };

    logBackground("register-expected-chatgpt-download", payload);
    const ok = enqueuePendingDownload(pendingChatGptDownloadsByTabId, tabId, payload);
    sendResponse({ ok, payload });
    return true;
  }

  return false;
});

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  const tabId = Number(downloadItem.tabId);
  logBackground("determining-filename", {
    downloadId: downloadItem.id,
    tabId,
    originalFilename: downloadItem.filename || "",
    mime: downloadItem.mime || ""
  });
  const byTab =
    dequeuePendingDownload(pendingChatGptDownloadsByTabId, tabId) ||
    dequeuePendingDownload(pendingDownloadsByTabId, tabId);

  const fallback = byTab || dequeueSinglePendingDownloadFallback();

  if (fallback?.filename && looksLikeExpectedDownload(downloadItem, fallback)) {
    logBackground("filename-routed-by-tab", {
      downloadId: downloadItem.id,
      tabId,
      expectedTabId: fallback.tabId,
      jobId: fallback.jobId,
      role: fallback.role,
      filename: fallback.filename,
      usedFallback: !byTab
    });
    activeDownloadsById.set(downloadItem.id, {
      ...fallback,
      originalFilename: downloadItem.filename || "",
      downloadId: downloadItem.id
    });

    suggest({
      filename: fallback.filename,
      conflictAction: "uniquify"
    });
    return;
  }

  if (fallback?.filename) {
    logBackground("filename-fallback-rejected", {
      downloadId: downloadItem.id,
      tabId,
      originalFilename: downloadItem.filename || "",
      role: fallback.role,
      filename: fallback.filename
    });
    const targetStore = fallback.role === "revised_zip" ? pendingChatGptDownloadsByTabId : pendingDownloadsByTabId;
    prependPendingDownload(targetStore, fallback.tabId, fallback);
  }

  if (nextDownloadFilename) {
    const currentName = String(downloadItem.filename || "").toLowerCase();
    const mime = String(downloadItem.mime || "").toLowerCase();

    const looksLikeZip =
      currentName.endsWith(".zip") ||
      currentName.includes(".zip") ||
      mime.includes("zip") ||
      mime.includes("octet-stream");

    if (looksLikeZip) {
      logBackground("filename-routed-legacy", {
        downloadId: downloadItem.id,
        filename: nextDownloadFilename
      });
      suggest({
        filename: nextDownloadFilename,
        conflictAction: "uniquify"
      });
      nextDownloadFilename = null;
      return;
    }
  }

  suggest();
});

chrome.downloads.onChanged.addListener((delta) => {
  if (!delta?.id) return;
  const meta = activeDownloadsById.get(delta.id);
  if (!meta) return;

  const isComplete = delta.state?.current === "complete";
  const isInterrupted = delta.state?.current === "interrupted";
  const filename = delta.filename?.current || "";

  if (!isComplete && !isInterrupted) {
    if (filename) {
      logBackground("download-filename-updated", {
        downloadId: delta.id,
        jobId: meta.jobId,
        role: meta.role,
        filename
      });
    }
    return;
  }

  logBackground("download-changed", {
    downloadId: delta.id,
    ok: isComplete,
    interrupted: isInterrupted,
    jobId: meta.jobId,
    role: meta.role,
    filename: filename || meta.filename
  });

  chrome.runtime.sendMessage({
    type: "DOWNLOAD_STATUS",
    ok: isComplete,
    interrupted: isInterrupted,
    downloadId: delta.id,
    jobId: meta.jobId,
    taskUuid: meta.taskUuid,
    role: meta.role,
    tabId: meta.tabId,
    filename: filename || meta.filename,
    originalFilename: meta.originalFilename || ""
  }).catch(() => {});

  if (isComplete || isInterrupted) {
    activeDownloadsById.delete(delta.id);
  }
});

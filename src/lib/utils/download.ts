const OBJECT_URL_REVOKE_DELAY_MS = 60_000;

type DownloadBlobOptions = {
  forceAttachment?: boolean;
  preferMobileSave?: boolean;
};

function isAppleMobileDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

async function tryMobileSave(blob: Blob, filename: string): Promise<boolean> {
  if (!isAppleMobileDevice() || typeof navigator.share !== 'function' || typeof File === 'undefined') {
    return false;
  }

  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
    return false;
  }

  try {
    await navigator.share({ files: [file], title: filename });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }
    return false;
  }
}

export async function downloadBlob(
  blob: Blob,
  filename: string,
  options: DownloadBlobOptions = {}
): Promise<void> {
  if (options.preferMobileSave && (await tryMobileSave(blob, filename))) {
    return;
  }

  const downloadBlob = options.forceAttachment
    ? new Blob([blob], { type: 'application/octet-stream' })
    : blob;
  const url = URL.createObjectURL(downloadBlob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
}

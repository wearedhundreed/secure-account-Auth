/**
 * Reliable file downloader that functions seamlessly inside sandboxed iframes.
 * Reads stream chunks with progress tracking and triggers the browser download manager.
 */
export async function triggerFileDownload(
  url: string, 
  filename: string,
  onProgress?: (status: 'downloading' | 'ready' | 'error', message?: string) => void
): Promise<boolean> {
  if (onProgress) onProgress('downloading', `Connecting to download server for ${filename}...`);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/vnd.android.package-archive, application/zip, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // If ReadableStream is supported, track live progress
    if (response.body && response.body.getReader) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedBytes += value.length;
          if (totalBytes > 0 && onProgress) {
            const pct = Math.round((loadedBytes / totalBytes) * 100);
            const mbLoaded = (loadedBytes / (1024 * 1024)).toFixed(1);
            const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1);
            onProgress('downloading', `Downloading ${filename} (${pct}% - ${mbLoaded} / ${mbTotal} MB)...`);
          }
        }
      }

      const blob = new Blob(chunks, { type: contentType });
      triggerBlobSave(blob, filename);
    } else {
      const blob = await response.blob();
      triggerBlobSave(blob, filename);
    }

    if (onProgress) onProgress('ready', `Download started: ${filename}`);
    return true;
  } catch (error: any) {
    console.warn('Fetch download failed or was interrupted:', error);
    
    // Attempt direct hidden iframe / anchor fallback before navigating away
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 1000);
      
      if (onProgress) onProgress('ready', `Download request dispatched: ${filename}`);
      return true;
    } catch (fallbackError: any) {
      if (onProgress) onProgress('error', `Download error: ${error.message || 'Network error'}`);
      return false;
    }
  }
}

function triggerBlobSave(blob: Blob, filename: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 3000);
}


/**
 * Reliable file downloader that functions seamlessly inside sandboxed iframes.
 * Uses in-memory Blob + createObjectURL to trigger the browser download manager
 * without violating iframe top-navigation restrictions.
 */
export async function triggerFileDownload(
  url: string, 
  filename: string,
  onProgress?: (status: 'downloading' | 'ready' | 'error', message?: string) => void
): Promise<boolean> {
  if (onProgress) onProgress('downloading', `Preparing ${filename}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Create temporary link element
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Trigger download click
    link.click();

    // Clean up
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 2000);

    if (onProgress) onProgress('ready', `Download started: ${filename}`);
    return true;
  } catch (error: any) {
    console.warn('Blob download failed or restricted by iframe sandbox, falling back to new window:', error);
    if (onProgress) onProgress('error', `Download error: ${error.message}. Opening in new window...`);

    // Fallback: Open directly in a new tab to bypass iframe restrictions
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    } catch {
      return false;
    }
  }
}

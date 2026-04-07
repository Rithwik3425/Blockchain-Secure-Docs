export function getViewerUrl(cid, name) {
  const fileName = name || 'document';
  const fileExt = fileName.split('.').pop().toLowerCase();
  const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt);
  
  const ipfsUrl = `https://ipfs.io/ipfs/${cid}?filename=${encodeURIComponent(fileName)}`;
  
  if (isOfficeDoc) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(ipfsUrl)}&embedded=true`;
  }
  
  return ipfsUrl;
}

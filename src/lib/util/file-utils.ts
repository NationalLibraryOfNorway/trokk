export const formatFileNames = (fileName?: string): string => {
    if (!fileName) return ''
    if (fileName.endsWith('.webp')) return fileName.replace('.webp', '.tif')
    return fileName
}
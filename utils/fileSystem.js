import * as FileSystem from 'expo-file-system/legacy';

export const galleryDirectory = FileSystem.documentDirectory + 'gallery/';

// Ensure the gallery directory exists
export const ensureDirExists = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(galleryDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(galleryDirectory, { intermediates: true });
    }
  } catch (error) {
    // If it fails, try creating it blindly (in case getInfoAsync failed spuriously)
    try {
        await FileSystem.makeDirectoryAsync(galleryDirectory, { intermediates: true });
    } catch (e) {
        console.log('Directory creation check skipped or failed');
    }
  }
};

export const saveFileToGallery = async (tempUri, type) => {
  if (!tempUri) throw new Error("Cannot save file: URI is null");

  await ensureDirExists();

  let extension = 'jpg';
  if (tempUri.includes('.')) {
    extension = tempUri.split('.').pop().split('?')[0];
  }
  
  if (type === 'video' && extension === 'jpg') extension = 'mp4';
  if (type === 'audio' && extension === 'jpg') extension = 'm4a';

  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  const newPath = galleryDirectory + fileName;

  try {
    await FileSystem.copyAsync({ from: tempUri, to: newPath });
    return newPath;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

// NEW: Delete file function
export const deleteFile = async (uri) => {
    try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('File deleted:', uri);
    } catch (error) {
        console.error("Error deleting file:", error);
    }
};
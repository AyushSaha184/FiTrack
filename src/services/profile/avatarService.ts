import { launchImageLibrary } from 'react-native-image-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';

const avatarDir = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/profile`;

const avatarPrefix = (userId: string) => `avatar_${userId}_`;

const ensureDir = async () => {
  try {
    await ReactNativeBlobUtil.fs.mkdir(avatarDir);
  } catch {
    // Directory already exists.
  }
};

const removeExistingAvatars = async (userId: string, keep?: string) => {
  try {
    const entries = await ReactNativeBlobUtil.fs.ls(avatarDir);
    await Promise.all(
      entries
        .filter((name) => name.startsWith(avatarPrefix(userId)) && name !== keep)
        .map((name) => ReactNativeBlobUtil.fs.unlink(`${avatarDir}/${name}`).catch(() => {})),
    );
  } catch {
    // Nothing to clean up.
  }
};

/**
 * Local profile photos. The picked image is copied into the app's documents
 * directory so it survives restarts, and the previous photo is deleted.
 */
export const avatarService = {
  async pickAvatar(userId: string): Promise<string | null> {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: false,
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    });

    if (result.didCancel) return null;
    if (result.errorCode) {
      throw new Error(result.errorMessage || 'Could not open the photo library.');
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) return null;

    await ensureDir();

    const extension =
      asset.fileName?.split('.').pop()?.toLowerCase() ||
      asset.type?.split('/').pop()?.toLowerCase() ||
      'jpg';
    const fileName = `${avatarPrefix(userId)}${Date.now()}.${extension}`;
    const targetPath = `${avatarDir}/${fileName}`;
    const sourcePath = asset.uri.startsWith('file://')
      ? decodeURIComponent(asset.uri.slice('file://'.length))
      : asset.uri;

    try {
      await ReactNativeBlobUtil.fs.cp(sourcePath, targetPath);
    } catch {
      // Fall back to an explicit read/write for content:// URIs.
      const base64 = await ReactNativeBlobUtil.fs.readFile(asset.uri, 'base64');
      await ReactNativeBlobUtil.fs.writeFile(targetPath, base64, 'base64');
    }

    await removeExistingAvatars(userId, fileName);

    return `file://${targetPath}`;
  },

  async removeAvatar(userId: string): Promise<void> {
    await removeExistingAvatars(userId);
  },

  async clearAll(): Promise<void> {
    try {
      await ReactNativeBlobUtil.fs.unlink(avatarDir);
    } catch {
      // Directory does not exist.
    }
  },
};

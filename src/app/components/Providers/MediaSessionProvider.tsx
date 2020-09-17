import MediaItem = MusicKit.MediaItem;
import { artworkForMediaItem } from '../../utils/Utils';

export function mediaSessionSetAction(action: MediaSessionAction, listener: (() => void) | null) {
  if (navigator.mediaSession) {
    navigator.mediaSession.setActionHandler(action, listener);
  }
}

export function mediaSessionSetMetadata(nowPlayingItem: MediaItem) {
  if (navigator.mediaSession) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: nowPlayingItem.title,
      artist: nowPlayingItem.attributes.artistName,
      album: nowPlayingItem.attributes.albumName,
      artwork: [
        { src: artworkForMediaItem(nowPlayingItem, 96), type: 'image/jpeg', sizes: '96x96' },
        { src: artworkForMediaItem(nowPlayingItem, 128), type: 'image/jpeg', sizes: '128x128' },
        { src: artworkForMediaItem(nowPlayingItem, 192), type: 'image/jpeg', sizes: '192x192' },
        { src: artworkForMediaItem(nowPlayingItem, 256), type: 'image/jpeg', sizes: '256x256' },
        { src: artworkForMediaItem(nowPlayingItem, 384), type: 'image/jpeg', sizes: '384x384' },
        { src: artworkForMediaItem(nowPlayingItem, 512), type: 'image/jpeg', sizes: '512x512' },
      ],
    });
  }
}

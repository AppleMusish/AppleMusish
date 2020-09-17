import cx from 'classnames';
import Mousetrap from 'mousetrap';
import React, { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import withContext from '../../../hoc/withContext';
import withMK from '../../../hoc/withMK';
import {
  isShuffled,
  pause,
  play,
  shuffle,
  togglePlayback,
  unShuffle,
} from '../../../services/MusicPlayerApi';
import {
  artworkForMediaItem,
  RepeatModeAll,
  RepeatModeNone,
  RepeatModeOne,
} from '../../../utils/Utils';
import { AuthorizeContext } from '../../Providers/AuthorizeProvider';
import { LyricsModalProps, withLyricsModal } from '../../Providers/LyricsModalProvider';
import {
  mediaSessionSetAction,
  mediaSessionSetMetadata,
} from '../../Providers/MediaSessionProvider';
import { ModalProviderValue, withModal } from '../../Providers/ModalProvider';
import { QueueModalProps, withQueueModal } from '../../Providers/QueueProvider';
import AlbumPanel from '../AlbumPanel/AlbumPanel';
import styles from './Player.scss';
import PlayerTime from './PlayerTime';
import Rating from './Rating/Rating';
import VolumeControl from './VolumeControl';

interface PlayerProps extends MKProps, QueueModalProps, LyricsModalProps {
  authorized: boolean;
  modal: ModalProviderValue;
}

class Player extends React.Component<PlayerProps> {
  public componentDidMount() {
    // Disable default scroll behaviour on click
    Mousetrap.bind(
      ['space', 'left', 'right'],
      e => {
        e.preventDefault();
      },
      'keydown',
    );

    // Playback controls
    Mousetrap.bind('left', this.handlePrevious, 'keyup');
    Mousetrap.bind('right', this.handleNext, 'keyup');
    Mousetrap.bind('space', togglePlayback, 'keyup');

    mediaSessionSetAction('play', play);
    mediaSessionSetAction('pause', pause);
    mediaSessionSetAction('nexttrack', this.handleNext);
    mediaSessionSetAction('previoustrack', this.handlePrevious);
    mediaSessionSetAction('seekforward', this.handleSeekForward);
    mediaSessionSetAction('seekbackward', this.handleSeekBackward);
  }

  public handlePrevious = () => {
    const { player } = this.props.mk.instance;

    if (player.currentPlaybackTime < 2) {
      player.skipToPreviousItem();
    } else {
      player.seekToTime(0);
    }
  };

  public handleNext = () => {
    const { player } = this.props.mk.instance;
    player.skipToNextItem();

    if (player.repeatMode === 1) {
      player.seekToTime(0);
    }
  };

  public handleSeekForward = () => {
    const seekTimeInSeconds = 5;
    const { player } = this.props.mk.instance;
    player.seekToTime(
      Math.min(player.currentPlaybackTime + seekTimeInSeconds, player.currentPlaybackDuration),
    );
  };

  public handleSeekBackward = () => {
    const { player } = this.props.mk.instance;
    const seekTimeInSeconds = 5;
    player.seekToTime(Math.max(player.currentPlaybackTime - seekTimeInSeconds, 0));
  };

  public handleRepeat = () => {
    const { player } = this.props.mk.instance;

    if (player.repeatMode === RepeatModeNone) {
      player.repeatMode = RepeatModeOne;
    } else if (player.repeatMode === RepeatModeOne) {
      player.repeatMode = RepeatModeAll;
    } else {
      player.repeatMode = RepeatModeNone;
    }

    this.forceUpdate();
  };

  public handleShuffle = async () => {
    if (isShuffled()) {
      await unShuffle();
    } else {
      await shuffle();
    }

    this.forceUpdate();
  };

  public handleOpenAlbum = (push: (content: ReactNode, style?: CSSProperties) => void) => {
    const nowPlayingItem = this.props.mk.mediaItem && this.props.mk.mediaItem.item;
    const meta = nowPlayingItem.assets[0].metadata;

    const id = meta.playlistId;

    push(<AlbumPanel key={id} id={id} pseudoRoute />);
  };

  public render() {
    const { mk, modal, lyricsModal, queueModal } = this.props;
    const nowPlayingItem = mk.mediaItem && mk.mediaItem.item;

    if (!nowPlayingItem) {
      return null;
    }

    const artworkURL = artworkForMediaItem(nowPlayingItem, 60);

    const { repeatMode } = mk.instance.player;

    const isRepeating = repeatMode === RepeatModeOne || repeatMode === RepeatModeAll;

    const hasMeta = nowPlayingItem.assets.length > 0;

    const artistName = hasMeta ? (
      <Link to={`/artist/${nowPlayingItem.assets[0].metadata.artistId}`}>
        <span className={cx(styles.artistName, styles.link)}>
          {nowPlayingItem.attributes.artistName}
        </span>
      </Link>
    ) : (
      <span className={cx(styles.artistName)}>{nowPlayingItem.attributes.artistName}</span>
    );

    const albumName = hasMeta ? (
      <span
        className={cx(styles.albumName, styles.link)}
        onClick={() => this.handleOpenAlbum(modal.replace)}
      >
        {nowPlayingItem.attributes.albumName}
      </span>
    ) : (
      <span className={cx(styles.albumName)}>{nowPlayingItem.attributes.albumName}</span>
    );

    if (hasMeta) {
      mediaSessionSetMetadata(nowPlayingItem);
    }

    return (
      <div className={styles.player}>
        <div className={styles.mainInfo}>
          <div className={styles.picture}>
            <img src={artworkURL} className={styles.image} alt={'album artwork'} />
          </div>
          <div className={styles.track}>
            <h1>{nowPlayingItem.title}</h1>
            {artistName}
            {albumName}
          </div>
        </div>
        <PlayerTime nowPlayingItem={nowPlayingItem} />
        <div className={styles.buttons}>
          <span onClick={this.handlePrevious}>
            <i className={'fas fa-backward'} />
          </span>
          {mk.instance.player.isPlaying ? (
            <span className={styles.main} onClick={pause}>
              <i className={'fas fa-pause'} />
            </span>
          ) : (
            <span className={styles.main} onClick={play}>
              <i className={'fas fa-play'} />
            </span>
          )}
          <span onClick={this.handleNext}>
            <i className={'fas fa-forward'} />
          </span>
        </div>

        <div className={styles.buttons}>
          <VolumeControl />

          {this.props.authorized && (
            <Rating key={nowPlayingItem.id} nowPlayingItem={nowPlayingItem} />
          )}

          <span
            className={cx(styles.controls, styles.shuffle, {
              [styles.enabled]: isRepeating,
              [styles.one]: repeatMode === RepeatModeOne,
            })}
            onClick={this.handleRepeat}
          >
            <i className={'fas fa-redo-alt'} />
          </span>

          <span
            className={cx(styles.controls, { [styles.enabled]: isShuffled() })}
            onClick={this.handleShuffle}
          >
            <i className={'fas fa-random'} />
          </span>

          <span
            className={cx(styles.controls, { [styles.enabled]: lyricsModal.isOpen })}
            onClick={() => (lyricsModal.isOpen ? lyricsModal.close() : lyricsModal.open())}
          >
            <i className={'fas fa-align-left'} />
          </span>

          <span
            className={cx(styles.controls, { [styles.enabled]: queueModal.isOpen })}
            onClick={queueModal.isOpen ? queueModal.close : queueModal.open}
          >
            <i className={'fas fa-list-ol'} />
          </span>
        </div>
      </div>
    );
  }
}

const bindings = {
  [MusicKit.Events.mediaItemDidChange]: 'mediaItem',
  [MusicKit.Events.queueItemsDidChange]: 'queueItems',
  [MusicKit.Events.queuePositionDidChange]: 'queuePosition',
  [MusicKit.Events.playbackStateDidChange]: 'playbackState',
};

export default withMK(
  withQueueModal(withLyricsModal(withModal(withContext(Player, AuthorizeContext)))),
  bindings,
);

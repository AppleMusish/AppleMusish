import cx from 'classnames';
import React, { RefObject } from 'react';
import HTMLEllipsis from 'react-lines-ellipsis/lib/html';
import { RouteComponentProps } from 'react-router';
import { Link, Route, withRouter } from 'react-router-dom';
import { List, WindowScroller } from 'react-virtualized';
import withPseudoRoute from '../../../hoc/withPseudoRoute';
import * as MusicApi from '../../../services/MusicApi';
import * as MusicPlayerApi from '../../../services/MusicPlayerApi';
import translate from '../../../utils/translations/Translations';
import { artworkForMediaItem, humanifyMillis, humanifyTrackNumbers } from '../../../utils/Utils';
import { ModalProviderValue, withModal } from '../../Providers/ModalProvider';
import Loader from '../Loader/Loader';
import TracksList from '../Tracks/TracksList/TracksList';
import EAlbumPanel from './AlbumPanel';
import classes from './AlbumPanel.scss';
import QueryParameters = MusicKit.QueryParameters;

interface AlbumPanelProps extends RouteComponentProps {
  id?: any;
  album?: MusicKit.Resource;
  className?: string;
  modal: ModalProviderValue;
}

interface AlbumPanelState {
  album: MusicKit.Resource | null;
  shouldMatchCatalogAlbum: boolean;
  matchedCatalogAlbum: MusicKit.Resource | null;
  showFullDescription: boolean;
  runtime: string;
}

class AlbumPanel extends React.Component<AlbumPanelProps, AlbumPanelState> {
  public static defaultProps = {
    id: null,
    album: undefined,
    className: '',
  };

  private readonly albumId: any;
  private readonly isCatalog: boolean;
  private readonly panelRef: RefObject<HTMLDivElement>;
  private readonly tracksListWsRef: RefObject<WindowScroller>;
  private readonly tracksListListRef: RefObject<List>;
  private readonly store: {};

  constructor(props: AlbumPanelProps) {
    super(props);

    this.albumId = this.props.id || this.props.album!.id;
    this.isCatalog = !isNaN(this.albumId);

    this.state = {
      album: null,
      shouldMatchCatalogAlbum: !this.isCatalog,
      matchedCatalogAlbum: null,
      showFullDescription: false,
      runtime: '',
    };

    this.panelRef = React.createRef();
    this.tracksListWsRef = React.createRef();
    this.tracksListListRef = React.createRef();
    this.store = {};
  }

  public componentDidMount() {
    this.fetchAlbum();
  }

  public fetchAlbum = async () => {
    const album = await this.albumLoader(this.albumId);

    this.setState({
      album,
    });
  };

  public albumLoader = (id: string, parameters?: QueryParameters) => {
    const music = MusicKit.getInstance();
    if (!this.isCatalog) {
      return music.api.library.album(id, parameters);
    }

    return music.api.album(id, parameters);
  };

  public onSetItems = ({ items }: { items: MusicKit.MediaItem[] | null }) => {
    const albumLength = items
      ? items.reduce(
          (totalDuration, track) =>
            totalDuration + (track.attributes ? track.attributes.durationInMillis : 0),
          0,
        )
      : 0;

    if (this.state.shouldMatchCatalogAlbum) {
      this.fetchFullCatalogAlbum();
    }

    this.setState({
      runtime: humanifyMillis(albumLength),
    });
  };

  public playTrack = async ({ index }: { index: number }) => {
    await MusicPlayerApi.playAlbum(this.state.album!, index);
  };

  public playAlbum = async () => {
    await MusicPlayerApi.playAlbum(this.state.album!, 0);
  };

  public shufflePlayAlbum = async () => {
    await MusicPlayerApi.shufflePlayAlbum(this.state.album!);
  };

  public fetchFullCatalogAlbum = async () => {
    const { album } = this.state;
    const catalogAlbum = await MusicApi.fetchFullCatalogAlbumFromLibraryAlbum(album!);
    this.setState({
      matchedCatalogAlbum: catalogAlbum,
    });
  };

  public toggleFullDescription = () => {
    const { showFullDescription } = this.state;

    this.setState({
      showFullDescription: !showFullDescription,
    });
  };

  public render() {
    const { modal } = this.props;
    const { album, matchedCatalogAlbum, runtime, showFullDescription } = this.state;

    if (!album) {
      return <Loader />;
    }

    const artworkURL = artworkForMediaItem(album as MusicKit.MediaItem, 220);

    const explicit = album.attributes.contentRating === 'explicit' && (
      <div className={classes.explicit}>
        <span>
          <span>E</span>
        </span>
      </div>
    );

    const artistList = 'artists' in album.relationships ? album.relationships.artists.data : null;
    const artistId = artistList && artistList.length > 0 ? artistList[0].id : null;
    const artistName = artistId ? (
      <Link to={`/artist/${artistId}`}>{album.attributes.artistName}</Link>
    ) : (
      album.attributes.artistName
    );

    const albumGenre = album.attributes.genreNames[0];
    const albumYear = album.attributes.releaseDate.split('-')[0];

    return (
      <div className={cx(classes.panel, this.props.className)} ref={this.panelRef}>
        <div className={classes.aside}>
          <div className={classes.artworkWrapper}>
            <img src={artworkURL} alt={album.attributes.name} />
          </div>
          <div className={classes.playActions}>
            <button type={'button'} onClick={this.playAlbum} className={classes.button}>
              <i className={`${classes.icon} fas fa-play`} />
              {translate.play}
            </button>
            <button type={'button'} onClick={this.shufflePlayAlbum} className={classes.button}>
              <i className={`${classes.icon} fas fa-random`} />
              {translate.shuffle}
            </button>
          </div>
          <span className={classes.albumRuntimeDescription}>
            {`${humanifyTrackNumbers(album.attributes.trackCount)}, ${runtime}`}
          </span>
        </div>

        <div className={classes.main}>
          <span className={classes.title}>
            <span>{album.attributes.name}</span>
            {explicit}
          </span>

          <span className={classes.subtitle}>{artistName}</span>
          <span className={classes.subtitle}>
            {album.attributes.isComplete ? `${albumGenre} - ${albumYear}` : 'Upcoming Album'}
          </span>

          {album.attributes.editorialNotes && album.attributes.editorialNotes.standard && (
            <div className={classes.description} onClick={this.toggleFullDescription}>
              <HTMLEllipsis
                unsafeHTML={album.attributes.editorialNotes.standard}
                maxLine={showFullDescription ? Number.MAX_SAFE_INTEGER : 3}
                ellipsisHTML='<i class="read-more">... read more</i>'
                basedOn='words'
                onReflow={() => {
                  const tracksListWs = this.tracksListWsRef.current;
                  if (tracksListWs) {
                    tracksListWs.updatePosition();
                  }

                  const tracksListList = this.tracksListListRef.current;
                  if (tracksListList) {
                    tracksListList.forceUpdateGrid();
                  }
                }}
              />
            </div>
          )}

          <TracksList
            scrollElement={this.panelRef}
            scrollElementModifier={e => e && e.parentElement}
            load={MusicApi.infiniteLoadRelationships(
              this.albumId,
              this.albumLoader,
              'tracks',
              this.store,
            )}
            onSetItems={this.onSetItems}
            playTrack={this.playTrack}
            wsRef={this.tracksListWsRef}
            listRef={this.tracksListListRef}
          />

          {matchedCatalogAlbum && (
            <div className={classes.showCompleteContainer}>
              <Route path={'/me/albums'}>
                {({ match }) => (
                  <span
                    onClick={() => {
                      if (match) {
                        this.props.history.push('/me/albums/');
                      }
                      modal.push(
                        <EAlbumPanel
                          key={matchedCatalogAlbum.id}
                          album={matchedCatalogAlbum}
                          pseudoRoute
                        />,
                      );
                    }}
                  >
                    {translate.showCompleteAlbum}
                  </span>
                )}
              </Route>
            </div>
          )}
        </div>
      </div>
    );
  }
}

const pseudoRoute = ({ id, album }: { id?: any; album?: MusicKit.Resource }) => {
  const albumId = id || album!.id;
  let route = `/album/${albumId}`;
  if (isNaN(albumId)) {
    route = '/me' + route;
  }
  return route;
};

export default withPseudoRoute(withRouter(withModal(AlbumPanel)), pseudoRoute);

import React from 'react';
import { withRouter } from 'react-router-dom';
import cx from 'classnames';
import classes from './BrowsePage.scss';
import AlbumItem from '../Albums/AlbumItem';
import Loader from '../../common/Loader';
import PropTypes from 'prop-types';

class AlbumList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      list: null,
    };

    this.getAlbums = this.getAlbums.bind(this);
  }

  async getAlbums(ids) {
    const music = MusicKit.getInstance();
    const list = await music.api.albums(ids);

    this.setState({
      list: list,
    });
  }

  async componentDidMount() {
    if ((this.props.list == undefined || this.props.list == null) && (this.props.listIds !== null && this.props.listIds !== undefined)) {
      this.getAlbums(this.props.listIds);
    }
  }

  render() {
    const list = this.props.list ? this.props.list : this.state.list;

    return (
      <>
        <h3>{this.props.title}</h3>
        <div className={classes.scrollWrapper}>
          <div className={cx(classes.scrollGrid)}>
            {list ? (
              list.map(album =>
                <AlbumItem key={album.id} album={album} size={170} />
              )
            ) : (
                <Loader />
              )}
          </div>
        </div>
      </>
    );
  }
}

AlbumList.propTypes = {
  title: PropTypes.any,
  list: PropTypes.any,
  listIds: PropTypes.any,
};

AlbumList.defaultProps = {
  title: '',
  list: null,
  listIds: null,
};

export default withRouter(AlbumList);

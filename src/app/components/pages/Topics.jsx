import React, { Component } from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { browserHistory } from 'react-router';
import tt from 'counterpart';
import PropTypes from 'prop-types';
import NativeSelect from 'app/components/elements/NativeSelect';
import { List } from 'immutable';

const buildPrefix = level => {
    let a = '';
    for (let i = 0; i < level; i++) {
        a = a + '>';
    }
    return a;
};

const buildCategories = (categories, level, max) => {
    const prefix = buildPrefix(level);
    if (List.isList(categories)) {
        return categories.map(c => prefix + c);
    } else {
        let c_list = List();
        categories.mapKeys((c, v) => {
            c_list = c_list.push(prefix + c);
            // only display max levels
            if (level < max - 1) {
                c_list = c_list.concat(buildCategories(v, level + 1, max));
            }
        });
        return c_list;
    }
};

const parseCategory = cat => {
    const tag = cat.replace(/\>/g, '');
    const label = cat.replace(/\>/g, '\u00a0\u00a0\u00a0');
    return { tag, label };
};

class Topics extends Component {
    static propTypes = {
        username: PropTypes.string,
        topics: PropTypes.object.isRequired,
        subscriptions: PropTypes.object,
        current: PropTypes.string,
        compact: PropTypes.bool.isRequired,
        order: PropTypes.string,
        categories: PropTypes.object,
    };

    static defaultProps = {
        current: '',
    };

    handleChange = selectedOption => {
        browserHistory.push(selectedOption.value);
    };

    currentlySelected = (currentTag, username, currentOrder = false) => {
        const opts = {
            feed: `/@${username}/feed`,
            tagOnly: `/trending/${currentTag}`,
            orderOnly: `/${currentOrder}`,
            tagWithOrder: `/${currentOrder}/${currentTag}`,
            default: `/trending`,
        };
        if (currentOrder === 'feed') return opts['feed'];
        if (currentTag && currentOrder) return opts['tagWithOrder'];
        if (!currentTag && currentOrder) return opts['orderOnly'];
        if (currentTag && !currentOrder) return opts['tagOnly'];
        return opts['default'];
    };

    render() {
        const {
            current,
            compact,
            username,
            topics,
            subscriptions,
            communities,
            categories,
        } = this.props;
        const currentOrder = this.props.order;
        const order = currentOrder == 'feed' ? 'trending' : currentOrder;

        if (compact) {
            const extras = username => {
                const ex = {
                    allTags: order => ({
                        value: `/${order}`,
                        label: `${tt('g.all_tags_mobile')}`,
                    }),
                    myFeed: name => ({
                        value: `/@${name}/feed`,
                        label: `${tt('g.my_feed')}`,
                    }),
                };
                return username
                    ? [ex.allTags(order), ex.myFeed(username)]
                    : [ex.allTags(order)];
            };
            const opts = extras(username).concat(
                categories
                    .map(cat => {
                        const { tag, label } = parseCategory(cat);
                        const link = order ? `/${order}/${tag}` : `/${tag}`;
                        return { value: link, label: label };
                    })
                    .toJS()
            );
            return (
                <NativeSelect
                    currentlySelected={this.currentlySelected(
                        current,
                        username,
                        currentOrder
                    )}
                    options={opts}
                    onChange={this.handleChange}
                />
            );
            /*
            const opt = (tag, label = null) => {
                if (tag && tag[0] === '@')
                    return {
                        value: `/@${username}/feed`,
                        label: 'My friends' || `tt('g.my_feed')`,
                    };
                if (tag === 'my')
                    return { value: `/trending/my`, label: 'My communities' };
                if (tag == 'explore')
                    return {
                        value: `/communities`,
                        label: 'Explore Communities...',
                    };
                if (tag)
                    return {
                        value: `/trending/${tag}`,
                        label: label || '#' + tag,
                    };
                return { value: `/`, label: tt('g.all_tags') };
            };

            const options = [];
            // Add 'All Posts' link.
            options.push(opt(null));
            if (username && subscriptions) {
                // Add 'My Friends' Link
                options.push(opt('@' + username));
                // Add 'My Communities' Link
                options.push(opt('my'));
                const subscriptionOptions = subscriptions
                    .toJS()
                    .map(cat => opt(cat[0], cat[1]));
                options.push({
                    value: 'Subscriptions',
                    label: 'Community Subscriptions',
                    disabled: true,
                });
                options.push(...subscriptionOptions);
            }
            if (topics) {
                const topicsOptions = topics
                    .toJS()
                    .map(cat => opt(cat[0], cat[1]));
                options.push({
                    value: 'Topics',
                    label: 'Trending Communities',
                    disabled: true,
                });
                options.push(...topicsOptions);
            }

            options.push(opt('explore'));
            const currOpt = opt(current);
            if (!options.find(opt => opt.value == currOpt.value)) {
                options.push(
                    opt(current, communities.getIn([current, 'title']))
                );
            }

            return (
                <NativeSelect
                    options={options}
                    currentlySelected={currOpt.value}
                    onChange={opt => {
                        browserHistory.push(opt.value);
                    }}
                />
            );
            */
        }

        const categoriesLinks = categories.map(cat => {
            const { tag, label } = parseCategory(cat);
            const link = order ? `/${order}/${tag}` : `/hot/${tag}`;
            return (
                <li className="c-sidebar__list-item" key={tag}>
                    <Link
                        to={link}
                        className="c-sidebar__link"
                        activeClassName="active"
                    >
                        {label}
                    </Link>
                </li>
            );
        });
        return (
            <div className="c-sidebar__module">
                <div className="c-sidebar__content">
                    <ul className="c-sidebar__list">
                        <li className="c-sidebar__list-item">
                            <div className="c-sidebar__header">
                                <Link
                                    to={'/' + order}
                                    className="c-sidebar__link"
                                    activeClassName="active"
                                >
                                    {tt('g.all_tags')}
                                </Link>
                            </div>
                        </li>
                        {categoriesLinks}
                    </ul>
                </div>
            </div>
        );
        /*
         const moreLabel = <span>{tt('g.show_more_topics')}&hellip;</span>;
         const title =
             subscriptions && username
                 ? 'My subscriptions'
                 : 'Trending Communities';
         const commsHead = (
             <div style={{ color: '#aaa', paddingTop: '0em' }}>{title}</div>
         );
         const link = (url, label, className = 'c-sidebar__header') => (
            <div className={className}>
                <Link
                    to={url}
                    className="c-sidebar__link"
                    activeClassName="active"
                >
                    {label}
                </Link>
            </div>
        );
        const list = (
            <ul className="c-sidebar__list">
                <li>{link('/', tt('g.all_tags'))}</li>
                {username && (
                    <li>{link(`/@${username}/feed`, 'My friends')}</li>
                )}
                {username && <li>{link(`/trending/my`, 'My communities')}</li>}
                {(subscriptions || topics).size > 0 && <li>{commsHead}</li>}
                {username &&
                    subscriptions &&
                    subscriptions
                        .toJS()
                        .map(cat => (
                            <li key={cat[0]}>
                                {link(`/trending/${cat[0]}`, cat[1], '')}
                            </li>
                        ))}
                {(!username || !subscriptions) &&
                    topics
                        .toJS()
                        .map(cat => (
                            <li key={cat[0]}>
                                {link(`/trending/${cat[0]}`, cat[1], '')}
                            </li>
                        ))}
                <li>
                    {link(
                        `/communities`,
                        moreLabel,
                        'c-sidebar__link--emphasis'
                    )}
                </li>
            </ul>
        );
        return (
            <div className="c-sidebar__module">
                <div className="c-sidebar__content">{list}</div>
            </div>
        );
       */
    }
}

export default connect(
    // mapStateToProps
    (state, ownProps) => {
        const categories = buildCategories(
            ownProps.categories,
            0,
            ownProps.levels
        );
        return {
            ...ownProps,
            communities: state.global.get('community'),
            categories,
        };
    }
)(Topics);

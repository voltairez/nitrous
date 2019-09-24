import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router';
import TimeAgoWrapper from 'app/components/elements/TimeAgoWrapper';
import Icon from 'app/components/elements/Icon';
import { connect } from 'react-redux';
import * as userActions from 'app/redux/UserReducer';
import * as transactionActions from 'app/redux/TransactionReducer';
import * as globalActions from 'app/redux/GlobalReducer';
import Voting from 'app/components/elements/Voting';
import Reblog from 'app/components/elements/Reblog';
import MarkdownViewer from 'app/components/cards/MarkdownViewer';
import ReplyEditor from 'app/components/elements/ReplyEditor';
import { immutableAccessor } from 'app/utils/Accessors';
import extractContent from 'app/utils/ExtractContent';
import TagList from 'app/components/elements/TagList';
import Author from 'app/components/elements/Author';
import { parsePayoutAmount } from 'app/utils/ParsersAndFormatters';
import DMCAList from 'app/utils/DMCAList';
import PageViewsCounter from 'app/components/elements/PageViewsCounter';
import ShareMenu from 'app/components/elements/ShareMenu';
import MuteButtonContainer from 'app/components/elements/MuteButtonContainer';
import { serverApiRecordEvent } from 'app/utils/ServerApiClient';
import Userpic from 'app/components/elements/Userpic';
import { APP_DOMAIN, APP_NAME } from 'app/client_config';
import tt from 'counterpart';
import userIllegalContent from 'app/utils/userIllegalContent';
import ImageUserBlockList from 'app/utils/ImageUserBlockList';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import ContentEditedWrapper from '../elements/ContentEditedWrapper';
import { allowDelete } from 'app/utils/StateFunctions';

function TimeAuthorCategory({ content, authorRep, showTags }) {
    return (
        <span className="PostFull__time_author_category vcard">
            <Icon name="clock" className="space-right" />
            <TimeAgoWrapper date={content.created} />
            {} {tt('g.by')}{' '}
            <Author
                author={content.author}
                authorRep={authorRep}
                showAffiliation
                role={content.author_role}
                title={content.author_title}
            />
            {showTags && (
                <span>
                    {' '}
                    {tt('g.in')} <TagList post={content} single />
                </span>
            )}
        </span>
    );
}

function TimeAuthorCategoryLarge({ content, authorRep }) {
    return (
        <span className="PostFull__time_author_category_large vcard">
            <Userpic account={content.author} />
            <div className="right-side">
                <Author
                    author={content.author}
                    authorRep={authorRep}
                    showAffiliation
                    role={content.author_role}
                    title={content.author_title}
                />
                <span>
                    {' '}
                    {tt('g.in')} <TagList post={content} single />
                </span>{' '}
                •&nbsp; <TimeAgoWrapper date={content.created} />
                &nbsp;{' '}
                <ContentEditedWrapper
                    createDate={content.created}
                    updateDate={content.last_update}
                />
            </div>
        </span>
    );
}

class PostFull extends React.Component {
    static propTypes = {
        // html props
        /* Show extra options (component is being viewed alone) */
        cont: PropTypes.object.isRequired,
        post: PropTypes.string.isRequired,

        // connector props
        username: PropTypes.string,
        unlock: PropTypes.func.isRequired,
        deletePost: PropTypes.func.isRequired,
        showPromotePost: PropTypes.func.isRequired,
        showExplorePost: PropTypes.func.isRequired,
        togglePinnedPost: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        const post = this.props.cont.get(this.props.post);
        const isPinned = post.get('stats').get('is_pinned');
        const isMuted = post.get('stats').get('gray');

        this.state = { isPinned, isMuted, showMuteNotesDialog: false };

        this.fbShare = this.fbShare.bind(this);
        this.twitterShare = this.twitterShare.bind(this);
        this.redditShare = this.redditShare.bind(this);
        this.linkedInShare = this.linkedInShare.bind(this);
        this.showExplorePost = this.showExplorePost.bind(this);

        this.onShowReply = () => {
            const { state: { showReply, formId } } = this;
            this.setState({ showReply: !showReply, showEdit: false });
            saveOnShow(formId, !showReply ? 'reply' : null);
        };
        this.onShowEdit = () => {
            const { state: { showEdit, formId } } = this;
            this.setState({ showEdit: !showEdit, showReply: false });
            saveOnShow(formId, !showEdit ? 'edit' : null);
        };
        this.onDeletePost = () => {
            const { props: { deletePost } } = this;
            const content = this.props.cont.get(this.props.post);
            deletePost(content.get('author'), content.get('permlink'));
        };
    }

    componentWillMount() {
        const { post } = this.props;
        const formId = `postFull-${post}`;
        this.setState({
            formId,
            PostFullReplyEditor: ReplyEditor(formId + '-reply'),
            PostFullEditEditor: ReplyEditor(formId + '-edit'),
        });
        if (process.env.BROWSER) {
            let showEditor = localStorage.getItem('showEditor-' + formId);
            if (showEditor) {
                showEditor = JSON.parse(showEditor);
                if (showEditor.type === 'reply') {
                    this.setState({ showReply: true });
                }
                if (showEditor.type === 'edit') {
                    this.setState({ showEdit: true });
                }
            }
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const names = 'cont, post, username'.split(', ');
        return (
            names.findIndex(name => this.props[name] !== nextProps[name]) !==
                -1 || this.state !== nextState
        );
    }

    fbShare(e) {
        const href = this.share_params.url;
        e.preventDefault();
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${href}`,
            'fbshare',
            'width=600, height=400, scrollbars=no'
        );
        serverApiRecordEvent('FbShare', this.share_params.link);
    }

    twitterShare(e) {
        serverApiRecordEvent('TwitterShare', this.share_params.link);
        e.preventDefault();
        const winWidth = 640;
        const winHeight = 320;
        const winTop = screen.height / 2 - winWidth / 2;
        const winLeft = screen.width / 2 - winHeight / 2;
        const s = this.share_params;
        const q =
            'text=' +
            encodeURIComponent(s.title) +
            '&url=' +
            encodeURIComponent(s.url);
        window.open(
            'http://twitter.com/share?' + q,
            'Share',
            'top=' +
                winTop +
                ',left=' +
                winLeft +
                ',toolbar=0,status=0,width=' +
                winWidth +
                ',height=' +
                winHeight
        );
    }

    redditShare(e) {
        serverApiRecordEvent('RedditShare', this.share_params.link);
        e.preventDefault();
        const s = this.share_params;
        const q =
            'title=' +
            encodeURIComponent(s.title) +
            '&url=' +
            encodeURIComponent(s.url);
        window.open('https://www.reddit.com/submit?' + q, 'Share');
    }

    linkedInShare(e) {
        serverApiRecordEvent('LinkedInShare', this.share_params.link);
        e.preventDefault();
        const winWidth = 720;
        const winHeight = 480;
        const winTop = screen.height / 2 - winWidth / 2;
        const winLeft = screen.width / 2 - winHeight / 2;
        const s = this.share_params;
        const q =
            'title=' +
            encodeURIComponent(s.title) +
            '&url=' +
            encodeURIComponent(s.url) +
            '&source=Steemit&mini=true';
        window.open(
            'https://www.linkedin.com/shareArticle?' + q,
            'Share',
            'top=' +
                winTop +
                ',left=' +
                winLeft +
                ',toolbar=0,status=0,width=' +
                winWidth +
                ',height=' +
                winHeight
        );
    }

    showPromotePost = () => {
        const post_content = this.props.cont.get(this.props.post);
        if (!post_content) return;
        const author = post_content.get('author');
        const permlink = post_content.get('permlink');
        this.props.showPromotePost(author, permlink);
    };

    showExplorePost = () => {
        const permlink = this.share_params.link;
        const title = this.share_params.rawtitle;
        this.props.showExplorePost(permlink, title);
    };

    onTogglePin = isPinned => {
        const { community, username } = this.props;
        if (!community) return false; // Fail Fast
        if (!username) {
            return this.props.unlock();
        }
        const post_content = this.props.cont.get(this.props.post);
        const permlink = post_content.get('permlink');

        this.props.togglePinnedPost(
            !isPinned,
            community,
            username,
            permlink,
            () => {
                console.log('PostFull::onTogglePin()::success');
                this.setState({ isPinned: !isPinned });
            },
            () => {
                console.log('PostFull::onTogglePin()::failure');
                this.setState({ isPinned });
            }
        );
    };

    render() {
        const {
            props: { username, community, post, role },
            state: {
                PostFullReplyEditor,
                PostFullEditEditor,
                formId,
                showReply,
                showEdit,
            },
            onShowReply,
            onShowEdit,
            onDeletePost,
        } = this;
        const post_content = this.props.cont.get(this.props.post);
        if (!post_content) return null;
        const p = extractContent(immutableAccessor, post_content);
        const content = post_content.toJS();
        const { author, permlink, parent_author, parent_permlink } = content;
        const jsonMetadata = this.state.showReply ? null : p.json_metadata;

        let link = `/@${content.author}/${content.permlink}`;
        if (content.category) link = `/${content.category}${link}`;

        const { category, title, body } = content;
        if (process.env.BROWSER && title)
            document.title = title + ' — ' + APP_NAME;

        let content_body = content.body;
        const url = `/${category}/@${author}/${permlink}`;
        const bDMCAStop = DMCAList.includes(url);
        const bIllegalContentUser = userIllegalContent.includes(content.author);
        if (bDMCAStop) {
            content_body = tt(
                'postfull_jsx.this_post_is_not_available_due_to_a_copyright_claim'
            );
        }
        // detect illegal users
        if (bIllegalContentUser) {
            content_body = 'Not available for legal reasons.';
        }

        // TODO: get global loading state
        //loading = !bIllegalContentUser && !bDMCAStop && partial data loaded;
        const bShowLoading = false;

        // hide images if user is on blacklist
        const hideImages = ImageUserBlockList.includes(content.author);

        const replyParams = {
            author,
            permlink,
            parent_author,
            parent_permlink,
            category,
            title,
            body,
        };

        this.share_params = {
            link,
            url: 'https://' + APP_DOMAIN + link,
            rawtitle: title,
            title: title + ' — ' + APP_NAME,
            desc: p.desc,
        };

        const share_menu = [
            {
                link: '#',
                onClick: this.fbShare,
                value: 'Facebook',
                title: tt('postfull_jsx.share_on_facebook'),
                icon: 'facebook',
            },
            {
                link: '#',
                onClick: this.twitterShare,
                value: 'Twitter',
                title: tt('postfull_jsx.share_on_twitter'),
                icon: 'twitter',
            },
            {
                link: '#',
                onClick: this.redditShare,
                value: 'Reddit',
                title: tt('postfull_jsx.share_on_reddit'),
                icon: 'reddit',
            },
            {
                link: '#',
                onClick: this.linkedInShare,
                value: 'LinkedIn',
                title: tt('postfull_jsx.share_on_linkedin'),
                icon: 'linkedin',
            },
        ];

        const Editor = this.state.showReply
            ? PostFullReplyEditor
            : PostFullEditEditor;
        let renderedEditor = null;
        if (showReply || showEdit) {
            renderedEditor = (
                <div key="editor">
                    <Editor
                        {...replyParams}
                        type={this.state.showReply ? 'submit_comment' : 'edit'}
                        successCallback={() => {
                            this.setState({
                                showReply: false,
                                showEdit: false,
                            });
                            saveOnShow(formId, null);
                        }}
                        onCancel={() => {
                            this.setState({
                                showReply: false,
                                showEdit: false,
                            });
                            saveOnShow(formId, null);
                        }}
                        jsonMetadata={jsonMetadata}
                    />
                </div>
            );
        }
        const pending_payout = parsePayoutAmount(content.pending_payout_value);
        const total_payout = parsePayoutAmount(content.total_payout_value);
        const high_quality_post = pending_payout + total_payout > 10.0;
        const full_power = post_content.get('percent_steem_dollars') === 0;

        let post_header = (
            <h1 className="entry-title">
                {content.title}
                {full_power && (
                    <span title={tt('g.powered_up_100')}>
                        <Icon name="steempower" />
                    </span>
                )}
            </h1>
        );
        if (content.depth > 0) {
            const parent_link = `/${content.category}/@${
                content.parent_author
            }/${content.parent_permlink}`;
            let direct_parent_link;
            if (content.depth > 1) {
                direct_parent_link = (
                    <li>
                        <Link to={parent_link}>
                            {tt('postfull_jsx.view_the_direct_parent')}
                        </Link>
                    </li>
                );
            }
            post_header = (
                <div className="callout">
                    <h3 className="entry-title">
                        {tt('g.re')}: {content.root_title}
                    </h3>
                    <h5>
                        {tt(
                            'postfull_jsx.you_are_viewing_a_single_comments_thread_from'
                        )}:
                    </h5>
                    <p>{content.root_title}</p>
                    <ul>
                        <li>
                            <Link
                                to={`${content.category}/@${content.author}/${
                                    content.permlink
                                }`}
                            >
                                {tt('postfull_jsx.view_the_full_context')}
                            </Link>
                        </li>
                        {direct_parent_link}
                    </ul>
                </div>
            );
        }

        const isPaidout =
            post_content.get('cashout_time') === '1969-12-31T23:59:59'; // TODO: audit after HF19. #1259
        const showReblog = !isPaidout;
        const showPromote =
            false && username && !isPaidout && post_content.get('depth') == 0;

        const showPinToggle = CommunityAuthorization.CanPinPosts(
            username,
            role
        );
        const { isPinned } = this.state;

        const showMuteToggle = CommunityAuthorization.CanMutePosts(
            username,
            role
        );
        const { isMuted } = this.state;

        const showReplyOption =
            username !== undefined && post_content.get('depth') < 255;
        const showEditOption = username === author;
        const showDeleteOption =
            username === author && allowDelete(post_content) && !isPaidout;

        const isPreViewCount =
            Date.parse(post_content.get('created')) < 1480723200000; // check if post was created before view-count tracking began (2016-12-03)
        let contentBody;

        if (bShowLoading) {
            contentBody = <LoadingIndicator type="circle-strong" />;
        } else {
            contentBody = (
                <MarkdownViewer
                    formId={formId + '-viewer'}
                    text={content_body}
                    jsonMetadata={jsonMetadata}
                    large
                    highQualityPost={high_quality_post}
                    noImage={content.stats.gray}
                    hideImages={hideImages}
                />
            );
        }

        return (
            <article
                className="PostFull hentry"
                itemScope
                itemType="http://schema.org/Blog"
            >
                {showEdit ? (
                    renderedEditor
                ) : (
                    <span>
                        <div className="PostFull__header">
                            {post_header}
                            <TimeAuthorCategoryLarge
                                content={content}
                                authorRep={content.author_reputation}
                            />
                        </div>
                        <div className="PostFull__body entry-content">
                            {contentBody}
                        </div>
                    </span>
                )}

                {showPromote && (
                    <button
                        className="Promote__button float-right button hollow tiny"
                        onClick={this.showPromotePost}
                    >
                        {tt('g.promote')}
                    </button>
                )}
                <TagList post={content} horizontal />
                <div className="PostFull__footer row">
                    <div className="columns medium-12 large-5">
                        <TimeAuthorCategory
                            content={content}
                            authorRep={content.author_reputation}
                        />
                    </div>
                    <div className="columns medium-12 large-2 ">
                        <Voting post={post} />
                    </div>
                    <div className="RightShare__Menu small-11 medium-12 large-5 columns">
                        {showReblog && (
                            <Reblog author={author} permlink={permlink} />
                        )}
                        <span className="PostFull__reply">
                            {showReplyOption && (
                                <a onClick={onShowReply}>{tt('g.reply')}</a>
                            )}{' '}
                            {showPinToggle &&
                                isPinned && (
                                    <a
                                        onClick={() =>
                                            this.onTogglePin(isPinned)
                                        }
                                    >
                                        {tt('g.unpin')}
                                    </a>
                                )}{' '}
                            {showPinToggle &&
                                !isPinned && (
                                    <a
                                        onClick={() =>
                                            this.onTogglePin(isPinned)
                                        }
                                    >
                                        {tt('g.pin')}
                                    </a>
                                )}{' '}
                            {showMuteToggle && (
                                <MuteButtonContainer
                                    community={community}
                                    isMuted={isMuted}
                                    permlink={permlink}
                                />
                            )}{' '}
                            {showEditOption &&
                                !showEdit && (
                                    <a onClick={onShowEdit}>{tt('g.edit')}</a>
                                )}{' '}
                            {showDeleteOption &&
                                !showReply && (
                                    <a onClick={onDeletePost}>
                                        {tt('g.delete')}
                                    </a>
                                )}
                        </span>
                        <span className="PostFull__responses">
                            <Link
                                to={link}
                                title={tt('g.responses', {
                                    count: content.children,
                                })}
                            >
                                <Icon
                                    name="chatboxes"
                                    className="space-right"
                                />
                                {content.children}
                            </Link>
                        </span>
                        <span className="PostFull__views">
                            <PageViewsCounter
                                hidden={false}
                                sinceDate={isPreViewCount ? 'Dec 2016' : null}
                            />
                        </span>
                        <ShareMenu menu={share_menu} />
                        <button
                            className="explore-post"
                            title={tt('g.share_this_post')}
                            onClick={this.showExplorePost}
                        >
                            <Icon name="link" className="chain-right" />
                        </button>
                    </div>
                </div>
                <div className="row">
                    <div className="column large-8 medium-10 small-12">
                        {showReply && renderedEditor}
                    </div>
                </div>
            </article>
        );
    }
}

export default connect(
    (state, ownProps) => {
        const post = ownProps.cont.get(ownProps.post);
        const community = post.get('category');
        return {
            ...ownProps,
            community,
            username: state.user.getIn(['current', 'username']),
            role: state.global.getIn(
                ['community', community, 'context', 'role'],
                'guest'
            ),
        };
    },
    dispatch => ({
        dispatchSubmit: data => {
            dispatch(userActions.usernamePasswordLogin({ ...data }));
        },
        clearError: () => {
            dispatch(userActions.loginError({ error: null }));
        },
        unlock: () => {
            dispatch(userActions.showLogin());
        },
        deletePost: (author, permlink) => {
            dispatch(
                transactionActions.broadcastOperation({
                    type: 'delete_comment',
                    operation: { author, permlink },
                    confirm: tt('g.are_you_sure'),
                })
            );
        },
        showPromotePost: (author, permlink) => {
            dispatch(
                globalActions.showDialog({
                    name: 'promotePost',
                    params: { author, permlink },
                })
            );
        },
        showExplorePost: (permlink, title) => {
            dispatch(
                globalActions.showDialog({
                    name: 'explorePost',
                    params: { permlink, title },
                })
            );
        },
        togglePinnedPost: (
            pinPost,
            community,
            account,
            permlink,
            successCallback,
            errorCallback
        ) => {
            let action = 'unpinPost';
            if (pinPost) action = 'pinPost';

            const payload = [
                action,
                {
                    community,
                    account,
                    permlink,
                },
            ];

            return dispatch(
                transactionActions.broadcastOperation({
                    type: 'custom_json',
                    operation: {
                        id: 'community',
                        required_posting_auths: [account],
                        json: JSON.stringify(payload),
                    },
                    successCallback,
                    errorCallback,
                })
            );
        },
    })
)(PostFull);

const saveOnShow = (formId, type) => {
    if (process.env.BROWSER) {
        if (type)
            localStorage.setItem(
                'showEditor-' + formId,
                JSON.stringify({ type }, null, 0)
            );
        else {
            localStorage.removeItem('showEditor-' + formId);
            localStorage.removeItem('replyEditorData-' + formId + '-reply');
            localStorage.removeItem('replyEditorData-' + formId + '-edit');
        }
    }
};

class CommunityAuthorization {
    static CanPinPosts = (username, role) => {
        const allowableRoles = ['owner', 'admin', 'mod'];
        return allowableRoles.includes(role);
    };

    static CanMutePosts = (username, role) => {
        const allowableRoles = ['owner', 'admin', 'mod'];
        return allowableRoles.includes(role);
    };
}

import constants from 'app/redux/constants';
import { parsePayoutAmount, repLog10 } from 'app/utils/ParsersAndFormatters';
import { Long } from 'bytebuffer';
import { fromJS } from 'immutable';
import { formatter } from '@hiveio/hive-js';

export function numberWithCommas(x) {
    const parts = String(x).split('.');
    return (
        parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') +
        (parts[1] ? '.' + parts[1] : '')
    );
}

export function vestingSteem(account, gprops) {
    if (!account.vesting_shares || !gprops.total_vesting_shares) {
        return 0;
    }
    const vests = parseFloat(account.vesting_shares.split(' ')[0]);
    const total_vests = parseFloat(gprops.total_vesting_shares.split(' ')[0]);
    const total_vest_liquid = parseFloat(
        (gprops.total_vesting_fund_hive
            ? gprops.total_vesting_fund_hive
            : gprops.total_vesting_fund_steem
        ).split(' ')[0]
    );
    return total_vest_liquid * (vests / total_vests);
}

// How much STEEM this account has delegated out (minus received).
export function delegatedSteem(account, gprops) {
    if (
        !account.delegated_vesting_shares ||
        !account.received_vesting_shares ||
        !gprops.total_vesting_shares
    ) {
        return 0;
    }
    const delegated_vests = parseFloat(
        account.delegated_vesting_shares.split(' ')[0]
    );
    const received_vests = parseFloat(
        account.received_vesting_shares.split(' ')[0]
    );
    const vests = delegated_vests - received_vests;
    const total_vests = parseFloat(gprops.total_vesting_shares.split(' ')[0]);
    const total_vest_liquid = parseFloat(
        (gprops.total_vesting_fund_hive
            ? gprops.total_vesting_fund_hive
            : gprops.total_vesting_fund_steem
        ).split(' ')[0]
    );
    return total_vest_liquid * (vests / total_vests);
}

export function assetFloat(str, asset) {
    try {
        assert.equal(typeof str, 'string');
        assert.equal(typeof asset, 'string');
        assert(
            new RegExp(`^\\d+(\\.\\d+)? ${asset}$`).test(str),
            'Asset should be formatted like 99.99 ' + asset + ': ' + str
        );
        return parseFloat(str.split(' ')[0]);
    } catch (e) {
        console.log(e);
        return undefined;
    }
}

export function isFetchingOrRecentlyUpdated(global_status, order, category) {
    const status = global_status
        ? global_status.getIn([category || '', order])
        : null;
    if (!status) return false;
    if (status.fetching) return true;
    if (status.last_fetch) {
        const res =
            new Date() - status.last_fetch <
            constants.FETCH_DATA_EXPIRE_SEC * 1000;
        return res;
    }
    return false;
}

export function allowDelete(comment) {
    const rshares = String(comment.get('net_rshares'));
    const hasPayout = !(rshares[0] == '0' || rshares[0] == '-');
    const hasChildren = comment.get('children') !== 0;
    const archived = comment.get('is_paidout');
    return !(hasPayout || hasChildren) && !archived;
}

export function normalizeTags(metadata, category) {
    let tags = [];

    try {
        tags = (metadata && metadata.toJS().tags) || [];
        //if (typeof tags == 'string') tags = [tags];
        if (!Array.isArray(tags)) tags = [];
    } catch (e) {
        tags = [];
    }

    tags.unshift(category);

    return filterTags(tags);
}

export function parseJsonTags(post) {
    return normalizeTags(post.get('json_metadata'), post.get('category'));
}

export function hasNsfwTag(content) {
    return parseJsonTags(content).filter(t => t.match(/^nsfw$/i)).length > 0;
}

export function filterTags(tags) {
    return tags
        .filter(tag => typeof tag === 'string')
        .filter((value, index, self) => value && self.indexOf(value) === index);
}

export function pricePerSteem(state) {
    const feed_price = state.global.get('feed_price');
    if (feed_price && feed_price.has('base') && feed_price.has('quote')) {
        return formatter.pricePerSteem(feed_price.toJS());
    }
    return undefined;
}

export function settlePromises(arr) {
    return Promise.all(
        arr.map(promise => {
            return promise.then(
                value => ({ state: 'resolved', value }),
                value => ({ state: 'rejected', value })
            );
        })
    );
}

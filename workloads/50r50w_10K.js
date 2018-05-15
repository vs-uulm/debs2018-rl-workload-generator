// Workload with ~50% reads, ~50% writes, ~100,000 requests

const WORKLOAD_SEED = 12345;

const USER = {
    // number of unique users
    COUNT: 1000
};

const PRODUCT = {
    // number of unique products
    COUNT: 200,
    // number of initial stock amount per products
    INITIAL_STOCK: 100,
    // number of products per refill
    REFILL_AMOUNT: 2000
};

const SESSION = {
    // total number of shopping sessions
    COUNT: 300
};

const ADD_ACTIONS_PER_SESSIONS = {
    // average add/increase item OPs per session
    AVERAGE: 11,
    // standard deviation
    SD: 2,
    // if true, users views product first before adding to cart
    VIEW_BEFORE: false
};

const REMOVE_ACTIONS_PER_SESSIONS = {
    // average remove item OPs per session
    AVERAGE: 3,
    // standard deviation
    SD: 1,
    // if true, users views product in chart before removing
    VIEW_BEFORE: false,
    // probability of a user aborting instead of checking out cart at the end
    ABORT_PROBABILITY: 0.05
};

const READ_ACTIONS_PER_SESSIONS = {
    // average number of additional product view OPs per session
    AVERAGE: 12,
    // standard deviation
    SD: 5
};

module.exports = { WORKLOAD_SEED, USER, PRODUCT, SESSION, ADD_ACTIONS_PER_SESSIONS, REMOVE_ACTIONS_PER_SESSIONS, READ_ACTIONS_PER_SESSIONS };

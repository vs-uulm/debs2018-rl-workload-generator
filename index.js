const shellescape = require('shell-escape');
const Random = require('random-js');
const faker = require('faker');
const Prob = require('prob.js');

const args = process.argv.slice(2);

// filename of workload in ./workloads/
const workload = args[0];

// number of shards (>= 1)
const SHARD_COUNT = parseInt(args[2]) || 1;

// number of current shard(0... (SHARD_COUNT-1))
const SHARD_OFFSET = parseInt(args[1]) || 0;

const {
    WORKLOAD_SEED,
    USER,
    PRODUCT,
    SESSION,
    ADD_ACTIONS_PER_SESSIONS,
    REMOVE_ACTIONS_PER_SESSIONS,
    READ_ACTIONS_PER_SESSIONS
}  = require(`./workloads/${workload}`);

const SEED = WORKLOAD_SEED + SHARD_OFFSET;
const randomEngine = Random.engines.mt19937().seed(SEED);
const random = new Random(randomEngine);
faker.seed(SEED);

// base path of web application (can be set at runtime as an env variable)
const BASE_PATH = "${API_ENDPOINT}/";

// distribution-based random functions
const removeActionR = Prob.normal(REMOVE_ACTIONS_PER_SESSIONS.AVERAGE, REMOVE_ACTIONS_PER_SESSIONS.SD);
const readActionR = Prob.normal(READ_ACTIONS_PER_SESSIONS.AVERAGE, READ_ACTIONS_PER_SESSIONS.SD);
const addActionR = Prob.normal(ADD_ACTIONS_PER_SESSIONS.AVERAGE, ADD_ACTIONS_PER_SESSIONS.SD);

const productR = Prob.zipf(1, PRODUCT.COUNT)

// maps regular ID to sharded ID
function toShard(id){
    return (id*SHARD_COUNT)+SHARD_OFFSET;
}

// enum-like list of actions
const actions = {
    CREATE_USER : {
        url: (user) => [
            'CREATE_USER',
            { user: user },
            'PUT',
            `${BASE_PATH}user/${toShard(user.id)}`,
            JSON.stringify({
                name : user['name'], 
                email : user.email
            }),
            'W'
        ]
    },

    SHOW_CART: {
        url: (user) => [
            'SHOW_CART',
            { user: user },
            'GET',
            `${BASE_PATH}user/${toShard(user.id)}/cart`,
            null,
            'R'
        ]
    },

    CHECKOUT_CART: {
        url: (user) => [
            'CHECKOUT_CART',
            { user: user },
            'POST',
            `${BASE_PATH}user/${toShard(user.id)}/cart/checkout`,
            null,
            'W'
        ]
    },	

    SHOW_PRODUCT: {
        url: (product) => [
            'SHOW_PRODUCT',
            { product: product },
            'GET',
            `${BASE_PATH}product/${toShard(product.id)}`,
            null,
            'R'
        ]
    },

    REFILL_PRODUCT: {
        url: (product, amount) => [
            'REFILL_PRODUCT',
            { product: product, amount: amount },
            'POST',
            `${BASE_PATH}product/${toShard(product.id)}`,
            JSON.stringify({amount: amount}),
            'W'
        ]
    },

    CREATE_PRODUCT: {
        url: (product, amount) => [
            'CREATE_PRODUCT',
            { product: product, amount: amount },
            'PUT',
            `${BASE_PATH}product/${toShard(product.id)}`,
            JSON.stringify({
                name: product['name'], 
                amount: amount,
                price: product.price
            }),
            'W'
        ]
    },

    GET_PRODUCT_IN_CART: {
        url: (user, product) => [
            'GET_PRODUCT_IN_CART',
            { user: user, product: product },
            'GET',
            `${BASE_PATH}user/${toShard(user.id)}/cart/product/${toShard(product['id'])}`,
            null,
            'R'
        ]
    },

    ADD_PRODUCT_TO_CART: {
        url: (user, product) => [
            'ADD_PRODUCT_TO_CART',
            { user: user, product: product },
            'PUT',
            `${BASE_PATH}user/${toShard(user.id)}/cart/product/${toShard(product['id'])}`,
            JSON.stringify({ amount: 1 }),
            'W'
        ]
    },

    CHANGE_PRODUCT_IN_CART: {
        url: (user, product, amount) => [
            'CHANGE_PRODUCT_IN_CART',
            { user: user, product: product, amount: amount },
            'POST',
            `${BASE_PATH}user/${toShard(user.id)}/cart/product/${toShard(product['id'])}`,
            JSON.stringify({ amount : amount }),
            'W'
        ]
    },

    REMOVE_PRODUCT_FROM_CART: {
        url: (user, product, amount) => [
            'REMOVE_PRODUCT_FROM_CART',
            { user: user, product:product, amount: amount },
            'DELETE',
            `${BASE_PATH}user/${toShard(user.id)}/cart/product/${toShard(product['id'])}`,
            null,
            'W'
        ]
    }
};


// Helpers...
const getRandomInt = (min, max) => random.integer(min,max);
const pickRandomKey = (obj) => Object.keys(obj)[random.integer(0, Object.keys(obj).length - 1)];
//-------------------------

// global index of users
const users =  {};

// global index of products
const products = {};

// creates a random product with given ID
function createProduct(id) {
    const product = {
        id: id,
        name: faker.commerce.productName(),
        price: parseFloat(faker.commerce.price())
    };

    products[id] = product;
    return product;
};

// creates a random user with given ID
function createUser(id) {
    const user = {
        id: id,
        name: faker.name.findName(),
        email: faker.internet.email()
    };

    users[id] = user;	
    return user;
};

// creates and returns a random session for the given user
function createUserSession(id) {
    const userLog = [];

    const user = users[id];

    // temp cart for internal tracking
    const cart = {};

    // Add operations
    const addActionCount = Math.max(0, addActionR(randomEngine));
    for (let i = 0; i < addActionCount; i++) {
        const productId = productR(randomEngine) - 1;

        // if true, view product first
        if (ADD_ACTIONS_PER_SESSIONS.VIEW_BEFORE) {
            userLog.push(actions.SHOW_PRODUCT.url(products[productId]));
        }

        // product not yet in cart 
        if (!(productId in cart)) {
            userLog.push(actions.ADD_PRODUCT_TO_CART.url(user, products[productId]));
            cart[productId] = 1;
        } else {
            const amount = 1;
            userLog.push(actions.CHANGE_PRODUCT_IN_CART.url(user, products[productId], amount));
            cart[productId] = cart[productId] + amount;
        }
    }

    // Remove operations
    const removeActionCount = Math.max(0, removeActionR(randomEngine));
    for (let i = 0; i < removeActionCount; i++) {
        if (Object.keys(cart).length === 0) {
            break;
        }

        const productId = pickRandomKey(cart);

        userLog.push(actions.GET_PRODUCT_IN_CART.url(user, products[productId]));

        if (cart[productId] > 1) {
            const amount = -1;
            userLog.push(actions.CHANGE_PRODUCT_IN_CART.url(user, products[productId], amount));
            cart[productId] = cart[productId] + amount;
        } else {
            userLog.push(actions.REMOVE_PRODUCT_FROM_CART.url(user, products[productId], -1));
            cart[productId] = undefined;
            delete cart[productId];
        }
    }

    // View operations
    const readActionCount = Math.max(0,readActionR(randomEngine));

    for (let i = 0; i < readActionCount; i++) {
        const productId = productR(randomEngine) - 1;
        const idx = getRandomInt(0, userLog.length-1);

        userLog.splice(idx, 0, actions.SHOW_PRODUCT.url(products[productId]));
    }

    // create account at the beginning
    userLog.unshift(actions.CREATE_USER.url(user));

    // finally, look at cart
    userLog.push(actions.SHOW_CART.url(user));

    // either buy or abort
    if (random.real(0, 1, true) > REMOVE_ACTIONS_PER_SESSIONS.ABORT_PROBABILITY && Object.keys(cart).length > 0) {
        // do a checkout
        userLog.push(actions.CHECKOUT_CART.url(user));
    } else {
        // abort and remove everything from 
        for (const productId of Object.keys(cart)) {
            userLog.push(actions.REMOVE_PRODUCT_FROM_CART.url(user, products[productId], cart[productId]*(-1)));
        }
    }

    return userLog;
}

// final log of all requests
const requestLog = [];

// internal stock for refill tracking
const stock = {};

// create all users
for (let userId = 0; userId < USER.COUNT; userId++) {
    createUser(userId);
} 

// create empty session arrays foreach user
const userSessions = Array(USER.COUNT).fill([]);

// create all products
for (let productId = 0; productId < PRODUCT.COUNT; productId++) {
    createProduct(productId);
    requestLog.push(actions.CREATE_PRODUCT.url(products[productId], PRODUCT.INITIAL_STOCK));
    stock[productId] = PRODUCT.INITIAL_STOCK;
}

// create all user sessions
for (let session = 0; session < SESSION.COUNT; session++) {
    const userId = getRandomInt(0, USER.COUNT-1);
    const newSession = createUserSession(userId);

    // check if account exists, if so, remove first action (create account)
    if (userSessions[userId].length > 0) {
        newSession.shift();
    }

    userSessions[userId].push(...newSession);
}

// randomly pick from all user sessions and merge
while (userSessions.length > 0) {
    // zipf-based random selection: increase probability of finishing open sessions
    const pickR = Prob.zipf(1, userSessions.length);
    const session = pickR(randomEngine) - 1;

    // move action to global request log
    if (userSessions[session].length !== 0) {
        const action = userSessions[session].shift();
        requestLog.push(action);

        const [actionType, params] = action;

        // house-keeping of stock
        switch (actionType) {
            case 'ADD_PRODUCT_TO_CART':
                stock[params.product.id] = stock[params.product.id] - 1;
                break;

            case 'CHANGE_PRODUCT_IN_CART':
                stock[params.product.id] = stock[params.product.id] - params.amount;
                break;

            case 'REMOVE_PRODUCT_FROM_CART':
                stock[params.product.id] = stock[params.product.id] - params.amount;
                break;
        }
    }

    // remove users without pending actions
    if (userSessions[session].length === 0) {
        userSessions.splice(session, 1);
    }

    // refill empty products stocks
    Object.keys(stock).forEach((productId) => {
        if (stock[productId] < 1) {
            const refill = PRODUCT.REFILL_AMOUNT;
            requestLog.push(actions.REFILL_PRODUCT.url(products[productId], refill));
            stock[productId] = stock[productId] + refill;
        }
    });
}

const actionStats = {};
let reads = 0;
let writes = 0;

Object.keys(actions).forEach((actionName) => actionStats[actionName] = 0);

// write to STDOUT as curl command
requestLog.forEach((entry) => {
    const [action, params, method, url, body, type] = entry;

    const args = [
        'curl',
        '--silent',
        '--output',
        '/dev/null',
        '-H',
        'cache-control: no-cache',
        '-H',
        'content-type: application/json',
        '-X',
        method,
        '-d',
        body || '{}'
    ];

    console.log(`${shellescape(args)} "${url}"`);

    actionStats[action] += 1;
    if (type === 'R') {
        reads += 1;
    } else {
        writes += 1;
    }
});

console.error('Workload');
console.error('===========================================');
console.error(`Workload:\t${workload}`);
console.error(`Seed:\t${SEED}`);
console.error(`Shard:\t${SHARD_OFFSET} / ${SHARD_COUNT}`);
console.error('===========================================');
console.error('Action Stats');
console.error('===========================================');
Object.keys(actions).forEach((actionName) => {
    console.error(`${actionName}\t${actionStats[actionName]}`);
});
console.error('===========================================');
console.error(`READs:\t${reads} (${Number(reads / (0 + writes + reads) * 100).toFixed(3)})%`);
console.error(`WRITEs:\t${writes} (${Number(writes / (0 + writes + reads) * 100).toFixed(3)})%`);
console.error('===========================================');
console.error(`TOTAL:\t${(writes + reads)}`);
console.error('===========================================');

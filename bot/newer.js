let io = require('socket.io-client');

let socket = io('http://192.168.5.131:23333');

function Queue() {
    let items = [];
    this.push = function (element) {
        items.push(element);
    }
    this.pop = function () {
        return items.shift();
    }
    this.front = function () {
        return items[0];
    }
    this.empty = function () {
        return items.length == 0;
    }
    this.size = function () {
        return items.length;
    }
    this.print = function () {
        return items.toString();
    }
}

function genName() {
    let Ch1 = ["殇", "伤", "裳", "霓", "离", "璃", "婉", "晚", "绾", "挽", "辞", "歌", "泪", "霜", "柒", "流", "乡", "梦", "忆", "衣", "依", "意", "亦", "艺", "伊", "曦", "溪", "兮", "惜", "浅", "芊", "苏", "落", "洛", "执", "樱", "雪", "音", "若", "蝶", "星", "月", "光", "诗", "思", "卿", "君"]
    let Ch2 = ["ヘ", "ン", "ヮ", "ャ", "マ", "ァ", "キ", "の"]
    let p = 2
    let Name = ""
    p += Math.floor(Math.random() * 3)
    for (let i = 0; i < p; ++i)
        Name += Ch1[Math.floor(Math.random() * Ch1.length)]
    Name += Ch2[Math.floor(Math.random() * Ch2.length)]
    for (let i = 0; i < 2; ++i)
        Name += Ch1[Math.floor(Math.random() * Ch1.length)]
    return Name
}

socket.on('disconnect', function () {
    console.error('Disconnected from server.');
    process.exit(1);
});

socket.on('connect', function () {
    console.log('Connected to server.');
    console.log("2333")
    socket.emit('join_game_room', {
        'room': 'orzlh',
        'nickname': '[bot]' + genName()
    })
    socket.emit('send_message', { text: '我来了', team: 0 })
    socket.emit('change_ready', { ready: 1 })
    socket.emit('send_message', { text: '开始吧', team: 0 })
    socket.emit('change_game_conf', {
        height_ratio: "1",
        width_ratio: "1",
        city_ratio: "0.5",
        mountain_ratio: "0.5",
        swamp_ratio: "0.2",
        speed: 3,
        custom_map: ""
    })
});

socket.on('starting', function (data) {
    // Get ready to start playing the game.
    console.log('Start');
    socket.emit('send_message', { text: '总算开始了，我等的花儿都谢了', team: 0 })
});

let grid_type, army_cnt
let n, m;
let generalXY
let client_id
let player

socket.on('set_id', function (data) {
    client_id = data;
})

socket.on('init_map', function (data) {
    n = data.n
    m = data.m
    grid_type = Array(n)
    for (let i = 0; i < n; ++i)
        grid_type[i] = Array(m)
    army_cnt = Array(n)
    for (let i = 0; i < n; ++i)
        army_cnt[i] = Array(m)
    generalXY = data.general
    for (let i = 0; i < data.player_ids.length; ++i) {
        if (data.player_ids[i] == client_id) {
            player = i + 1
            break
        }
    }
    console.log(player)
})

function Total() {
    let cnt = 0, landCnt = 0
    for (let i = 0; i < n; ++i) {
        for (let j = 0; j < m; ++j) {
            if (grid_type[i][j] < 200 && grid_type[i][j] % 50 == player) {
                cnt += army_cnt[i][j];
                ++landCnt
            }
        }
    }
    return { Army: cnt, Land: landCnt };
}

function showMap(data) {
    console.clear();
    console.log("Turn " + Math.floor(data.turn / 2) + (data.turn % 2 == 1 ? '.' : ''))
    for (let i = 0; i < n; ++i) {
        for (let j = 0; j < m; ++j) {
            if (grid_type[i][j] < 200 && grid_type[i][j] % 50 == player) {
                if (grid_type[i][j] >= 100 && grid_type[i][j] < 150)
                    process.stdout.write(" K")
                else
                    process.stdout.write(" A")
            }
            else if (grid_type[i][j] == 50)
                process.stdout.write(" C")
            else if (grid_type[i][j] >= 0 && grid_type[i][j] < 100)
                process.stdout.write(" E")
            else if (grid_type[i][j] >= 100 && grid_type[i][j] < 150)
                process.stdout.write(" k")
            else if (grid_type[i][j] == 200)
                process.stdout.write(" #")
            else if (grid_type[i][j] == 201)
                process.stdout.write(" X")
            else if (grid_type[i][j] == 202)
                process.stdout.write(" ?")
            else if (grid_type[i][j] >= 204)
                process.stdout.write(" S")
        }
        process.stdout.write("\n")
    }
}

function doMove(orders) {
    for (let i = orders.length - 1; i >= 0; --i)
        socket.emit('attack', orders[i])
}

function FindNearestEnemy() {
    let mxdistance = -1;
    for (let i = 0; i < n; ++i) {
        for (let j = 0; j < m; ++j) {
            if (grid_type[i][j] < 100 && grid_type[i][j] % 50 != player && grid_type[i][j] != 50) {
                let dis = Math.abs(i - generalXY[0]) + Math.abs(j - generalXY[1])
                if (dis > mxdistance)
                    mxdistance = dis
            }
        }
    }
    return mxdistance
}

function ArmiesAround() {
    let startX = generalXY[0] - 3
    let startY = generalXY[1] - 3
    if (startX < 0)
        startX = 0
    if (startY < 0)
        startY = 0
    let Count = 0
    for (let i = startX; (i < n) && (i <= generalXY[0] + 3); ++i) {
        for (let j = startY; (j < m) && (j <= generalXY[1] + 3); ++j)
            if (grid_type[i][j] < 100 && grid_type[i][j] % 50 != player && grid_type[i][j] != 50) {
                Count += army_cnt[i][j]
            }
    }
    return Count
}

function gatherArmyToMy(x, y, need) {
    let move_order = []
    let Army_cnt = 0
    let vis = new Array(n * m)
    for (let i = 0; i < n * m; ++i)
        vis[i] = false
    vis[x * m + y] = true
    let q = new Queue()
    q.push({ x: x, y: y })
    while (!q.empty()) {
        let cur = q.pop()
        if (Army_cnt >= need)
            break
        if (cur.x > 0 && (!vis[(cur.x - 1) * m + cur.y]) && army_cnt[cur.x - 1][cur.y] > 0 && grid_type[cur.x - 1][cur.y] % 50 == player) {
            vis[(cur.x - 1) * m + cur.y] = true
            q.push({ x: cur.x - 1, y: cur.y })
            Army_cnt += army_cnt[cur.x - 1][cur.y] - 1
            move_order.push({ x: cur.x - 1, y: cur.y, dx: cur.x, dy: cur.y, half: false })
        }
        if (cur.y > 0 && (!vis[cur.x * m + cur.y - 1]) && army_cnt[cur.x][cur.y - 1] > 0 && grid_type[cur.x][cur.y - 1] % 50 == player) {
            vis[cur.x * m + cur.y - 1] = true
            q.push({ x: cur.x, y: cur.y - 1 })
            Army_cnt += army_cnt[cur.x][cur.y - 1] - 1
            move_order.push({ x: cur.x, y: cur.y - 1, dx: cur.x, dy: cur.y, half: false })
        }
        if (cur.x + 1 < n && (!vis[(cur.x + 1) * m + cur.y]) && army_cnt[cur.x + 1][cur.y] > 0 && grid_type[cur.x + 1][cur.y] % 50 == player) {
            vis[(cur.x + 1) * m + cur.y] = true
            q.push({ x: cur.x + 1, y: cur.y })
            Army_cnt += army_cnt[cur.x + 1][cur.y] - 1
            move_order.push({ x: cur.x + 1, y: cur.y, dx: cur.x, dy: cur.y, half: false })
        }
        if (cur.y + 1 < m && (!vis[cur.x * m + cur.y + 1]) && army_cnt[cur.x][cur.y + 1] > 0 && grid_type[cur.x][cur.y + 1] % 50 == player) {
            vis[cur.x * m + cur.y + 1] = true
            q.push({ x: cur.x, y: cur.y + 1 })
            Army_cnt += army_cnt[cur.x][cur.y + 1] - 1
            move_order.push({ x: cur.x, y: cur.y + 1, dx: cur.x, dy: cur.y, half: false })
        }
    }
    doMove(move_order)
}

let moveOrders = []

function goFuck(x, y, need, i) {
    isDB = true
    if (army_cnt[x][y] == 1)
        return
    Vis[x * m + y] = true
    let dx = [-1, 0, 1, 0]
    let dy = [0, -1, 0, 1]
    let hlf = false
    if (Math.random() < 0.1)
        i = Math.floor(Math.random() * 4)
    let gox = x + dx[i]
    let goy = y + dy[i]
    if (gox >= n)
        return
    if (goy >= m)
        return
    if (gox < 0)
        return
    if (goy < 0)
        return
    if (Vis[gox * m + goy] == true)
        return
    if (grid_type[gox][goy] == 201) {
        i = Math.floor(Math.random() * 4)
        goFuck(x, y, need, i)
        return
    }
    Vis2 = Array(n * m)
    if (grid_type[gox][goy] != 201) {
        socket.emit('attack', { x: x, y: y, dx: gox, dy: goy, half: hlf })
        moveOrders.push({ x: x, y: y, dx: gox, dy: goy, half: hlf })
        explore(gox, goy, i)
    }
}

function Conquer(x, y, need) {
    let move_order = []
    let Army_cnt = 0
    let vis = new Array(n * m)
    for (let i = 0; i < n * m; ++i)
        vis[i] = false
    vis[x * m + y] = true
    let q = new Queue()
    q.push({ x: x, y: y })
    while (!q.empty()) {
        let cur = q.pop()
        if (Army_cnt >= need)
            break
        if (cur.x > 0 && (!vis[(cur.x - 1) * m + cur.y]) && army_cnt[cur.x - 1][cur.y] > 0 && (grid_type[cur.x - 1][cur.y] < 150 || grid_type[cur.x - 1][cur.y] == 200 || grid_type[cur.x - 1][cur.y] == 202)) {
            vis[(cur.x - 1) * m + cur.y] = true
            q.push({ x: cur.x - 1, y: cur.y })
            if (grid_type[cur.x - 1][cur.y] % 50 == player && grid_type[cur.x - 1][cur.y] < 150)
                Army_cnt += army_cnt[cur.x - 1][cur.y] - 1
            move_order.push({ x: cur.x - 1, y: cur.y, dx: cur.x, dy: cur.y, half: false })
        }
        if (cur.y > 0 && (!vis[cur.x * m + cur.y - 1]) && army_cnt[cur.x][cur.y - 1] > 0 && (grid_type[cur.x][cur.y - 1] < 150 || grid_type[cur.x][cur.y - 1] == 200 || grid_type[cur.x][cur.y - 1] == 202)) {
            vis[cur.x * m + cur.y - 1] = true
            q.push({ x: cur.x, y: cur.y - 1 })
            if (grid_type[cur.x][cur.y - 1] % 50 == player && grid_type[cur.x][cur.y - 1] < 150)
                Army_cnt += army_cnt[cur.x][cur.y - 1] - 1
            move_order.push({ x: cur.x, y: cur.y - 1, dx: cur.x, dy: cur.y, half: false })
        }
        if (cur.x + 1 < n && (!vis[(cur.x + 1) * m + cur.y]) && army_cnt[cur.x + 1][cur.y] > 0 && (grid_type[cur.x + 1][cur.y] < 150 || grid_type[cur.x + 1][cur.y] == 200 || grid_type[cur.x + 1][cur.y] == 202)) {
            vis[(cur.x + 1) * m + cur.y] = true
            q.push({ x: cur.x + 1, y: cur.y })
            if (grid_type[cur.x + 1][cur.y] % 50 == player && grid_type[cur.x + 1][cur.y] < 150)
            Army_cnt += army_cnt[cur.x + 1][cur.y] - 1
            move_order.push({ x: cur.x + 1, y: cur.y, dx: cur.x, dy: cur.y, half: false })
        }
        if (cur.y + 1 < m && (!vis[cur.x * m + cur.y + 1]) && army_cnt[cur.x][cur.y + 1] > 0 && (grid_type[cur.x][cur.y + 1] < 150 || grid_type[cur.x][cur.y + 1] == 200 || grid_type[cur.x][cur.y + 1] == 202)) {
            vis[cur.x * m + cur.y + 1] = true
            q.push({ x: cur.x, y: cur.y + 1 })
            if (grid_type[cur.x][cur.y + 1] % 50 == player && grid_type[cur.x][cur.y + 1] < 150)
                Army_cnt += army_cnt[cur.x][cur.y + 1] - 1
            move_order.push({ x: cur.x, y: cur.y + 1, dx: cur.x, dy: cur.y, half: false })
        }
    }
    if (Army_cnt >= need) {
        doMove(move_order)
    }
}
let dfs_path = []

let CityQueue = []
let GeneralQueue = []

let isFind = false

function explore(x, y, i) {
    isDB = true
    if (army_cnt[x][y] == 1)
        return
    Vis[x * m + y] = true
    let dx = [-1, 0, 1, 0]
    let dy = [0, -1, 0, 1]
    let hlf = false
    if (army_cnt[x][y] > 500)
        hlf = true
    i = Math.floor(Math.random() * 4)
    let gox = x + dx[i]
    let goy = y + dy[i]
    if (gox >= n)
        return
    if (goy >= m)
        return
    if (gox < 0)
        return
    if (goy < 0)
        return
    if (Vis[gox * m + goy] == true)
        return
    Vis2 = Array(n * m)
    if (grid_type[gox][goy] == 200 || (grid_type[gox][goy] >= 204 && army_cnt[x][y] > 5) || grid_type[gox][goy] % 50 == player) {
        socket.emit('attack', { x: x, y: y, dx: gox, dy: goy, half: hlf })
        explore(gox, goy, i)
    }
    if (grid_type[gox][goy] >= 50 && grid_type[gox][goy] < 100) {
        console.log(`Got City at (${gox},${goy})`)
        CityQueue.push({ x: gox, y: goy })
    }
    if (grid_type[gox][goy] >= 100 && grid_type[gox][goy] < 150) {
        console.log(`Got General at (${gox},${goy})`)
        socket.emit('attack', { x: x, y: y, dx: gox, dy: goy, half: false })
        if (grid_type[gox][goy] % 50 != player)
            GeneralQueue.push({ x: gox, y: goy })
    }
    if (grid_type[gox][goy] < 50) {
        socket.emit('attack', { x: x, y: y, dx: gox, dy: goy, half: hlf })
        explore(gox, goy, i)
    }
}
let head = 0

socket.on('update', function (data) {
    if (data.is_diff) {
        for (let i = 0; i * 2 < data.grid_type.length; ++i) {
            let t = data.grid_type[i * 2];
            grid_type[parseInt(t / m)][t % m] = data.grid_type[i * 2 + 1]
        }
        for (let i = 0; i * 2 < data.army_cnt.length; ++i) {
            let t = data.army_cnt[i * 2];
            army_cnt[parseInt(t / m)][t % m] = data.army_cnt[i * 2 + 1];
        }
    }
    else {
        for (let i = 0, t = 0; i < n; ++i) {
            for (let j = 0; j < m; ++j) {
                grid_type[i][j] = data.grid_type[t++];
            }
        }
        for (let i = 0, t = 0; i < n; ++i) {
            for (let j = 0; j < m; ++j) {
                army_cnt[i][j] = data.army_cnt[t++];
            }
        }
    }
    let MyCount = Total()
    console.log("MyCount:", MyCount)
    let TurnTot = data.turn
    if (TurnTot % 5 == 0)
        showMap(data)
    let NearestEnemy = FindNearestEnemy()
    console.log("Nearest Enemy:" + NearestEnemy)
    let CountArmyAround = ArmiesAround()
    console.log(`Found ${CountArmyAround}  Enemies Around`)
    if (CountArmyAround > 50) {
        console.log("Save My Home")
        let need = CountArmyAround + 3 - army_cnt[generalXY[0]][generalXY[1]]
        gatherArmyToMy(generalXY[0], generalXY[1], Math.floor(MyCount.Army / 2))
        for (let i = 0; i < n; ++i)
            for (let j = 0; j < m; ++j)
                if (grid_type[i][j] % 50 == player && army_cnt[i][j] > 0 && i * m + j != generalXY[0] * m + generalXY[1])
                    explore(i, j, Math.floor(Math.random() * 4))
    }
    else {
        if (isFind == true)
            return
        vis = Array(n * m)
        Vis = Array(n * m)
        dfs_path = []
        ++head;
        if (head % 8 < 4) {
            if (MyCount.Army > 200) {
                head = 2
                return
            }
            console.log("Do Normal Explore")
            isFind = true
            for (let i = 0; i < n; ++i)
                for (let j = 0; j < m; ++j)
                    if (grid_type[i][j] % 50 == player && army_cnt[i][j] > 0)
                        explore(i, j, Math.floor(Math.random() * 4))
            isFind = false
        }
        else if (head % 8 < 7) {
            let k = []
            for (let i = 0; i < n; ++i)
                for (let j = 0; j < m; ++j)
                    if (grid_type[i][j] % 50 == player && army_cnt[i][j] > 10)
                        k.push({x:i, y:j})
            if (k.length < 1)
                return
            isFind = true
            let z = k[Math.floor(Math.random() * k.length)]
            let fx = Math.floor(Math.random() * 4)
            let dx = [-1, 0, 1, 0]
            let dy = [0, -1, 0, 1]
            let depth = 0
            while (true) {
                let gox = z.x + dx[fx]
                let goy = z.y + dy[fx]
                if (gox < 0)
                    break
                if (goy < 0)
                    break
                if (gox >= n)
                    break
                if (goy >= m)
                    break
                console.log(gox, goy)
                ++depth
                if (depth > 30)
                    break
                if (army_cnt[z.x][z.y] <= 1)
                    break
                if (grid_type[gox][goy] >= 201)
                    break
                if (grid_type[gox][goy] >= 100 && grid_type[gox][goy] < 150 && grid_type[gox][goy] % 50 != player)
                    GeneralQueue.push({ x: gox, y: goy })

                if (grid_type[gox][goy] >= 50 && grid_type[gox][goy] < 100 && grid_type[gox][goy] % 50 != player)
                    CityQueue.push({ x: gox, y: goy })
                z.x = gox
                z.y = goy
            }
            isFind = false
        }
        else if (head % 8 == 6) {
            if (MyCount.Army < 100)
                return
            console.log("Do Fuck")
            isFind = true
            gatherArmyToMy(generalXY[0], generalXY[1], 8798979)
            goFuck(generalXY[0], generalXY[1], 0, Math.floor(Math.random() * 4))
            for (let i = moveOrders.length - 1; i >= 0; --i)
                socket.emit('attack', moveOrders[i])
            isFind = false
        }
            moveOrders = []
            for (let i = 0; i < GeneralQueue.length; ++i) {
                if (grid_type[GeneralQueue[i].x][GeneralQueue[i].y] % 50 != player) {
                    isFind = true
                    Conquer(GeneralQueue[i][i].x, GeneralQueue[i][i].y, 19190810)
                    isFind = false
                    return
                }
            }
            for (let i = 0; i < CityQueue.length; ++i) {
                if (grid_type[CityQueue[i].x][CityQueue[i].y] % 50 != player && ((army_cnt[CityQueue[i].x][CityQueue[i].y] > 0 && MyCount.Army > army_cnt[CityQueue[i].x][CityQueue[i].y] + 20) || MyCount.Army > 80)) {
                    isFind = true
                    Conquer(CityQueue[i].x, CityQueue[i].y, army_cnt[CityQueue[i].x][CityQueue[i].y] > 0 ? army_cnt[CityQueue[i].x][CityQueue[i].y] + 20 : 100)

                    isFind = false
                    return
                }
            }
    }
});
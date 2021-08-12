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
    setTimeout(function() {
        socket.emit('change_ready', { ready: 1 })
        socket.emit('send_message', { text: '开始吧', team: 0 })
    }, 5000)
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

let grid_type, army_cnt, is_in
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
    is_in = Array(n)
    for (let i = 0; i < n; ++i)
        is_in[i] = Array(m)
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
let weight = []

function goFuck(x, y, startx, starty, last, need) {
    isDB = true
    if (army_cnt[x][y] == 1)
        return
    Vis[x * m + y] = true
    let dx = [-1, 0, 1, 0]
    let dy = [0, -1, 0, 1]
    let k = [0, 0, 0, 0]
    let backLast = [2, 3, 0, 1]
    for (let i = 0; i < 4; ++i)
        k[i] += weight[i]
    if (last >= 0 && last <= 3)
        k[last] = 10, k[backLast[last]] -= 10
    let sx = [0, 1, 2, 3]
    let hlf = false
    for (let i = x - 1; i <= x + 1; ++i) {
        for (let j = y - 1; j <= y + 1; ++j) {
            if (i < 0)
                continue
            if (j < 0)
                continue
            if (i >= n)
                continue
            if (j >= m)
                continue
            if (i == x - 1 && grid_type[i][j] < 150 && grid_type[i][j] % 50 == 0)
                k[0] += army_cnt[i][j]
            if (i == x + 1 && grid_type[i][j] < 150 && grid_type[i][j] % 50 == 0)
                k[2] += army_cnt[i][j]
            if (j == y - 1 && grid_type[i][j] < 150 && grid_type[i][j] % 50 == 0)
                k[1] += army_cnt[i][j]
            if (j == y + 1 && grid_type[i][j] < 150 && grid_type[i][j] % 50 == 0)
                k[3] += army_cnt[i][j]
            if (grid_type[i][j] >= 50 && grid_type[i][j] < 100) {
                console.log(`Got City at (${i},${j})`)
                if (grid_type[i][j] % 50 != player && is_in[i][j] != true) {
                    CityQueue.push({ x: i, y: j })
                    is_in[i][j] = true
                }
            }
            if (grid_type[i][j] >= 100 && grid_type[i][j] < 150) {
                console.log(`Got General at (${i},${j})`)
                if (grid_type[i][j] % 50 != player && is_in[i][j] != true) {
                    GeneralQueue.push({ x: i, y: j })
                    is_in[i][j] = true
                }
            }
        }
    }
    sx.sort(function (a, b) {
        if (k[b] == k[a])
            return Math.random() - 0.5;
        return Math.random() - k[a] / (k[b] + k[a]);
    })
    weight[sx[0]] += Math.floor(k[sx[0]] / 10)
    for (let i = 0; i < 4; ++i) {
        let gox = x + dx[sx[i]]
        let goy = y + dy[sx[i]]
        if (gox >= n)
            continue
        if (goy >= m)
            continue
        if (gox < 0)
            continue
        if (goy < 0)
            continue
        if (Vis[gox * m + goy] == true)
            continue
        if (Math.abs(startx - x) + Math.abs(starty - y) + 6 > Math.abs(startx - gox) + Math.abs(starty - goy)) {
            continue
        }
        if (grid_type[gox][goy] < 150 && grid_type[gox][goy] % 50 != player &&
            army_cnt[gox][goy] > army_cnt[x][y])
            continue
        if (grid_type[gox][goy] != 201) {
            socket.emit('attack', { x: x, y: y, dx: gox, dy: goy, half: need })
            moveOrders.push({ x: gox, y: goy, dx: x, dy: y, half: need })
            goFuck(gox, goy, startx, starty, last, false)
            return
        }
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
    //if (Army_cnt >= need) {
        doMove(move_order)
    //}
}
let dfs_path = []

let CityQueue = []
let GeneralQueue = []

let isFind = false

function explore(x, y, i) {
    isDB = true
    if (army_cnt[x][y] == 1)
        return
    for (let i = x - 1; i <= x + 1; ++i) {
        for (let j = y - 1; j <= y + 1; ++j) {
            if (i < 0)
                continue
            if (j < 0)
                continue
            if (i >= n)
                continue
            if (j >= m)
                continue
            if (grid_type[i][j] >= 50 && grid_type[i][j] < 100) {
                console.log(`Got City at (${i},${j})`)
                if (grid_type[i][j] % 50 != player && is_in[i][j] != true) {
                    CityQueue.push({ x: i, y: j })
                    is_in[i][j] = true
                }
            }
            if (grid_type[i][j] >= 100 && grid_type[i][j] < 150) {
                console.log(`Got General at (${i},${j})`)
                if (grid_type[i][j] % 50 != player && is_in[i][j] != true) {
                    GeneralQueue.push({ x: i, y: j })
                    is_in[i][j] = true
                }
            }
        }
    }
    Vis[x * m + y] = true
    let dx = [-1, 0, 1, 0]
    let dy = [0, -1, 0, 1]
    let hlf = false
    if (army_cnt[x][y] > 10)
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
    if (grid_type[gox][goy] >= 50 && grid_type[gox][goy] < 100 && is_in[gox][goy] != true) {
        console.log(`Got City at (${gox},${goy})`)
        CityQueue.push({ x: gox, y: goy })
        is_in[gox][goy] = true
    }
    if (grid_type[gox][goy] >= 100 && grid_type[gox][goy] < 150) {
        console.log(`Got General at (${gox},${goy})`)
        socket.emit('attack', { x: x, y: y, dx: gox, dy: goy, half: false })
        if (grid_type[gox][goy] % 50 != player && is_in[gox][goy] != true) {
            GeneralQueue.push({ x: gox, y: goy })
            is_in[gox][goy] = true
        }
    }
    if (grid_type[gox][goy] < 50) {
        socket.emit('attack', { x: x, y: y, dx: gox, dy: goy, half: hlf })
        explore(gox, goy, i)
    }
}
let head = 0


// 更新
socket.on('update', function (data) {
    if (data.is_diff) {   //更新
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
    for (let i = 0; i < n; ++i)
        for (let j = 0; j < m; ++j) {
            if (grid_type[i][j] >= 50 && grid_type[i][j] < 100) {
                console.log(`Got City at (${i},${j})`)
                if (grid_type[i][j] % 50 != player && is_in[i][j] != true) {
                    CityQueue.push({ x: i, y: j })
                    is_in[i][j] = true
                }
            }
            if (grid_type[i][j] >= 100 && grid_type[i][j] < 150) {
                console.log(`Got General at (${i},${j})`)
                if (grid_type[i][j] % 50 != player && is_in[i][j] != true) {
                    GeneralQueue.push({ x: i, y: j })
                    is_in[i][j] = true
                }
            }
        }
    let MyCount = Total()
    console.log("MyCount:", MyCount)
    if (MyCount.Land == 0) {
        process.exit(0)
        return
    }
    let TurnTot = data.turn
    if (TurnTot % 5 == 0)
        showMap(data)
    let NearestEnemy = FindNearestEnemy()
    console.log("Nearest Enemy:" + NearestEnemy)
    let CountArmyAround = ArmiesAround()
    console.log(`Found ${CountArmyAround}  Enemies Around`)
    for (let i = 0; i < GeneralQueue.length; ++i) {
        if (grid_type[GeneralQueue[i].x][GeneralQueue[i].y] % 50 != player && grid_type[GeneralQueue[i].x][GeneralQueue[i].y] >= 100 && grid_type[GeneralQueue[i].x][GeneralQueue[i].y] < 150) {
            isFind = true
            /*socket.emit('send_message', {
                text: `${GeneralQueue[i].x} ${GeneralQueue[i].y} 你家要没了`,
                team: 0
            })*/
            Conquer(GeneralQueue[i].x, GeneralQueue[i].y, 19190810)
            setTimeout(function () { isFind = false }, 100)
            return
        }
    }
    if (CountArmyAround > generalXY) {
        console.log("Save My Home")
        let need = CountArmyAround + 3 - army_cnt[generalXY[0]][generalXY[1]]
        gatherArmyToMy(generalXY[0], generalXY[1], Math.floor(MyCount.Army / 2))
        console.log("Do Fuck")
        isFind = true
        //gatherArmyToMy(generalXY[0], generalXY[1], 8798979)
        let goFuckSelect = []
        for (let i = 0; i < n; ++i)
            for (let j = 0; j < m; ++j)
                if (grid_type[i][j] < 150 && grid_type[i][j] % 50 == player && army_cnt[i][j] > 20 && i != generalXY[0] && j != generalXY[1]) {
                    goFuckSelect.push({ x: i, y: j })
                }
        for (let i = 0; i < goFuckSelect.length; ++i)
            goFuck(goFuckSelect[i].x, goFuckSelect[i].y, goFuckSelect[i].x, goFuckSelect[i].y, 114514, false)
        for (let i = moveOrders.length - 1; i >= 0; --i)
            socket.emit('attack', moveOrders[i])
        setTimeout(function () { isFind = false }, 100)
    }
    else {
        if (isFind == true)
            return
        vis = Array(n * m)
        Vis = Array(n * m)
        dfs_path = []
        ++head;
        if (MyCount.Army > 150 && head % 20 == 0) {
            console.log("Do Fuck")
            isFind = true
            //gatherArmyToMy(generalXY[0], generalXY[1], 8798979)
            let goFuckSelect = []
            for (let i = 0; i < n; ++i)
                for (let j = 0; j < m; ++j)
                    if (grid_type[i][j] < 150 && grid_type[i][j] % 50 == player && army_cnt[i][j] > 20) {
                        goFuckSelect.push({ x: i, y: j })
                    }
            for (let i = 0; i < goFuckSelect.length; ++i)
                goFuck(goFuckSelect[i].x, goFuckSelect[i].y, goFuckSelect[i].x, goFuckSelect[i].y, 114514, false)
            for (let i = moveOrders.length - 1; i >= 0; --i)
                socket.emit('attack', moveOrders[i])
            setTimeout(function () { isFind = false }, 100)
            return
        }
        else {
            console.log("Do Normal Explore")
            isFind = true
            for (let i = 0; i < n; ++i)
                for (let j = 0; j < m; ++j)
                    if (grid_type[i][j] % 50 == player && army_cnt[i][j] > 0)
                        explore(i, j, Math.floor(Math.random() * 4))
            setTimeout(function () { isFind = false }, 100)
        }
        moveOrders = []
        for (let i = 0; i < CityQueue.length; ++i) {
            if (grid_type[CityQueue[i].x][CityQueue[i].y] % 50 != player && ((army_cnt[CityQueue[i].x][CityQueue[i].y] > 0 && MyCount.Army > army_cnt[CityQueue[i].x][CityQueue[i].y] + 20) || MyCount.Army > 80)) {
                isFind = true
                Conquer(CityQueue[i].x, CityQueue[i].y, army_cnt[CityQueue[i].x][CityQueue[i].y] > 0 ? army_cnt[CityQueue[i].x][CityQueue[i].y] + 20 : 100)

                setTimeout(function() { isFind = false} , 100)
                return
            }
        }
    }
});

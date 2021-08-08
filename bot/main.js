var io = require('socket.io-client');

var socket = io('http://192.168.5.131:23333');

function genName() {
	let Ch1 = ["殇","伤","裳","霓","离","璃","婉","晚","绾","挽","辞","歌","泪","霜","柒","流","乡","梦","忆","衣","依","意","亦","艺","伊","曦","溪","兮","惜","浅","芊","苏","落","洛","执","樱","雪","音","若","蝶","星","月","光","诗","思","卿","君"]
	let Ch2 = ["ヘ","ン","ヮ","ャ","マ","ァ","キ","の"]
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

	/* Don't lose this user_id or let other people see it!
	 * Anyone with your user_id can play on your bot's account and pretend to be your bot.
	 * If you plan on open sourcing your bot's code (which we strongly support), we recommend
	 * replacing this line with something that instead supplies the user_id via an environment variable, e.g.
	 * var user_id = process.env.BOT_USER_ID;
	 */
	socket.emit('join_game_room', {
		'room': 'orzlh',
		'nickname': '[bot]' + genName()
	})
	socket.emit('send_message', { text: '我来了', team: 0 })
	// Set the username for the bot.
	// This should only ever be done once. See the API reference for more details.
	//socket.emit('set_username', user_id, username);

	// Join a custom game and force start immediately.
	// Custom games are a great way to test your bot while you develop it because you can play against your bot!
	//var custom_game_id = 'my_private_game';
	//socket.emit('join_private', custom_game_id, user_id);
	//socket.emit('set_force_start', custom_game_id, true);
	//console.log('Joined custom game at http://bot.generals.io/games/' + encodeURIComponent(custom_game_id));
	socket.emit('change_ready', { ready: 1 })
	socket.emit('send_message', { text: '开始把', team: 0 })
	socket.emit('change_game_conf', {
		height_ratio: "1",
		width_ratio: "1",
		city_ratio: "0.5",
		mountain_ratio: "0.5",
		swamp_ratio: "0.2",
		speed: 3,
		custom_map: ""
	})
	// When you're ready, you can have your bot join other game modes.
	// Here are some examples of how you'd do that:

	// Join the 1v1 queue.
	// socket.emit('join_1v1', user_id);

	// Join the FFA queue.
	// socket.emit('play', user_id);

	// Join a 2v2 team.
	// socket.emit('join_team', 'team_name', user_id);
});

// Terrain Constants.
// Any tile with a nonnegative value is owned by the player corresponding to its value.
// For example, a tile with value 1 is owned by the player with playerIndex = 1.
var TILE_EMPTY = -1;
var TILE_MOUNTAIN = -2;
var TILE_FOG = -3;
var TILE_FOG_OBSTACLE = -4; // Cities and Mountains show up as Obstacles in the fog of war.

// Game data.
var playerIndex;
var generals; // The indicies of generals we have vision of.
var cities = []; // The indicies of cities we have vision of.
var map = [];

/* Returns a new array created by patching the diff into the old array.
 * The diff formatted with alternating matching and mismatching segments:
 * <Number of matching elements>
 * <Number of mismatching elements>
 * <The mismatching elements>
 * ... repeated until the end of diff.
 * Example 1: patching a diff of [1, 1, 3] onto [0, 0] yields [0, 3].
 * Example 2: patching a diff of [0, 1, 2, 1] onto [0, 0] yields [2, 0].
 */
function patch(old, diff) {
	var out = [];
	var i = 0;
	while (i < diff.length) {
		if (diff[i]) {  // matching
			Array.prototype.push.apply(out, old.slice(out.length, out.length + diff[i]));
		}
		i++;
		if (i < diff.length && diff[i]) {  // mismatching
			Array.prototype.push.apply(out, diff.slice(i + 1, i + 1 + diff[i]));
			i += diff[i];
		}
		i++;
	}
	return out;
}

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

function isDanger() {
	let startX = generalXY[0] - 3
	if (startX < 0)
		startX = 0
	let startY = generalXY[1] - 3
	if (startY < 0)
		startY = 0
	let sum = 0;
	for (let i = startX; (i < n) && (i <= generalXY[0] + 3); ++i) {
		for (let j = startY; (j < m) && (j <= generalXY[1] + 3); ++j) {
			if (grid_type[i][j] % 50 != player && grid_type[i][j] % 50 != 0 && grid_type[i][j] < 50)
				sum += army_cnt[i][j]
		}
	}
	if (sum > 100)
		return true
	startX = generalXY[0] - 1
	if (startX < 0)
		startX = 0
	startY = generalXY[1] - 1
	if (startY < 0)
		startY = 0
	for (let i = startX; (i < n) && (i <= generalXY[0] + 1); ++i) {
		for (let j = startY; (j < m) && (j <= generalXY[1] + 1); ++j) {
			if (grid_type[i][j] % 50 != player && grid_type[i][j] % 50 != 0)
				if (army_cnt[i][j] > 0)
					return true
		}
	}
	return false;
}
let Vis, Vis2
let isDB = false

/*function saveKing(x, y, lx, ly) {
	isDB = true
	if (Vis2[x * m + y] == true)
		return
	Vis2[x * m + y] = true
	if (x - 1 >= 0)
		saveKing(x - 1, y, x, y)
	if (y - 1 >= 0)
		saveKing(x, y - 1, x, y)
	if (x + 1 < n)
		saveKing(x + 1, y, x, y)
	if (y + 1 < m)
		saveKing(x, y + 1, x, y)
	if ((x != lx) && (y != ly)) {
		socket.emit('attack', { x: x, y: y, dx: lx, dy: ly, half: false })
	}
}*/

function saveKing(x, y) {
	for (let i = 0; i < n; ++i) {
		for (let j = 0; j < y; ++j)
			socket.emit('attack', { x: i, y: j, dx: i, dy: j + 1, half: false })
		for (let j = m - 1; j >= y + 1; --j)
			socket.emit('attack', { x: i, y: j, dx: i, dy: j - 1, half: false })
	}
	for (let i = 0; i < x; ++i)
		socket.emit('attack', { x: i, y: y, dx: i + 1, dy: y, half: false })
	for (let i = n - 1; i >= x+ 1; --i)
		socket.emit('attack', { x: i, y: y, dx: i - 1, dy: y, half: false })
}

function getAll(x, y) {
	if (Vis2[x * m + y] == true)
		return
	let res = army_cnt[x][y]
	Vis2[x * m + y] = true
	if (x - 1 >= 0)
		res += getAll(x - 1, y)
	if (y - 1 >= 0)
		res += getAll(x, y - 1)
	if (x + 1 < n)
		res += getAll(x + 1, y)
	if (y + 1 < m)
		res += getAll(x, y + 1)
}

function explore(x, y) {
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
	if (grid_type[gox][goy] >= 50 && grid_type[gox][goy] < 100 && getAll(gox, goy) > army_cnt[gox][goy]) {
		socket.emit('send_message', { text: '抢兵营抢兵营', team: 0 })
		Vis2 = Array(n * m)
		saveKing(gox, goy, gox, goy)
		explore(gox, goy)
	}
	else if (grid_type[gox][goy] == 200 || (grid_type[gox][goy] == 204 && army_cnt[x][y] > 5) || grid_type[gox][goy] % 50 == player) {
		socket.emit('attack', { x: x, y: y, dx: gox, dy: goy, half: hlf })
		explore(gox, goy)
	}
	else if (grid_type[gox][goy] >= 100 && grid_type[gox][goy] < 150 && grid_type[gox][goy] % 50 != player) {
		socket.emit('send_message', { text: '嘿嘿，找到你家了', team: 0 })
		Vis2 = Array(n * m)
		saveKing(gox, goy, gox, goy)
		socket.emit('attack', { x: x, y: y, dx: gox, dy: goy, half: false })
		explore(gox, goy)
	}
}

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
	if (data.game_end) {
		//socket.emit('disconnect', ()=>{})
	}
	if (isDB == true)
		return
	if (isDanger() == true) {
		Vis2 = Array(n * m)
		socket.emit('send_message', { text: '草，家要没了', team: 0 })
		saveKing(generalXY[0], generalXY[1], generalXY[0], generalXY[1])

	}
	else {
		Vis = Array(n * m)
		for (let i = 0; i < n; ++i)
			for (let j = 0; j < m; ++j)
				if (grid_type[i][j] % 50 == player && army_cnt[i][j] > 0)
					explore(i, j)
	}

	isDB = false
});


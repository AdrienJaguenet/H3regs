var map = [];
var overmap = [];
var clipMap = [];
var graph;
var tileset;
var characters_tileset;
var objects_tileset;
var characters = [];
var realTileSize;
var frame_n = 0;
var camera_x = 0;
var camera_y = 0;

function Character()
{
	this.px = 0;
	this.py = 0;
	this.facing = 'bottom';
	this.path = [];
	this.destination = null;
	this.move_n = 0;
	this.moving = false;
	this.ai = null;
}

function Tileset(src, t_w, t_h)
{
	this.image = new Image();
	this.image.tileset = this;
	this.tileWidth = t_w;
	this.tileHeight = t_h;
	this.image.onload = function() {
		this.tileset.hTiles = this.width / tileset.tileWidth;
	}
	this.image.src = src;
}

Tileset.prototype.drawTile = function(n, ctx, x, y)
{
	var tile_xn = n % this.hTiles;
	var tile_yn = Math.floor(n / this.hTiles);
	var tile_x = tile_xn * this.tileWidth;
	var tile_y = tile_yn * this.tileHeight;
	ctx.drawImage(this.image, tile_x, tile_y, this.tileWidth, this.tileHeight, x, y, realTileSize, realTileSize);
}

function withinDistance(x, y, a, b, dst)
{
	return ((x - a) * (x - a) + (y - b) * (y - b)) <= dst * dst;
}

function startup()
{
	var canvas = document.getElementById("main-canvas");
	var ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;

	tileset = new Tileset("res/grass-tiles.png", 16, 16);
	characters_tileset = new Tileset("res/characters.png", 16, 18);
	objects_tileset = new Tileset("res/plants.png", 16, 16);

	characters.push(new Character());
	player = characters[0];

	// spawn zombies
	for (var i = 0; i < 10; ++i) {
		var new_c = new Character();
		new_c.px = Math.floor(Math.random() * 20);
		new_c.py = Math.floor(Math.random() * 20);
		new_c.ai = "hostile";
		characters.push(new_c);
	}
		
	map = Array.from(Array(100), () => new Array(100));
	clipMap = Array.from(Array(100), () => new Array(100));
	overmap = Array.from(Array(100), () => new Array(100));
	realTileSize = 64;
	// generate map
	for (var i=0; i < 100; ++i) {
		for (var j=0; j < 100; ++j) {
			if (withinDistance(i, j, 40, 60, 50) || (i + j) % 2) {
				map[i][j] = 1;
			} else {
				map[i][j] = 0;
			}

			if (Math.random() < .1 && ! (i == player.px && j == player.py)) {
				overmap[i][j] = 1;
				clipMap[i][j] = 0;
			} else {
				overmap[i][j] = 0;
				clipMap[i][j] = 1;
			}
		}
	}
	graph = new Graph(clipMap);

	// input
	canvas.addEventListener('mousedown', function(e) {
		const rect = canvas.getBoundingClientRect();
		const canvas_x = event.clientX - rect.left - camera_x;
		const canvas_y = event.clientY - rect.top - camera_y;

		const tile_x = Math.floor(canvas_x / realTileSize);
		const tile_y = Math.floor(canvas_y / realTileSize);

		var player = characters[0];

		// create A* graph
		player.destination = graph.grid[tile_x][tile_y];
	});

	window.setInterval(draw_game, 33.3); // 30 FPS
	window.setInterval(update, 100.); // 10 TPS
}

function update()
{
	var player = characters[0];
	for (var c_i in characters) {
		var character = characters[c_i];
		// will try to find the player
		if (character.ai == "hostile") {
			//character.destination = graph.grid[player.px][player.py];
		}

		// recalculate the path (might need to optimize later?)
		if (character.destination) {
			/* UGLY HACK: the player does not block so that we can find a path to him */
			graph.grid[player.px][player.py].weight = 1;
			character.path = astar.search(graph, graph.grid[character.px][character.py], character.destination);
		}

		// move if
		if (character.path.length > 0) {
			character.moving = true;
			character.move_n ++;
			var nextNode = character.path[0];
			if (graph.grid[nextNode.x][nextNode.y].weight > 0) {
				if (nextNode.x < character.px) {
					character.facing = 'left';

				} else if (nextNode.x > character.px) {
					character.facing = 'right';

				} else if (nextNode.y < character.py) {
					character.facing = 'top';

				} else if (nextNode.y > character.py) {
					character.facing = 'bottom';
				}

				if (character.move_n == 3) {
					// liberate cell
					graph.grid[character.px][character.py].weight = 1;

					// remove cell from the path
					character.path.shift();
					character.px = nextNode.x;
					character.py = nextNode.y;
					character.move_n = 0;

					// current cell is full
					graph.grid[character.px][character.py].weight = 0;  
				}
				
			}
		} else {
			character.moving = false;
			character.move_n = 0;
			character.destination = null;
		}
	}
}

function draw_game()
{
	frame_n ++;
	var canvas = document.getElementById("main-canvas");
	var ctx = canvas.getContext("2d");

	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvas.width, canvas.height);


	// draw terrain
	for (var i=0; i < map.length; ++i) {
		for (var j=0; j < map[i].length; ++j) {
			var tileN = 7;
			switch (map[i][j]) {
				case 0:
					break;
				case 1:
					tileN = 0;
					break;
			}
			tileset.drawTile(tileN, ctx, camera_x + i * realTileSize, camera_y + j * realTileSize);
		}
	}

	// draw overlay objects
	for (var i=0; i < map.length; ++i) {
		for (var j=0; j < map[i].length; ++j) {
			switch (overmap[i][j]) {
				case 0:
					break;
				case 1:
					var tileN = 0;
					objects_tileset.drawTile(tileN, ctx, camera_x + i * realTileSize, camera_y + j * realTileSize);
					break;
			}
		}
	}

	for (var c_i in characters) {
		if (c_i == 0) { // this is the player 
			drawCharacter(ctx, characters[c_i], true);
		} else {
			drawCharacter(ctx, characters[c_i], false);
		}
	}

}

function drawCharacter(ctx, character, centerCamera)
{
	// draw character
	var characterTileN = 0;
	var dx = 0;
	var dy = 0;
	switch (character.facing) {
		case 'top':
			playetTileN = 0;
			if (character.moving) {
				dy = -1/4 * character.move_n;
			}
			break;

		case 'bottom':
			characterTileN = 36;
			if (character.moving) {
				dy = 1/4 * character.move_n;
			}
			break;

		case 'right':
			characterTileN = 18;
			if (character.moving) {
				dx = 1/4 * character.move_n;
			}
			break;

		case 'left':
			characterTileN = 54;
			if (character.moving) {
				dx = -1/4 * character.move_n;
			}
			break;
	}
	if (character.moving) {
		characterTileN += Math.floor(frame_n / 4.) % 3;
	} else {
		characterTileN ++;
	}


	var character_scx = (character.px + dx) * realTileSize;
	var character_scy = (character.py + dy) * realTileSize - 4;

	if (centerCamera) {
		camera_x = 640 / 2 - character_scx;
		camera_y = 480 / 2 - character_scy;
	}
	characters_tileset.drawTile(characterTileN, ctx, camera_x + character_scx, camera_y + character_scy);
}


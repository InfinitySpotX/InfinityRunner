const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ================= STATE =================
let state = "menu";

// ================= BEST SCORE =================
let bestScore = parseInt(localStorage.getItem("bestScore") || "0");

// ================= RESIZE =================
function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  player.y = canvas.height - 120;
  updateLanes();
}
window.addEventListener("resize", resize);

// ================= LANES =================
let lanes = [];
function updateLanes(){
  let center = canvas.width / 2;
  lanes = [center - 120, center, center + 120];
}

// ================= SKINS =================
let skins = {
  default: {color:"cyan", unlock:0},
  fire: {color:"orange", unlock:600},
  neon: {color:"lime", unlock:900},
};

// ================= SAVE =================
let save = {
  skin: "default",
  unlocked: ["default"]
};

let saved = localStorage.getItem("runnerSave");
if(saved){
  save = JSON.parse(saved);
}

// ================= PLAYER =================
let player = {
  lane: 1,
  y: 0,
  shield: false,
  magnet: false,
  skin: save.skin
};

// ================= GAME DATA =================
let obstacles = [];
let coins = [];
let powerups = [];
let speed = 6;
let score = 0;

// ================= ANIMATION =================
let anim = 0;
function updateAnimation(){
  anim += 0.12;
}

// ================= SHAKE =================
let shake = 0;
function addShake(v){
  shake = v;
}

// ================= SOUND =================
function sound(type){
  try{
    let a = new AudioContext();
    let o = a.createOscillator();
    let g = a.createGain();

    o.connect(g);
    g.connect(a.destination);

    o.frequency.value =
      type === "start" ? 600 :
      type === "coin" ? 900 :
      type === "shield" ? 420 : 120;

    g.gain.value = 0.1;
    o.start();
    o.stop(a.currentTime + 0.15);
  } catch(e){}
}

// ================= START =================
function startGame(){
  state = "play";

  score = 0;
  speed = 6;

  obstacles = [];
  coins = [];
  powerups = [];

  player.lane = 1;
  player.shield = false;
  player.magnet = false;

  document.getElementById("startScreen")?.classList.add("hidden");
  document.getElementById("gameOver")?.classList.add("hidden");
  document.getElementById("shop")?.classList.add("hidden");

  sound("start");
}

// ================= RESET =================
function resetGame(){
  state = "menu";

  score = 0;
  speed = 6;

  obstacles = [];
  coins = [];
  powerups = [];

  player.lane = 1;
  player.shield = false;
  player.magnet = false;
}

// ================= MENU =================
function goMenu(){
  resetGame();

  document.getElementById("gameOver")?.classList.add("hidden");
  document.getElementById("startScreen")?.classList.remove("hidden");
}

// ================= RETRY =================
function retry(){
  resetGame();
  startGame();
}

// ================= GAME OVER =================
function gameOver(){
  if(state !== "play") return;

  state = "over";
  addShake(40);

  // BEST SCORE SAVE
  if(score > bestScore){
    bestScore = score;
    localStorage.setItem("bestScore", bestScore);
  }

  if(navigator.vibrate) navigator.vibrate([100,50,100]);

  let flash = document.createElement("div");
  flash.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:red;opacity:0.4;z-index:9999;
  `;
  document.body.appendChild(flash);
  setTimeout(()=>flash.remove(),150);

  document.getElementById("gameOver")?.classList.remove("hidden");
  document.getElementById("finalScore").innerText =
    "Score: " + Math.floor(score);

  sound("shield");
}

// ================= SKIN SHOP =================
function openShop(){
  let shop = document.getElementById("shop");
  if(!shop) return;

  shop.classList.remove("hidden");

  let html = "<h2>SKIN SHOP</h2>";

  for(let key in skins){

    let locked = bestScore < skins[key].unlock;

    html += `
      <div style="border:${player.skin===key?'2px solid cyan':'none'}">
        <h3>${key.toUpperCase()}</h3>
        <p>Unlock: ${skins[key].unlock} | Best: ${bestScore}</p>

        <button onclick="selectSkin('${key}')"
          ${locked ? "disabled" : ""}>
          ${locked ? "LOCKED 🔒" : (player.skin===key ? "SELECTED ✅" : "SELECT")}
        </button>
      </div>
    `;
  }

  html += `<button onclick="closeShop()">CLOSE</button>`;
  shop.innerHTML = html;
}

function closeShop(){
  document.getElementById("shop")?.classList.add("hidden");
}

function selectSkin(skin){
  if(bestScore < skins[skin].unlock) return;

  player.skin = skin;
  save.skin = skin;

  if(!save.unlocked.includes(skin)){
    save.unlocked.push(skin);
  }

  localStorage.setItem("runnerSave", JSON.stringify(save));

  openShop();
}

// ================= INPUT =================
document.addEventListener("keydown", e=>{
  if(state !== "play") return;

  if(e.key === "ArrowLeft") player.lane--;
  if(e.key === "ArrowRight") player.lane++;

  player.lane = Math.max(0, Math.min(2, player.lane));
});

// ================= TOUCH =================
let startX = 0;

document.addEventListener("touchstart", e=>{
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", e=>{
  if(state !== "play") return;

  let diff = e.changedTouches[0].clientX - startX;

  if(diff > 40) player.lane++;
  if(diff < -40) player.lane--;

  player.lane = Math.max(0, Math.min(2, player.lane));
});

// ================= SPAWN =================
setInterval(()=>{
  if(state !== "play") return;

  obstacles.push({lane:Math.floor(Math.random()*3), y:-50});
  coins.push({lane:Math.floor(Math.random()*3), y:-50});

  if(Math.random() > 0.6){
    powerups.push({
      lane:Math.floor(Math.random()*3),
      y:-50,
      type: Math.random()>0.5 ? "shield" : "magnet"
    });
  }
}, 800);

// ================= UPDATE =================
function update(){
  if(state !== "play") return;

  updateAnimation();
  speed += 0.002;

  let boost = 1 + speed * 0.02;

  obstacles.forEach(o=>{
    o.y += speed * boost;

    if(o.lane === player.lane && Math.abs(o.y - player.y) < 40){
      if(player.shield){
        o.y = canvas.height + 100;
        player.shield = false;
        sound("shield");
      } else {
        gameOver();
      }
    }
  });

  coins.forEach(c=>{
    c.y += speed * boost;

    if(c.lane === player.lane && Math.abs(c.y - player.y) < 25){
      score += 10;
      c.collected = true;
      sound("coin");
    }
  });

  powerups.forEach(p=>{
    p.y += speed * boost;

    if(p.lane === player.lane && Math.abs(p.y - player.y) < 25){

      if(p.type === "shield"){
        player.shield = true;
        sound("shield");
      }

      if(p.type === "magnet"){
        player.magnet = true;
        setTimeout(()=>player.magnet=false, 5000);
      }

      p.collected = true;
    }
  });

  if(player.magnet){
    coins.forEach(c=>{
      let dx = Math.abs(lanes[c.lane] - lanes[player.lane]);
      if(dx < 150) c.y += speed * 2;
    });
  }

  obstacles = obstacles.filter(o=>o.y < canvas.height);
  coins = coins.filter(c=>!c.collected);
  powerups = powerups.filter(p=>!p.collected);

  score += 0.05;

  document.getElementById("hud").innerText =
    "Score: " + Math.floor(score);
}

// ================= DRAW =================
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(state === "menu"){
    ctx.fillStyle = "cyan";
    ctx.font = "30px Arial";
    ctx.fillText("", 80, 200);
    ctx.fillText("PRESS START", 120, 260);
    return;
  }

  if(state === "over") return;

  ctx.save();

  if(shake > 0){
    ctx.translate(
      (Math.random()-0.5)*shake,
      (Math.random()-0.5)*shake
    );
    shake *= 0.85;
  }

  lanes.forEach(x=>{
    ctx.beginPath();
    ctx.moveTo(x,0);
    ctx.lineTo(x,canvas.height);
    ctx.strokeStyle = "#222";
    ctx.stroke();
  });

  // ================= PLAYER =================
  let color = skins[player.skin].color;

  ctx.fillStyle = color;
  ctx.fillRect(lanes[player.lane]-15, player.y, 30, 40);

  // 🔥 NEON GLOW FIX
  if(player.skin === "neon"){
    ctx.shadowBlur = 25;
    ctx.shadowColor = "lime";

    ctx.globalAlpha = 0.6;
    ctx.fillRect(lanes[player.lane]-18, player.y-2, 36, 44);

    ctx.globalAlpha = 0.3;
    ctx.fillRect(lanes[player.lane]-22, player.y-6, 44, 52);

    ctx.globalAlpha = 1;
  }

  if(player.shield){
    ctx.shadowBlur = 20;
    ctx.shadowColor = "cyan";
    ctx.beginPath();
    ctx.arc(lanes[player.lane], player.y+20, 30, 0, Math.PI*2);
    ctx.stroke();
  }

  ctx.restore();

  ctx.fillStyle = "red";
  obstacles.forEach(o=>{
    ctx.fillRect(lanes[o.lane]-20, o.y, 40, 40);
  });

  ctx.fillStyle = "gold";
  coins.forEach(c=>{
    ctx.beginPath();
    ctx.arc(lanes[c.lane], c.y, 8, 0, Math.PI*2);
    ctx.fill();
  });

  powerups.forEach(p=>{
    ctx.fillStyle = p.type === "shield" ? "#00ffff" : "blue";
    ctx.fillRect(lanes[p.lane]-10, p.y, 20, 20);
  });
}

// ================= LOOP =================
function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

resize();
updateLanes();
loop();

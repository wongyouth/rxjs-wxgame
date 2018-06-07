import { interval, animationFrameScheduler, merge, fromEvent, BehaviorSubject, race } from 'rxjs'
import { share, map, startWith, scan, withLatestFrom, takeUntil, mergeAll, mergeMap, tap, filter } from 'rxjs/operators'


// 常量
const FPS = 60
const screenWidth    = window.innerWidth
const screenHeight   = window.innerHeight
const PLAYER_WIDTH = 80
const PLAYER_HEIGHT = 80
const BULLET_WIDTH = 16
const BULLET_HEIGHT = 30
const BG_WIDTH = 512
const BG_HEIGHT = 512
const ENEMY_WIDTH   = 60
const ENEMY_HEIGHT  = 60

const bgImg = loadImage('images/bg.jpg')
const playerImg = loadImage('images/hero.png')
const enemyImg = loadImage('images/enemy.png')
const bulletImg = loadImage('images/bullet.png')
const atlas = loadImage('images/Common.png')
const bgmAudio = loadAudio('audio/bgm.mp3', {loop: true})
const bulletAudio = loadAudio('audio/bullet.mp3')
const boomAudio = loadAudio('audio/boom.mp3')

/**
 * 重新开始按钮区域
 * 方便简易判断按钮点击
 */
const btnArea = {
  startX: screenWidth / 2 - 40,
  startY: screenHeight / 2 - 100 + 180,
  endX  : screenWidth / 2  + 50,
  endY  : screenHeight / 2 - 100 + 255
}

function loadImage(path) {
  const img = new Image()
  img.src = path
  return img
}

function loadAudio(path, {loop=false}={}) {
  const audio = new Audio()
  audio.loop = loop
  audio.src = path
  return {
    play() {
      audio.currentTime = 0
      audio.play()
    }
  }
}

/**
 * 初始状态
 */
function getInitState() {
  return {
    bg: {
      img: bgImg,
      width: BG_WIDTH,
      height: BG_HEIGHT,
      top: 0
    },
    player: {
      img: playerImg,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      x: screenWidth / 2 - PLAYER_WIDTH / 2,
      y: screenHeight - PLAYER_HEIGHT - 30
    },
    enemies: [],
    bullets: [],
    anims: {},
    gameover: false,
    score: 0
  }
}

// 时钟
const clock$ = interval(1000 / FPS, animationFrameScheduler)
  .pipe(share())

// 背景
const bg$ = clock$
  .pipe(
    map(() => state => {
      if (state.gameover) return state

      state.bg.top = state.bg.top > screenHeight ? 0 : state.bg.top + 2
      return state
    })
  )


const playerSubject$ = new BehaviorSubject()

const touchstart$ = fromEvent(canvas, 'touchstart').pipe(share())
const touchend$ = fromEvent(canvas, 'touchend')
const touchmove$ = fromEvent(canvas, 'touchmove')


const playerMove$ = touchstart$.pipe(
  withLatestFrom(playerSubject$),
  filter(([ev, player]) => {
    return checkIsFingerOnAir(ev, player)
  }),
  mergeMap(() => {
    return touchmove$.pipe(takeUntil(touchend$))
  }),
  map(ev => ev.touches[0]),
  // tap(console.log),
)

const player$ = playerMove$
  .pipe(
    map(({clientX, clientY}) => (state) => {
      if (state.gameover) return state

      const {player} = state
      player.x = range(clientX - player.width / 2, 0, screenWidth - player.width) 
      player.y = range(clientY - player.height / 2, 0, screenHeight - player.height) 

      return state
    })
  )


const bullets$ = clock$.pipe(
  map(frame => state => {
    if (state.gameover) return state

    const player = state.player

    // 移动子弹
    state.bullets.forEach(function(bullet, index) {
      bullet.y -= 6
      if (bullet.y < -BULLET_HEIGHT) {
        state.bullets.splice(index, 1)
      }
    })

    // 动态生成
    if (frame % 20 === 0) {
      state.bullets.push({
        img: bulletImg,
        x: player.x + player.width / 2 - BULLET_WIDTH / 2,
        y: player.y - BULLET_HEIGHT,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT
      })

      bulletAudio.play()
    }
    return state
  })
)


const enemies$ = merge(clock$)
  .pipe(
    map(frame => state => {
      if (state.gameover) return state

      // 移动敌机
      state.enemies.forEach(function(enemy, index) {
        enemy.y += 6
        if ( enemy.y > screenHeight + enemy.height) {
          state.enemies.splice(index, 1)
        }
      })

      // 生成
      if (frame % 30 === 0) {
        state.enemies.push({
          img: enemyImg,
          x: rnd(0, screenWidth - ENEMY_WIDTH),
          y: -ENEMY_HEIGHT,
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
          speed: 6
        })
      }

      return state
    })
  )

const collision$ = clock$.pipe(
  map(() => state => {
    if (state.gameover) return state

    state.bulltes = state.bullets.filter(bullet => {
      state.enemies.every((enemy, index) => {
        if (isCollideWith(enemy, bullet)) {
          state.enemies.splice(index, 1)
          boomAudio.play()
          state.score += 1
          return false
        }
        
        return true
      })
    })

    for (const enemy of state.enemies) {
      if (isCollideWith(state.player, enemy)) {
        state.gameover = true
        break
      }
    }
    return state
  })
)

const restart$ = touchstart$.pipe(
  filter(ev => {
    const {clientX, clientY} = ev.touches[0]

    return (
      clientX > btnArea.startX
      && clientX < btnArea.endX
      && clientY > btnArea.startY
      && clientY < btnArea.endY
    )
  }),
  map(() => state => state.gameover ? getInitState() : state)
)

const state$ = merge(bg$, player$, enemies$, bullets$, collision$, restart$)
  .pipe(
    startWith(getInitState()),
    scan((state, reducer) => reducer(state))
  )

bgmAudio.play()
state$.subscribe(function(state) {
  playerSubject$.next(state.player)
  render(state)
})

// 画图
function render(state) {
  const ctx = canvas.getContext('2d')
  renderBg(ctx, state)
  
  ;[state.player].concat(
    state.bullets,
    state.enemies
  ).forEach(item => renderSprite(ctx, item))
  
  renderScore(ctx, state)
  if (state.gameover) renderGameover(ctx, state)
}

function renderBg(ctx, {bg}) {
  ctx.drawImage(
    bg.img,
    0,
    0,
    bg.width,
    bg.height,
    0,
    -screenHeight + bg.top,
    screenWidth,
    screenHeight
  )

  ctx.drawImage(
    bg.img,
    0,
    0,
    bg.width,
    bg.height,
    0,
    bg.top,
    screenWidth,
    screenHeight
  )
}

function renderSprite(ctx, {img, x, y, width, height}) {
  ctx.drawImage(
    img,
    x,
    y,
    width,
    height
  )
}

function renderScore(ctx, {score}) {
  ctx.fillStyle = "#ffffff"
  ctx.font      = "20px Arial"

  ctx.fillText(
    score,
    10,
    30
  )
}

function renderGameover(ctx, {score}) {
  ctx.drawImage(atlas, 0, 0, 119, 108, screenWidth / 2 - 150, screenHeight / 2 - 100, 300, 300)

  ctx.fillStyle = "#ffffff"
  ctx.font    = "20px Arial"

  ctx.fillText(
    '游戏结束',
    screenWidth / 2 - 40,
    screenHeight / 2 - 100 + 50
  )

  ctx.fillText(
    '得分: ' + score,
    screenWidth / 2 - 40,
    screenHeight / 2 - 100 + 130
  )

  ctx.drawImage(
    atlas,
    120, 6, 39, 24,
    screenWidth / 2 - 60,
    screenHeight / 2 - 100 + 180,
    120, 40
  )

  ctx.fillText(
    '重新开始',
    screenWidth / 2 - 40,
    screenHeight / 2 - 100 + 205
  )
}

// Util

function rnd(start, end){
  return Math.floor(Math.random() * (end - start) + start)
}

/**
 * 简单的碰撞检测定义：
 * 另一个精灵的中心点处于本精灵所在的矩形内即可
 * @param{Sprite} sp: Sptite的实例
 */
function isCollideWith(sp1, sp2) {
  let sp2X = sp2.x + sp2.width / 2
  let sp2Y = sp2.y + sp2.height / 2

  // if ( !sp1.visible || !sp2.visible )
  //   return false

  return (  sp2X >= sp1.x
            && sp2X <= sp1.x + sp1.width
            && sp2Y >= sp1.y
            && sp2Y <= sp1.y + sp1.height  )
}

function checkIsFingerOnAir(ev, {x, y, width, height}) {
  const {clientX, clientY} = ev.touches[0]
  const deviation = 30

  return (  clientX >= x - deviation
            && clientY >= y - deviation
            && clientX <= x + width + deviation
            && clientY <= y + height + deviation  )
}

/**
 * 确保 value 在 min, max 之间
 */
function range(value, min, max) {
  return value < min
    ? min
    : value > max ? max : value
}
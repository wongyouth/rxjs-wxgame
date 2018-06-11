## quickstart

这是用 `rxjs` 改写的微信小游戏官方示例飞机游戏。细节参见[博文](https://wongyouth.github.io/2018/06/11/%E7%94%A8-rxjs-%E6%94%B9%E5%86%99%E5%BE%AE%E4%BF%A1%E5%AE%98%E6%96%B9%E5%B0%8F%E6%B8%B8%E6%88%8F/)

## 原版源码目录介绍
```
./js
├── base                                   // 定义游戏开发基础类
│   ├── animatoin.js                       // 帧动画的简易实现
│   ├── pool.js                            // 对象池的简易实现
│   └── sprite.js                          // 游戏基本元素精灵类
├── libs
│   ├── symbol.js                          // ES6 Symbol简易兼容
│   └── weapp-adapter.js                   // 小游戏适配器
├── npc
│   └── enemy.js                           // 敌机类
├── player
│   ├── bullet.js                          // 子弹类
│   └── index.js                           // 玩家类
├── runtime
│   ├── background.js                      // 背景类
│   ├── gameinfo.js                        // 用于展示分数和结算界面
│   └── music.js                           // 全局音效管理器
├── databus.js                             // 管控游戏状态
└── main.js                                // 游戏入口主函数
```

## rxjs版源码
```
./src
└── main.js                                // 游戏入口主函数
```

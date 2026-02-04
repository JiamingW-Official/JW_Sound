# Sound Matrix - Patatap Style

参考 [Patatap](https://patatap.com/) 的 10×3 矩阵交互 demo。按住鼠标并拖拽进入不同格子，每个格子会触发独特的动画和音效。

## 功能

- **10×3 矩阵**：30 个独立格子
- **鼠标交互**：按下进入格子 / 拖拽划过格子时触发
- **触摸支持**：移动端可触摸拖拽
- **30 种占位动画**：圆形、螺旋、波纹、星形等
- **占位音效**：Web Audio API 生成不同频率短音（可替换为真实音效）

## 运行

用本地服务器打开 `index.html`，或直接双击打开：

```bash
# 使用 Python
python -m http.server 8000

# 或使用 npx
npx serve .
```

然后访问 http://localhost:8000

## 添加真实音效

1. 将 30 个音效文件放入 `assets/sounds/` 目录
2. 命名为 `0.mp3` ~ `29.mp3`（或修改 `js/main.js` 中的 `playPlaceholderSound` 逻辑）
3. 在 `main.js` 中引入 Howler.js 或使用 Audio 元素替换占位音效

## 未来拓展

- **Three.js**：3D 空间与粒子效果
- **Motion Tracking**：摄像头 / 体感交互

## 技术栈

- [Two.js](https://two.js.org/) - 2D 绘图与动画
- Web Audio API - 占位音效

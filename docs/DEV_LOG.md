# 《脉象》openvela 版 AI Coding 开发日志

> 2026 首届 openvela AI 硬件开发者大赛参赛作品。
> 开发方式：AI Coding 辅助（人工决策 + AI 生成/重构/排错），全程迭代记录如下。

## 项目背景

《脉象》原为团队在 Zepp OS 平台的原创手表应用（AI 脉诊 + 中医六维/五脏评估）。
本项目将其移植到 openvela 快应用平台，目标形态为 vela-miwear-watch（480×480 圆屏），
并单独维护小米手环 Pro 形态的适配工程（MaiXiang_miBandPro）。

## 阶段一：可行性评估

- 全量盘点 Zepp OS 版 16 页面 + 6 工具模块的 API 依赖（@zos/* 14 个模块）
- 调研 openvela 快应用文档（框架/组件/接口全目录）
- 结论：utils 算法层约 63% 平台无关可直接复用；UI 层需按 .ux MVVM 全部重写；
  健康传感器依赖大赛开放的 service.health 模块（HEART_RATE/SPO2/STRESS 采样族）

## 阶段二：核心移植

- manifest/路由/权限重建（service.health + hapjs.permission.HEALTH + background.features）
- 算法层平移：pulse_diagnosis（诊断引擎）、hrv_calc（HRV/熵/LF-VLF/RSA 计算）、
  hrv_storage_manager（按日分文件存储）、pulse_shape（脉形波点阵）
- 采集层重写：Zepp HeartRate.onCurrentChange → service.health subscribeSample 1Hz 订阅
- 8 个页面按 .ux 模板重写：splash/oobe/home/measurement/dim_showcase/
  organ_showcase/rec_showcase/pulse_explain/pulse_theory/about

## 阶段三：平台差异攻坚（踩坑记录）

1. transform rotate 三连坑（雷达图/弧形文本）：
   - 内联 style 绑定 transform 不生效 → 静态 CSS 类量化方案
   - 默认 transform-origin 不可靠 → 显式声明
   - rotate 正角为逆时针（与 CSS 相反）→ 角度取反
   - 最终放弃 transform：雷达网格改 Node 脚本预渲染 PNG（内置手写 PNG 编码器），
     数据多边形改绝对定位圆点阵虚线
2. 子组件 $watch 监听 prop 不触发 → "父算子渲"模式（父页面计算、子组件纯渲染）
3. 字库无 emoji 字形（渲染为豆腐块）→ 全部改用汉字/位图图标
4. 单边 border 渲染为整圈边框 → 分隔线一律用独立 div
5. list1.png 竖向平铺露接缝 → 固定底图 + scroll 上层滚动结构
6. aiot-toolkit 临时镜像目录损坏 → 删除 .temp_* 缓存重建
7. 存储时序竞态（写后立读）→ 内存写穿缓存层 + @system.file 异步持久化
8. 小内存设备文件清理要求 → 历史数据 14 天自动裁剪

## 阶段四：合规与工程化

- DEBUG 虚拟数据注入机制（无真实测量时全链路可演示）
- 开屏分流（首次打开→OOBE / 已激活体验→主页）
- Apache 2.0 开源（LICENSE/NOTICE），素材声明（背景图为 Gemini AI 生成）
- 手环 Pro 版独立工程 fork（designWidth 缩放 + 全屏元素自适应改造）

## 平台经验沉淀

详见 docs/SKILL_vela_quickapp.md（openvela 快应用图形与 UI 适配技巧集）。

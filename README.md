# 脉象（MaiXiang）openvela 版

《脉象》是面向 openvela 智能手表的健康观察与传统脉学科普快应用，也是「2026 首届 openvela AI 硬件开发者大赛」参赛项目。

应用读取设备健康服务提供的心率采样，在设备端进行统计和经验规则分析，以脉象、六维指标、体质与五脏平衡趋势等形式呈现结果。相关结果仅用于健康科普和个人观察，不构成医疗诊断，也不能替代专业医疗建议。

## 项目特点

- openvela 圆屏快应用原生界面
- 设备端心率采样、规则分析与文件持久化
- 六维脉象与五脏平衡雷达图
- 脉象科普、结果解读与养生参考
- 从团队自有 Zepp OS 版本迁移并针对 openvela 重写界面和平台接口
- 使用 AI Coding 辅助迁移、重构、调试和文档整理

## 技术边界

- 当前输入为 `service.health` 提供的心率采样值，不读取原始 PPG 波形。
- RR 间隔由心率采样换算，用于展示性统计，不等同于医疗设备提供的逐搏 RR 间期。
- “脉象、体质、五脏平衡”等结果来自本地经验规则，不是经过临床验证的诊断结论。
- 参赛版不包含付费激活、体验限制或商业服务端。

## 开发与构建

环境安装参考 [Xiaomi Vela 快应用工具链文档](https://iot.mi.com/vela/quickapp/zh/content/tutorial/toolkit.html)。

```bash
npm install
npm run build
```

开发监听：

```bash
npm run start
```

## 开源与来源

本项目采用 Apache License 2.0。第三方工程结构、素材、AI 生成内容与代码来源说明见 [NOTICE](NOTICE)，开发过程见 [docs/DEV_LOG.md](docs/DEV_LOG.md)，原创性、相关工作和算法边界见 [docs/originality](docs/originality/)。

## 免责声明

本应用仅供健康科普、传统文化展示与个人趋势观察。如有身体不适或健康疑虑，请及时咨询具备资质的医疗专业人员。

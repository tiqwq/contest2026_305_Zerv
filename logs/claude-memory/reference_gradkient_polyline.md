---
name: reference_gradkient_polyline
description: ZeppOS widget 常量是 GRADKIENT_POLYLINE（带 K 的拼写），是 SDK 真实 API，勿改
metadata: 
  node_type: memory
  type: reference
  originSessionId: f585a08a-7548-444b-b923-9c199f985c55
---

ZeppOS 折线 widget 的运行时常量名是 **`widget.GRADKIENT_POLYLINE`**（注意拼写带一个多余的 `K`）。这是 ZeppOS SDK 自身的历史拼写错误，已固化进公开 API，是**真实可用的名字**。

项目 `page/stress_UI2.js` 使用 `widget.GRADKIENT_POLYLINE`，已验证可正常渲染，**不要"纠正"成 `GRADIENT_POLYLINE`**——那样会取到 undefined 导致折线画不出来。

**Why:** 官方文档目录文件名是 `GRADIENT_POLYLINE.mdx`（不带 K），容易误导人以为正文/代码拼错了；但文档正文示例和 SDK 运行时用的都是带 K 的版本。SDK 的 `.d.ts`（`@zeppos/device-types`）没有穷举 widget 常量，无法用类型定义裁决，唯一权威是运行时行为。

**How to apply:** 看到 `GRADKIENT_POLYLINE` 时不要当成 typo 去改。判断 ZeppOS API 名是否正确，以"真机/模拟器能否运行"为准，而非拼写直觉或文档文件名。相关：[[feedback_no_unsolicited_refactors]]

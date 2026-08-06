/**
 * hrv_calc.js — 心率换算间期统计层（纯 JS，移植自 Zepp OS 版）
 * 采集侧改由 service.health subscribeSample(HEART_RATE) 逐秒喂入 pushBpm(bpm)。
 * 注意：这里的间期由 60000 / BPM 换算，不是逐搏测得的 RR，也不应作为临床 HRV。
 */

export class HRVCalculator {
  constructor() {
    this.rrIntervals = [];     // BPM 换算间期；保留字段名以兼容既有存储结构
    this.bpmBuffer = [];       // 原始 BPM 序列，用于熵/频段/RSA 计算
    this.isCollecting = false;
    this.filterEnabled = true;
    this.FILTER_WINDOW_SIZE = 5;
    this.FILTER_THRESHOLD = 0.2;
    this.recentValidRR = [];
    this.rejectedDataPoints = 0;
  }

  bpmToRR(bpm) { return bpm > 0 ? 60000 / bpm : null; }

  // 每收到一条心率样本调用一次
  pushBpm(bpm) {
    if (!this.isCollecting) return;
    if (bpm <= 0 || bpm === 255) return;
    if (bpm < 35 || bpm > 200) return; // 输入范围过滤：剔除明显异常值

    this.bpmBuffer.push(bpm);

    const rr = this.bpmToRR(bpm);
    if (rr === null) return;

    if (!this.filterEnabled || this.recentValidRR.length < this.FILTER_WINDOW_SIZE) {
      this.acceptRR(rr);
    } else {
      const avg = this.recentValidRR.reduce((a, b) => a + b, 0) / this.recentValidRR.length;
      if (Math.abs(rr - avg) < avg * this.FILTER_THRESHOLD) {
        this.acceptRR(rr);
      } else {
        this.rejectedDataPoints++;
      }
    }
  }

  acceptRR(rr) {
    this.rrIntervals.push(rr);
    this.recentValidRR.push(rr);
    if (this.recentValidRR.length > this.FILTER_WINDOW_SIZE) this.recentValidRR.shift();
  }

  start() { if (!this.isCollecting) { this.reset(); this.isCollecting = true; } }
  stop() { this.isCollecting = false; }
  reset() { this.rrIntervals = []; this.bpmBuffer = []; this.recentValidRR = []; this.rejectedDataPoints = 0; }

  calculateMeanRR(rr) { return rr.length === 0 ? null : rr.reduce((a, b) => a + b, 0) / rr.length; }

  calculateSDNN(rr) {
    if (rr.length < 2) return null;
    const mean = this.calculateMeanRR(rr);
    const sumSq = rr.reduce((s, r) => s + Math.pow(r - mean, 2), 0);
    return Math.sqrt(sumSq / (rr.length - 1));
  }

  // 符号动力学熵 (Pattern Entropy)
  calculatePatternEntropy(bpmSeq) {
    if (bpmSeq.length < 10) return 0;
    const symbols = [];
    for (let i = 1; i < bpmSeq.length; i++) {
      const diff = bpmSeq[i] - bpmSeq[i - 1];
      if (diff > 0) symbols.push('U');
      else if (diff < 0) symbols.push('D');
      else symbols.push('F');
    }
    const patternCount = {};
    let totalPatterns = 0;
    for (let i = 0; i <= symbols.length - 3; i++) {
      const pat = symbols.slice(i, i + 3).join('');
      patternCount[pat] = (patternCount[pat] || 0) + 1;
      totalPatterns++;
    }
    let entropy = 0;
    for (const key in patternCount) {
      const p = patternCount[key] / totalPatterns;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  // 简易带通滤波求 RMS（代替 FFT），提取 LF 与 VLF
  calculateBandRMS(bpmSeq) {
    if (bpmSeq.length < 30) return { lfRms: 0, vlfRms: 0 };

    const vlfWindow = 25;
    const vlfBaseline = [];
    for (let i = 0; i < bpmSeq.length; i++) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, i - vlfWindow); j <= Math.min(bpmSeq.length - 1, i + vlfWindow); j++) {
        sum += bpmSeq[j]; count++;
      }
      vlfBaseline.push(sum / count);
    }

    const lfWindow = 7;
    const lfSignal = [];
    for (let i = 0; i < bpmSeq.length; i++) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, i - lfWindow); j <= Math.min(bpmSeq.length - 1, i + lfWindow); j++) {
        sum += bpmSeq[j]; count++;
      }
      lfSignal.push((sum / count) - vlfBaseline[i]);
    }

    const lfRms = Math.sqrt(lfSignal.reduce((s, v) => s + v * v, 0) / lfSignal.length);
    const globalMean = bpmSeq.reduce((a, b) => a + b, 0) / bpmSeq.length;
    const vlfRms = Math.sqrt(vlfBaseline.reduce((s, v) => s + Math.pow(v - globalMean, 2), 0) / vlfBaseline.length);

    return { lfRms, vlfRms };
  }

  getHrvMetrics() {
    if (this.rrIntervals.length < 10) return null;
    const rr = this.rrIntervals;
    const meanRR = this.calculateMeanRR(rr);
    const sdnn = this.calculateSDNN(rr);
    const meanHR = meanRR != null ? 60000 / meanRR : null;
    const patternEntropy = this.calculatePatternEntropy(this.bpmBuffer);
    const { lfRms, vlfRms } = this.calculateBandRMS(this.bpmBuffer);

    return {
      sdnn: sdnn != null ? +sdnn.toFixed(2) : null,
      mean_rr: meanRR != null ? +meanRR.toFixed(2) : null,
      mean_hr: meanHR != null ? +meanHR.toFixed(1) : null,
      patternEntropy: +patternEntropy.toFixed(3),
      lfRms: +lfRms.toFixed(2),
      vlfRms: +vlfRms.toFixed(2)
    };
  }
}

// 换算间期分段波动 + 心率稳定性
export function calcTcmMetrics(rr) {
  if (!rr || rr.length < 2) return null;
  const hrVals = rr.map(r => 60000 / r);
  const hrMean = hrVals.reduce((a, b) => a + b, 0) / hrVals.length;
  const hrStab = Math.sqrt(hrVals.reduce((s, v) => s + Math.pow(v - hrMean, 2), 0) / hrVals.length);
  const segs = []; let acc = 0, srr = [];
  for (let i = 0; i < rr.length; i++) {
    acc += rr[i]; srr.push(rr[i]);
    if (acc >= 60000 && srr.length >= 5) {
      const sm = srr.reduce((a, b) => a + b, 0) / srr.length;
      segs.push(+Math.sqrt(srr.reduce((s, r) => s + Math.pow(r - sm, 2), 0) / (srr.length - 1)).toFixed(2));
      srr = []; acc = 0;
    }
  }
  return { hrStability: +hrStab.toFixed(2), sdnnSegments: segs, rrCount: rr.length };
}

// 展示性呼吸尺度波动近似：从 BPM 序列提取 E/I ratio
export function calcRsaEiRatio(bpmSeq) {
  if (!bpmSeq || bpmSeq.length < 30) return 0;

  // 去趋势：减去 ±5 窗口移动均值，保留呼吸尺度的波动
  const detr = [];
  for (let i = 0; i < bpmSeq.length; i++) {
    let sum = 0, cnt = 0;
    for (let j = Math.max(0, i - 5); j <= Math.min(bpmSeq.length - 1, i + 5); j++) { sum += bpmSeq[j]; cnt++; }
    detr.push(bpmSeq[i] - sum / cnt);
  }

  const peaks = [], troughs = [];
  for (let i = 1; i < detr.length - 1; i++) {
    if (detr[i] > detr[i - 1] && detr[i] >= detr[i + 1]) peaks.push(bpmSeq[i]);
    else if (detr[i] < detr[i - 1] && detr[i] <= detr[i + 1]) troughs.push(bpmSeq[i]);
  }
  if (peaks.length < 2 || troughs.length < 2) return 0;

  const avgPeak = peaks.reduce((a, b) => a + b, 0) / peaks.length;
  const avgTrough = troughs.reduce((a, b) => a + b, 0) / troughs.length;
  if (avgTrough <= 0) return 0;
  return +(avgPeak / avgTrough).toFixed(3);
}

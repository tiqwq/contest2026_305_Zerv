/**
 * storage.js — JSON 文件存取层（串行队列版）
 *
 * 核心设计：同一文件的读/写/删除严格串行，杜绝并发 I/O 丢数据。
 * 内存缓存加速读取，写入后同步更新缓存，回调只在真实 I/O 完成后触发。
 */
import file from '@system.file'

const ROOT = 'internal://files/'
const cache = {}       // fileName → parsed data
const ready = {}       // fileName → boolean（缓存是否有效）
const queues = {}      // fileName → { running, jobs[] }

// ── 路径工具 ──────────────────────────────────────────────
function safe(name) {
  return String(name || '').replace(/\\/g, '/').replace(/^\/+/, '')
}

function uri(name) {
  return ROOT + safe(name)
}

function invoke(cb, err, val) {
  if (cb) cb(err, val)
}

// ── 串行队列 ──────────────────────────────────────────────
// 每个文件一个独立队列，保证同一文件的 I/O 操作不重叠
function getQueue(name) {
  if (!queues[name]) queues[name] = { running: false, jobs: [] }
  return queues[name]
}

function enqueue(name, label, op) {
  const q = getQueue(name)
  q.jobs.push({ label, op })
  drain(name)
}

function drain(name) {
  const q = getQueue(name)
  if (q.running || !q.jobs.length) return

  q.running = true
  const job = q.jobs.shift()

  let done = false
  const finish = () => {
    if (done) return
    done = true
    q.running = false
    drain(name)  // 递归处理下一个 job
  }

  try {
    job.operation(finish)
  } catch (e) {
    console.log(`[storage] ${job.label} exception: ${e}`)
    finish()
  }
}

// ── 读操作（带缓存） ─────────────────────────────────────
function readOp(name, callback) {
  enqueue(name, 'read', (done) => {
    // 缓存命中直接返回
    if (ready[name]) {
      invoke(callback, null, cache[name])
      done()
      return
    }

    file.readText({
      uri: uri(name),
      encoding: 'UTF-8',
      success: (result) => {
        try {
          cache[name] = JSON.parse(result.text)
          ready[name] = true
          invoke(callback, null, cache[name])
        } catch (e) {
          invoke(callback, { code: 'JSON_PARSE', message: String(e) }, null)
        }
        done()
      },
      fail: (_data, code) => {
        // 文件不存在视为 null，不算错误
        if (code === 301) {
          cache[name] = null
          ready[name] = true
          invoke(callback, null, null)
        } else {
          invoke(callback, { code, message: String(_data || 'read failed') }, null)
        }
        done()
      }
    })
  })
}

// ── 公开 API ──────────────────────────────────────────────
export const Storage = {
  /**
   * 写入 JSON 文件；data 为 null 时删除文件。
   * 回调 (error, value)：成功 error=null, value=true；失败 error={code,message}
   */
  set(fileName, data, callback) {
    const name = safe(fileName)
    if (!name) return invoke(callback, { code: 202, message: 'empty file name' }, false)

    if (data === null) return this.remove(name, callback)

    let text
    try {
      text = JSON.stringify(data)
    } catch (e) {
      return invoke(callback, { code: 'JSON_STRINGIFY', message: String(e) }, false)
    }

    enqueue(name, 'write', (done) => {
      file.writeText({
        uri: uri(name),
        text,
        encoding: 'UTF-8',
        append: false,
        success: () => {
          cache[name] = data
          ready[name] = true
          invoke(callback, null, true)
          done()
        },
        fail: (_data, code) => {
          invoke(callback, { code, message: String(_data || 'write failed') }, false)
          done()
        }
      })
    })
  },

  /**
   * 读取 JSON 文件。内存命中直接返回，未命中读文件并回填缓存。
   * 回调 (error, data)：文件不存在时 (null, null)，不算错误。
   */
  get(fileName, callback) {
    const name = safe(fileName)
    if (!name) return invoke(callback, { code: 202, message: 'empty file name' }, null)
    readOp(name, callback)
  },

  /**
   * 合并更新 JSON 对象文件的若干字段。
   */
  patch(fileName, patchData, callback) {
    const name = safe(fileName)
    this.get(name, (err, current) => {
      if (err) return invoke(callback, err, false)
      this.set(name, Object.assign({}, current || {}, patchData || {}), callback)
    })
  },

  /**
   * 读取 JSON 对象文件中的单个字段。
   */
  getField(fileName, field, callback) {
    this.get(fileName, (err, data) => {
      if (err) return invoke(callback, err, null)
      invoke(callback, null, data && typeof data === 'object' ? data[field] : null)
    })
  },

  /**
   * 删除文件（内存与磁盘同步清除）。
   */
  remove(fileName, callback) {
    const name = safe(fileName)
    if (!name) return invoke(callback, { code: 202, message: 'empty file name' }, false)

    enqueue(name, 'delete', (done) => {
      file.delete({
        uri: uri(name),
        success: () => {
          delete cache[name]
          delete ready[name]
          invoke(callback, null, true)
          done()
        },
        fail: () => {
          // 删除不存在的文件视为成功（目标状态已达成）
          delete cache[name]
          delete ready[name]
          invoke(callback, null, true)
          done()
        }
      })
    })
  },

  /**
   * 清除内存缓存（单文件或全量），下次读取会重新从磁盘加载。
   */
  clearCache(fileName) {
    if (fileName) {
      const name = safe(fileName)
      delete cache[name]
      delete ready[name]
    } else {
      Object.keys(cache).forEach((k) => { delete cache[k]; delete ready[k] })
    }
  }
}

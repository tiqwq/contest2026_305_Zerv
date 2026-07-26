/**
 * storage.js — JSON 文件存取封装（openvela @system.file 版）
 * 接口与 Zepp OS 版保持一致：set/get/patch/getField/remove（回调式）。
 *
 * 内存写穿缓存：写入先落内存并立即回调（文件异步持久化），
 * 读取内存命中直接返回——既加速又消除"写后立读"的时序竞态。
 */
import file from '@system.file';

function uriOf(name) {
  return 'internal://files/' + name;
}

// 内存缓存：fileName → 数据对象（进程生命周期内有效）
const memCache = {};

export const Storage = {
  /**
   * 写入 JSON 文件；data 为 null 时删除文件。
   * 内存立即生效并回调，文件写入异步进行。
   */
  set(fileName, data, callback) {
    if (data === null) {
      delete memCache[fileName];
      file.delete({ uri: uriOf(fileName), fail: () => {} });
      if (callback) callback(null, true);
      return;
    }
    memCache[fileName] = data;
    if (callback) callback(null, true);
    file.writeText({
      uri: uriOf(fileName),
      text: JSON.stringify(data),
      fail: (d, code) => {
        console.log(`[storage] write ${fileName} fail: ${code}`);
      }
    });
  },

  /**
   * 读取 JSON 文件；内存命中直接返回，未命中读文件并回填缓存。
   * 不存在/解析失败回调 (null, null)。
   */
  get(fileName, callback) {
    if (fileName in memCache) {
      callback(null, memCache[fileName]);
      return;
    }
    file.readText({
      uri: uriOf(fileName),
      success: (data) => {
        try {
          const parsed = JSON.parse(data.text);
          memCache[fileName] = parsed;
          callback(null, parsed);
        } catch (e) {
          callback(null, null);
        }
      },
      fail: () => { callback(null, null); }
    });
  },

  /**
   * 合并更新 JSON 对象文件的若干字段。
   */
  patch(fileName, patchData, callback) {
    this.get(fileName, (err, currentData) => {
      const newData = Object.assign({}, currentData || {}, patchData);
      this.set(fileName, newData, callback);
    });
  },

  /**
   * 读取 JSON 对象文件中的单个字段。
   */
  getField(fileName, field, callback) {
    this.get(fileName, (err, data) => {
      if (data && typeof data === 'object') {
        callback(null, data[field]);
      } else {
        callback(null, null);
      }
    });
  },

  /**
   * 删除文件（内存与磁盘同步清除，忽略失败）。
   */
  remove(fileName) {
    delete memCache[fileName];
    file.delete({ uri: uriOf(fileName), fail: () => {} });
  }
};

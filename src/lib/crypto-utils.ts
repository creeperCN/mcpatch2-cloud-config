import crypto from 'crypto'

// ============================================================
// Layer 1: RSA-2048 签名验证 — 防止配置内容被中间人篡改
// ============================================================

/**
 * 生成 RSA-2048 密钥对
 * 公钥用于客户端验签，私钥用于服务端签名
 */
export function generateRSAKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return { publicKey, privateKey }
}

/**
 * 使用 RSA 私钥对数据进行 SHA256 签名
 * 返回 Base64 编码的签名
 */
export function signData(data: string, privateKeyPem: string): string {
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(data, 'utf8')
  sign.end()
  return sign.sign(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    'base64'
  )
}

/**
 * 使用 RSA 公钥验证签名
 */
export function verifySignature(
  data: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    const verify = crypto.createVerify('RSA-SHA256')
    verify.update(data, 'utf8')
    verify.end()
    return verify.verify(
      { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
      signatureBase64,
      'base64'
    )
  } catch {
    return false
  }
}

/**
 * 计算 RSA 公钥的 SHA-256 指纹，格式: AA:BB:CC:...
 */
export function getPublicKeyFingerprint(publicKeyPem: string): string {
  const hash = crypto.createHash('sha256').update(publicKeyPem).digest('hex')
  return hash.toUpperCase().match(/.{2}/g)?.join(':') || hash.toUpperCase()
}

/**
 * 计算 AES 密钥的 SHA-256 指纹，格式: AA:BB:CC:...
 * 用于客户端验证密钥一致性
 */
export function getAesKeyFingerprint(keyHex: string): string {
  const hash = crypto.createHash('sha256').update(keyHex, 'hex').digest('hex')
  return hash.toUpperCase().match(/.{2}/g)?.join(':') || hash.toUpperCase()
}

// ============================================================
// Layer 2: HMAC-SHA256 请求签名 — 防止 API 被第三方直接调用
// ============================================================

/**
 * 生成 HMAC 密钥 (64 hex chars = 32 bytes)
 */
export function generateHMACSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 创建 HMAC-SHA256 签名
 * 签名内容 = timestamp + apiKey + requestPath
 */
export function createHMACSignature(
  secret: string,
  timestamp: string,
  apiKey: string,
  requestPath: string
): string {
  const payload = `${timestamp}${apiKey}${requestPath}`
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload, 'utf8')
  return hmac.digest('hex')
}

/**
 * 验证 HMAC 签名 (使用 timingSafeEqual 防时序攻击)
 */
export function verifyHMACSignature(
  secret: string,
  timestamp: string,
  apiKey: string,
  requestPath: string,
  providedSignature: string
): boolean {
  try {
    const expected = createHMACSignature(secret, timestamp, apiKey, requestPath)
    // 将两者填充到相同长度后再比较，消除长度差异的时序泄漏
    const maxLen = Math.max(expected.length, providedSignature.length)
    const a = Buffer.alloc(maxLen, 0)
    const b = Buffer.alloc(maxLen, 0)
    Buffer.from(expected, 'utf8').copy(a)
    Buffer.from(providedSignature, 'utf8').copy(b)
    return crypto.timingSafeEqual(a, b) && expected.length === providedSignature.length
  } catch {
    return false
  }
}

// ============================================================
// Layer 3: 密钥碎片化存储 — 拆分为多个片段，运行时拼接
// ============================================================

/**
 * 将 hex 字符串拆分为 3 个 XOR 碎片
 * 原理: original = frag1 XOR frag2 XOR frag3
 * 随机生成 frag1 和 frag2，然后 frag3 = original XOR frag1 XOR frag2
 */
export function splitKeyTo3Fragments(hexKey: string): {
  frag1: string
  frag2: string
  frag3: string
} {
  if (!hexKey || hexKey.length === 0) {
    throw new Error('密钥不能为空')
  }
  const buf = Buffer.from(hexKey, 'hex')
  const mask1 = crypto.randomBytes(buf.length)
  const mask2 = crypto.randomBytes(buf.length)
  const frag3 = Buffer.alloc(buf.length)

  for (let i = 0; i < buf.length; i++) {
    frag3[i] = buf[i] ^ mask1[i] ^ mask2[i]
  }

  return {
    frag1: mask1.toString('hex'),
    frag2: mask2.toString('hex'),
    frag3: frag3.toString('hex'),
  }
}

/**
 * 从 3 个 XOR 碎片还原原始 hex 密钥
 */
export function assembleKeyFrom3Fragments(
  frag1Hex: string,
  frag2Hex: string,
  frag3Hex: string
): string {
  const f1 = Buffer.from(frag1Hex, 'hex')
  const f2 = Buffer.from(frag2Hex, 'hex')
  const f3 = Buffer.from(frag3Hex, 'hex')

  if (f1.length !== f2.length || f2.length !== f3.length) {
    throw new Error('碎片长度不一致，无法还原密钥')
  }

  const result = Buffer.alloc(f1.length)
  for (let i = 0; i < f1.length; i++) {
    result[i] = f1[i] ^ f2[i] ^ f3[i]
  }
  return result.toString('hex')
}

// ============================================================
// Layer 4: AES-128 缓存加密 — 防止用户直接修改本地缓存文件
// ============================================================

/**
 * 生成 AES-128 密钥 (32 hex chars = 16 bytes = 128 bits)
 */
export function generateAESKey(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * AES-128-CBC 加密
 * 返回 { encrypted: base64, iv: hex }
 */
export function encryptConfig(
  data: string,
  keyHex: string
): { encrypted: string; iv: string } {
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== 16) {
    throw new Error('AES-128 密钥必须为 16 字节')
  }

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv)

  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  return { encrypted, iv: iv.toString('hex') }
}

/**
 * AES-128-CBC 解密
 */
export function decryptConfig(
  encrypted: string,
  keyHex: string,
  ivHex: string
): string {
  const key = Buffer.from(keyHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')

  if (key.length !== 16) {
    throw new Error('AES-128 密钥必须为 16 字节')
  }
  if (iv.length !== 16) {
    throw new Error('IV 必须为 16 字节')
  }

  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)

  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// ============================================================
// Layer 5: 时间戳防重放 — 5分钟时间窗口 + 去重缓存
// ============================================================

interface SignatureCacheEntry {
  expiresAt: number
}

// 内存签名去重缓存
const signatureCache = new Map<string, SignatureCacheEntry>()
const CACHE_TTL_MS = 6 * 60 * 1000 // 6 分钟 (比 5 分钟窗口稍长)

// 定期清理过期缓存条目
let cleanupScheduled = false
function scheduleCleanup() {
  if (cleanupScheduled) return
  cleanupScheduled = true
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of signatureCache.entries()) {
      if (entry.expiresAt < now) {
        signatureCache.delete(key)
      }
    }
  }, 60 * 1000) // 每分钟清理一次
}
scheduleCleanup()

/**
 * 验证时间戳是否在有效窗口内
 * 允许过去 5 分钟，未来 1 分钟（容忍时钟偏差）
 */
export function validateTimestamp(timestampStr: string): {
  valid: boolean
  error?: string
} {
  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) {
    return { valid: false, error: '时间戳格式无效' }
  }

  const nowMs = Date.now()
  // 客户端时间戳可能是秒级或毫秒级，自动判断
  const tsMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const diff = nowMs - tsMs

  if (diff > 5 * 60 * 1000) {
    return { valid: false, error: '时间戳已过期（超过5分钟）' }
  }
  if (diff < -1 * 60 * 1000) {
    return { valid: false, error: '时间戳超前过多（超过1分钟）' }
  }

  return { valid: true }
}

/**
 * 检查签名是否已被使用过（防重放）
 * 返回 true 表示是重复请求
 */
export function isSignatureReplay(signature: string): boolean {
  if (signatureCache.has(signature)) {
    return true // 重复签名
  }

  signatureCache.set(signature, {
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
  return false
}

/**
 * 清空签名缓存（密钥轮换时调用，防止旧签名污染）
 */
export function clearSignatureCache(): void {
  signatureCache.clear()
}

// ============================================================
// Layer 6: HTTPS 证书锁定支持
// ============================================================

/**
 * 生成证书指纹（SHA-256）
 * 格式: AA:BB:CC:DD:...
 */
export function generateCertFingerprint(): string {
  const seed = `mcpatch-cert-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`
  const hash = crypto.createHash('sha256').update(seed).digest('hex')
  return hash.toUpperCase().match(/.{2}/g)?.join(':') || hash.toUpperCase()
}

/**
 * 将指纹转换为 Java 可用的格式（小写无分隔符）
 */
export function formatFingerprintForJava(fp: string): string {
  return fp.replace(/:/g, '').toLowerCase()
}

/**
 * 规范化指纹格式为大写冒号分隔
 */
export function normalizeFingerprint(fp: string): string {
  const rawHex = fp.trim().replace(/:/g, '').toUpperCase()
  const isValid = /^[0-9A-F]+$/.test(rawHex)
  if (!isValid) {
    throw new Error('指纹格式无效，必须为十六进制字符串')
  }
  // SHA-256 指纹必须为 64 个十六进制字符（256 bits）
  if (rawHex.length !== 64) {
    throw new Error(`SHA-256 指纹长度应为 64 个十六进制字符，当前为 ${rawHex.length} 个`)
  }
  return rawHex.match(/.{2}/g)?.join(':') || rawHex
}
